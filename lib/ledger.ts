import { type D1Database, db, nowSec, uid } from './db'
import { HttpError } from './http'
import { logEvent } from './log'
import { SITE } from './site'

/**
 * The money ledger. Rules that keep it safe:
 *  - Amounts are integer cents. Balances are always a SUM over the ledger, never a stored number.
 *  - Anything that spends money is a single conditional INSERT ("only if the balance covers it"),
 *    so two requests at once cannot both succeed.
 *  - Writes tied to a Stripe id use a unique (kind, ref) index, so a repeated webhook changes nothing.
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

export const feeFor = (grossCents: number) => Math.round((grossCents * SITE.platformFeePct) / 100)

/** Adds a brand's paid Checkout amount. Safe to call twice for the same session. */
export async function creditTopup(d: D1Database, userId: string, sessionId: string, amountCents: number) {
  const t = nowSec()
  const res = await d
    .prepare(
      `INSERT OR IGNORE INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at)
       VALUES (?1, ?2, 'brand', 'topup', ?3, ?4, ?5, 'Balance top-up', ?4)`,
    )
    .bind(uid(), userId, amountCents, t, sessionId)
    .run()
  return res.meta.changes === 1
}

/** Puts a paid campaign budget into that campaign's pool. Safe to call twice for the same Stripe session. */
export async function fundCampaign(d: D1Database, brandUserId: string, campaignId: string, sessionId: string, amountCents: number) {
  const t = nowSec()
  const res = await d
    .prepare(
      `INSERT OR IGNORE INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at, campaign_id)
       VALUES (?1, ?2, 'campaign', 'campaign_fund', ?3, ?4, ?5, 'Campaign budget', ?4, ?6)`,
    )
    .bind(uid(), brandUserId, amountCents, t, sessionId, campaignId)
    .run()
  if (res.meta.changes === 1) logEvent({ kind: 'money', name: 'campaign funded', detail: `${campaignId} +$${(amountCents / 100).toFixed(2)} (session ${sessionId})` })
  return res.meta.changes === 1
}

export async function campaignPool(campaignId: string) {
  const d = await db()
  const r = await d
    .prepare("SELECT COALESCE(SUM(amount_cents), 0) AS pool FROM ledger WHERE account = 'campaign' AND campaign_id = ?1")
    .bind(campaignId)
    .first<{ pool: number }>()
  return r?.pool ?? 0
}

/**
 * Pays a clipper for verified views out of a campaign's pool. The platform fee is taken out of the clipper's share,
 * so the brand never pays more than the gross amount. Returns null if the pool cannot cover it.
 * People with extra checks switched on (for example a VPN at sign-up) wait twice as long for the money to clear.
 */
export async function creditEarning(input: {
  campaignId: string
  clipperId: string
  grossCents: number
  submissionId?: string
  note?: string
}) {
  const { campaignId, clipperId, grossCents } = input
  if (!Number.isInteger(grossCents) || grossCents <= 0) throw new HttpError(400, 'Enter a valid amount.')
  const d = await db()
  const camp = await d.prepare('SELECT brand_user_id, title FROM campaigns WHERE id = ?1').bind(campaignId).first<{ brand_user_id: string | null; title: string }>()
  if (!camp?.brand_user_id) throw new HttpError(400, 'That campaign has no funded budget.')
  const clipper = await d.prepare('SELECT risk_level, status FROM users WHERE id = ?1').bind(clipperId).first<{ risk_level: string; status: string }>()
  if (!clipper || clipper.status !== 'active') throw new HttpError(400, 'That account cannot be paid right now.')

  const fee = feeFor(grossCents)
  const net = grossCents - fee
  const t = nowSec()
  const spendId = uid()
  const earningId = uid()
  const release = t + SITE.holdDays * (clipper.risk_level === 'low' ? 1 : 2) * 86400

  const results = await d.batch([
    // 1) the campaign pays, only if its pool covers it
    d
      .prepare(
        `INSERT INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at, campaign_id)
         SELECT ?1, ?2, 'campaign', 'spend', -?3, ?4, ?1, ?5, ?4, ?6
         WHERE (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger WHERE account = 'campaign' AND campaign_id = ?6) >= ?3`,
      )
      .bind(spendId, camp.brand_user_id, grossCents, t, camp.title, campaignId),
    // 2) the clipper is credited, only if (1) happened
    d
      .prepare(
        `INSERT INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at, campaign_id)
         SELECT ?1, ?2, 'clipper', 'earning', ?3, ?4, ?5, ?6, ?7, ?8
         WHERE EXISTS (SELECT 1 FROM ledger WHERE id = ?5)`,
      )
      .bind(earningId, clipperId, net, release, spendId, camp.title, t, campaignId),
    // 3) audit row, only if (1) happened
    d
      .prepare(
        `INSERT INTO earnings (id, brand_user_id, clipper_user_id, campaign, gross_cents, fee_cents, net_cents, note, created_at, campaign_id, submission_id)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?11, ?12
         WHERE EXISTS (SELECT 1 FROM ledger WHERE id = ?10)`,
      )
      .bind(earningId, camp.brand_user_id, clipperId, camp.title, grossCents, fee, net, input.note ?? null, t, spendId, campaignId, input.submissionId ?? null),
  ])
  if (results[0].meta.changes !== 1) return null
  logEvent({ kind: 'money', name: 'earning credited', detail: `${campaignId} → ${clipperId}: gross $${(grossCents / 100).toFixed(2)}, fee $${(fee / 100).toFixed(2)}, net $${(net / 100).toFixed(2)}` })
  return { gross: grossCents, fee, net, releasesAt: release }
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
