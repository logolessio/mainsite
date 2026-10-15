import { type D1Database, db, nowSec, uid } from './db'
import { HttpError } from './http'
import { logEvent } from './log'
import { costFor, feeFor, startNeeded } from './ledger-math'
import { SITE } from './site'

/**
 * The money ledger. Rules that keep it safe:
 *  - Amounts are integer cents. Balances are always a SUM over the ledger, never a stored number.
 *  - Anything that spends money is a single conditional INSERT ("only if the balance covers it"),
 *    so two requests at once cannot both succeed.
 *  - Writes tied to a PayPal id use a unique (kind, ref) index, so a repeated webhook changes nothing.
 *  - The platform fee is charged to the brand ON TOP of what a clipper is paid. A clipper always receives the full amount their
 *    views earned; the campaign's pool pays that amount plus the fee. So $1,000 of payouts costs the brand $1,150 at 15%.
 */

export type Balances = {
  brand: number // money a brand has added and not spent (legacy balance top-ups)
  available: number // clipper earnings that can be withdrawn now
  pending: number // clipper earnings still inside the hold window
  earned: number // lifetime clipper earnings
  withdrawn: number // lifetime withdrawals (net of reversals)
}

export async function balances(userId: string, at = nowSec()): Promise<Balances> {
  const d = await db()
  const r = await d
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN account='brand' THEN amount_cents END), 0) AS brand,
         COALESCE(SUM(CASE WHEN account='clipper' AND available_at <= ?2 THEN amount_cents END), 0) AS available,
         COALESCE(SUM(CASE WHEN account='clipper' AND available_at > ?2 THEN amount_cents END), 0) AS pending,
         COALESCE(SUM(CASE WHEN account='clipper' AND kind='earning' THEN amount_cents END), 0) AS earned,
         COALESCE(-SUM(CASE WHEN account='clipper' AND kind IN ('withdrawal','withdrawal_reversal') THEN amount_cents END), 0) AS withdrawn
       FROM ledger WHERE user_id = ?1`,
    )
    .bind(userId, at)
    .first<Balances>()
  return r ?? { brand: 0, available: 0, pending: 0, earned: 0, withdrawn: 0 }
}

export { costFor, feeFor, startNeeded }

/** Adds money a brand paid through PayPal to their balance. `ref` is the PayPal order id, so a repeat changes nothing. */
export async function creditTopup(d: D1Database, userId: string, ref: string, amountCents: number) {
  const t = nowSec()
  const res = await d
    .prepare(
      `INSERT OR IGNORE INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at)
       VALUES (?1, ?2, 'brand', 'topup', ?3, ?4, ?5, 'Added with PayPal', ?4)`,
    )
    .bind(uid(), userId, amountCents, t, ref)
    .run()
  return res.meta.changes === 1
}

/**
 * Moves money from a brand's balance into a campaign's pool: the payout budget plus the platform fee on top. One batch checks the
 * balance, takes the money, fills the pool and updates the campaign, so a double click or two tabs cannot spend it twice.
 * `launch` marks a campaign that was waiting for payment as paid; `topup` grows the budget of one that already exists.
 * Returns what it cost, or null if the balance does not cover it.
 */
export async function fundFromBalance(brandUserId: string, campaignId: string, payoutBudgetCents: number, mode: 'launch' | 'topup') {
  if (!Number.isInteger(payoutBudgetCents) || payoutBudgetCents <= 0) throw new HttpError(400, 'Enter a valid amount.')
  const d = await db()
  const t = nowSec()
  const cost = costFor(payoutBudgetCents)
  const spendId = uid()
  const poolId = uid()
  const results = await d.batch([
    // 1) the brand pays, only if their balance covers it
    d
      .prepare(
        `INSERT INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at, campaign_id)
         SELECT ?1, ?2, 'brand', 'campaign_spend', -?3, ?4, ?1, 'Put into a campaign', ?4, ?5
         WHERE (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger WHERE user_id = ?2 AND account = 'brand') >= ?3`,
      )
      .bind(spendId, brandUserId, cost, t, campaignId),
    // 2) the pool is filled, only if (1) happened
    d
      .prepare(
        `INSERT INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at, campaign_id)
         SELECT ?1, ?2, 'campaign', 'campaign_fund', ?3, ?4, ?5, 'Campaign budget', ?4, ?6
         WHERE EXISTS (SELECT 1 FROM ledger WHERE id = ?5)`,
      )
      .bind(poolId, brandUserId, cost, t, spendId, campaignId),
    // 3) the campaign moves on, only if (1) happened
    mode === 'launch'
      ? d
          .prepare(
            `UPDATE campaigns SET status = 'paid', paid_at = ?2, updated_at = ?2
             WHERE id = ?1 AND brand_user_id = ?3 AND status IN ('awaiting_payment','requested') AND EXISTS (SELECT 1 FROM ledger WHERE id = ?4)`,
          )
          .bind(campaignId, t, brandUserId, spendId)
      : d
          .prepare(
            `UPDATE campaigns SET budget_cents = budget_cents + ?2, updated_at = ?3
             WHERE id = ?1 AND brand_user_id = ?4 AND EXISTS (SELECT 1 FROM ledger WHERE id = ?5)`,
          )
          .bind(campaignId, payoutBudgetCents, t, brandUserId, spendId),
  ])
  if (results[0].meta.changes !== 1) return null
  logEvent({ kind: 'money', name: 'campaign funded', detail: `${campaignId}: $${(payoutBudgetCents / 100).toFixed(2)} for clippers + $${((cost - payoutBudgetCents) / 100).toFixed(2)} fee` })
  return { cost, fee: cost - payoutBudgetCents }
}

export async function campaignPool(campaignId: string) {
  const d = await db()
  const r = await d
    .prepare("SELECT COALESCE(SUM(amount_cents), 0) AS pool FROM ledger WHERE account = 'campaign' AND campaign_id = ?1")
    .bind(campaignId)
    .first<{ pool: number }>()
  return r?.pool ?? 0
}

/** Payout dollars (in cents) a campaign has paid its clippers so far, and what is left under its budget cap. */
export async function campaignSpent(campaignId: string) {
  const d = await db()
  const r = await d.prepare('SELECT COALESCE(SUM(net_cents), 0) AS net, COALESCE(SUM(gross_cents), 0) AS gross FROM earnings WHERE campaign_id = ?1').bind(campaignId).first<{ net: number; gross: number }>()
  return { net: r?.net ?? 0, gross: r?.gross ?? 0 }
}

export async function budgetLeft(campaignId: string, capCents: number) {
  return Math.max(0, capCents - (await campaignSpent(campaignId)).net)
}

/** Why a payment could not be made. The caller shows `message`; `paused` means the campaign stopped itself. */
export class PayError extends HttpError {
  constructor(
    public reason: 'cap' | 'balance',
    message: string,
  ) {
    super(reason === 'cap' ? 409 : 402, message)
  }
}

/**
 * Pays a clipper for verified views. A brand has one balance and every campaign draws from it as clippers earn, up to the
 * campaign's budget cap. (Older campaigns that were funded into their own pool use the pool first, then the balance.)
 * The clipper gets the full `payoutCents`; the platform fee is charged to the brand on top, so the brand pays the payout plus the fee.
 * People with extra checks switched on (for example a VPN at sign-up) wait twice as long for the money to clear.
 * If the brand's balance cannot cover it, the campaign pauses itself and the brand is told to add funds.
 */
export async function creditEarning(input: {
  campaignId: string
  clipperId: string
  payoutCents: number
  submissionId?: string
  note?: string
}) {
  const { campaignId, clipperId, payoutCents } = input
  if (campaignId.startsWith('mock-')) throw new HttpError(400, 'A mock campaign never pays anyone.')
  if (!Number.isInteger(payoutCents) || payoutCents <= 0) throw new HttpError(400, 'Enter a valid amount.')
  const d = await db()
  const camp = await d.prepare('SELECT brand_user_id, title, budget_cents, status FROM campaigns WHERE id = ?1').bind(campaignId).first<{ brand_user_id: string | null; title: string; budget_cents: number; status: string }>()
  if (!camp?.brand_user_id) throw new HttpError(400, 'That campaign has no brand to bill.')
  const clipper = await d.prepare('SELECT risk_level, status FROM users WHERE id = ?1').bind(clipperId).first<{ risk_level: string; status: string }>()
  if (!clipper || clipper.status !== 'active') throw new HttpError(400, 'That account cannot be paid right now.')

  const fee = feeFor(payoutCents)
  const draw = payoutCents + fee // what the brand pays
  const t = nowSec()
  const release = t + SITE.holdDays * (clipper.risk_level === 'low' ? 1 : 2) * 86400
  const spent = (await campaignSpent(campaignId)).net
  if (spent + payoutCents > camp.budget_cents) throw new PayError('cap', 'This campaign has reached its budget cap, so nothing was paid. The brand can raise the cap.')

  // Where the money comes from: the campaign's own pool if it still has enough (older campaigns), otherwise the brand's balance.
  const pool = await campaignPool(campaignId)
  const fromPool = pool >= draw
  const spendId = uid()
  const earningId = uid()
  const results = await d.batch([
    fromPool
      ? d
          .prepare(
            `INSERT INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at, campaign_id)
             SELECT ?1, ?2, 'campaign', 'spend', -?3, ?4, ?1, ?5, ?4, ?6
             WHERE (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger WHERE account = 'campaign' AND campaign_id = ?6) >= ?3`,
          )
          .bind(spendId, camp.brand_user_id, draw, t, camp.title, campaignId)
      : d
          .prepare(
            `INSERT INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at, campaign_id)
             SELECT ?1, ?2, 'brand', 'earning_spend', -?3, ?4, ?1, ?5, ?4, ?6
             WHERE (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger WHERE user_id = ?2 AND account = 'brand') >= ?3`,
          )
          .bind(spendId, camp.brand_user_id, draw, t, camp.title, campaignId),
    // the clipper is credited the full payout, only if the brand paid
    d
      .prepare(
        `INSERT INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at, campaign_id)
         SELECT ?1, ?2, 'clipper', 'earning', ?3, ?4, ?5, ?6, ?7, ?8
         WHERE EXISTS (SELECT 1 FROM ledger WHERE id = ?5)`,
      )
      .bind(earningId, clipperId, payoutCents, release, spendId, camp.title, t, campaignId),
    // audit row (gross is what the brand paid, net is what the clipper got), only if the brand paid
    d
      .prepare(
        `INSERT INTO earnings (id, brand_user_id, clipper_user_id, campaign, gross_cents, fee_cents, net_cents, note, created_at, campaign_id, submission_id)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?11, ?12
         WHERE EXISTS (SELECT 1 FROM ledger WHERE id = ?10)`,
      )
      .bind(earningId, camp.brand_user_id, clipperId, camp.title, draw, fee, payoutCents, input.note ?? null, t, spendId, campaignId, input.submissionId ?? null),
  ])
  if (results[0].meta.changes !== 1) {
    // the money was not there. Stop the campaign so it cannot keep taking clips it cannot pay for, and tell the brand.
    if (camp.status === 'live') {
      await d.prepare("UPDATE campaigns SET status = 'paused', updated_at = ?2 WHERE id = ?1 AND status = 'live'").bind(campaignId, t).run()
      await d.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?1, 'balance', ?2) ON CONFLICT(key) DO UPDATE SET value = 'balance', updated_at = excluded.updated_at").bind(`paused-by:${campaignId}`, t).run()
      const { notify } = await import('./notify')
      await notify(camp.brand_user_id, { kind: 'campaign', title: `${camp.title} paused: add funds`, body: 'Your balance ran out, so the campaign paused itself. Add funds and start it again. Clips already approved are paid once there is money.', href: '/brand/balance', dedupe: `camp-lowbal:${campaignId}:${Math.floor(t / 3600)}` })
      const { campaignChanged } = await import('./discord/campaigns')
      await campaignChanged(campaignId)
    }
    throw new PayError('balance', 'The brand’s balance is too low, so nothing was paid. The campaign was paused and the brand was told.')
  }
  logEvent({ kind: 'money', name: 'earning credited', detail: `${campaignId} → ${clipperId}: clipper $${(payoutCents / 100).toFixed(2)}, fee on top $${(fee / 100).toFixed(2)}, brand paid $${(draw / 100).toFixed(2)} from ${fromPool ? 'the campaign pool' : 'the balance'}` })
  return { gross: draw, fee, net: payoutCents, releasesAt: release }
}

/** Moves whatever is left in an older campaign's own pool back into the brand's balance, where any campaign can use it. */
export async function releasePool(brandUserId: string, campaignId: string) {
  const d = await db()
  const left = await campaignPool(campaignId)
  if (left <= 0) return 0
  const t = nowSec()
  const id = uid()
  const res = await d.batch([
    d
      .prepare(
        `INSERT INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at, campaign_id)
         SELECT ?1, ?2, 'campaign', 'pool_release', -?3, ?4, ?1, 'Returned to balance', ?4, ?5
         WHERE (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger WHERE account = 'campaign' AND campaign_id = ?5) >= ?3`,
      )
      .bind(id, brandUserId, left, t, campaignId),
    d
      .prepare(
        `INSERT INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at, campaign_id)
         SELECT ?1, ?2, 'brand', 'pool_release', ?3, ?4, ?5, 'Returned from a campaign', ?4, ?6
         WHERE EXISTS (SELECT 1 FROM ledger WHERE id = ?5)`,
      )
      .bind(uid(), brandUserId, left, t, id, campaignId),
  ])
  return res[0].meta.changes === 1 ? left : 0
}

/**
 * Reserves a withdrawal. One statement checks the available balance and deducts it, so a double click or two
 * tabs cannot withdraw the same money twice. Returns the payout id, or null if the balance does not cover it.
 */
export async function startWithdrawal(userId: string, amountCents: number) {
  const d = await db()
  const t = nowSec()
  const payoutId = uid()
  const results = await d.batch([
    d
      .prepare(
        `INSERT INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at)
         SELECT ?1, ?2, 'clipper', 'withdrawal', -?3, ?4, ?1, 'Withdrawal', ?4
         WHERE (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger
                WHERE user_id = ?2 AND account = 'clipper' AND available_at <= ?4) >= ?3`,
      )
      .bind(payoutId, userId, amountCents, t),
    d
      .prepare(
        `INSERT INTO payouts (id, user_id, amount_cents, status, created_at, updated_at)
         SELECT ?1, ?2, ?3, 'pending', ?4, ?4
         WHERE EXISTS (SELECT 1 FROM ledger WHERE id = ?1)`,
      )
      .bind(payoutId, userId, amountCents, t),
  ])
  return results[0].meta.changes === 1 ? payoutId : null
}

/** `transferId` is PayPal's payout batch id. It is kept in the column that used to hold the old processor's transfer id. */
export async function markPayoutSent(payoutId: string, transferId: string) {
  const d = await db()
  await d.prepare("UPDATE payouts SET status='sent', stripe_transfer_id=?2, updated_at=?3 WHERE id=?1").bind(payoutId, transferId, nowSec()).run()
}

/** Puts the money back on the clipper's balance after a failed or reversed transfer. Safe to call twice. */
export async function reverseWithdrawal(payoutId: string, status: 'failed' | 'reversed', reason: string) {
  const d = await db()
  const p = await d.prepare('SELECT user_id, amount_cents, status FROM payouts WHERE id = ?1').bind(payoutId).first<{ user_id: string; amount_cents: number; status: string }>()
  if (!p || p.status === 'failed' || p.status === 'reversed') return false
  const t = nowSec()
  await d.batch([
    d
      .prepare(
        `INSERT OR IGNORE INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at)
         VALUES (?1, ?2, 'clipper', 'withdrawal_reversal', ?3, ?4, ?5, ?6, ?4)`,
      )
      .bind(uid(), p.user_id, p.amount_cents, t, payoutId, reason.slice(0, 200)),
    d.prepare('UPDATE payouts SET status=?2, failure=?3, updated_at=?4 WHERE id=?1').bind(payoutId, status, reason.slice(0, 200), t),
  ])
  return true
}

/** Takes refunded money back off a brand balance, or off a campaign's pool. `ref` makes each refund amount apply once. */
export async function debitRefund(d: D1Database, userId: string, amountCents: number, ref: string, campaignId?: string | null) {
  const t = nowSec()
  await d
    .prepare(
      `INSERT OR IGNORE INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at, campaign_id)
       VALUES (?1, ?2, ?3, 'refund', -?4, ?5, ?6, 'Refund', ?5, ?7)`,
    )
    .bind(uid(), userId, campaignId ? 'campaign' : 'brand', amountCents, t, ref, campaignId ?? null)
    .run()
}
