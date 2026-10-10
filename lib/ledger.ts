import { type D1Database, db, nowSec, uid } from './db'
import { HttpError } from './http'
import { SITE } from './site'

/**
 * The money ledger. Rules that keep it safe:
 *  - Amounts are integer cents. Balances are always a SUM over the ledger, never a stored number.
 *  - Anything that spends money is a single conditional INSERT ("only if the balance covers it"),
 *    so two requests at once cannot both succeed.
 *  - Writes tied to a Stripe id use a unique (kind, ref) index, so a repeated webhook changes nothing.
 */

export type Balances = {
  brand: number // money a brand has added and not spent
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

/**
 * Moves money from a brand to a clipper for verified views. The platform fee is taken out of the clipper's
 * share, so the brand never pays more than the gross amount. Returns false if the brand cannot cover it.
 * Stand-in for the automatic view verification that does not exist yet: an admin triggers it.
 */
export async function creditEarning(input: { brandId: string; clipperId: string; grossCents: number; campaign?: string; note?: string }) {
  const { brandId, clipperId, grossCents } = input
  if (!Number.isInteger(grossCents) || grossCents <= 0) throw new HttpError(400, 'Enter a valid amount.')
  const d = await db()
  const fee = feeFor(grossCents)
  const net = grossCents - fee
  const t = nowSec()
  const spendId = uid()
  const earningId = uid()
  const release = t + SITE.holdDays * 86400

  const results = await d.batch([
    // 1) the brand pays, only if the balance covers it
    d
      .prepare(
        `INSERT INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at)
         SELECT ?1, ?2, 'brand', 'spend', -?3, ?4, ?1, ?5, ?4
         WHERE (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger WHERE user_id = ?2 AND account = 'brand') >= ?3`,
      )
      .bind(spendId, brandId, grossCents, t, input.campaign ?? 'Earnings'),
    // 2) the clipper is credited, only if (1) happened
    d
      .prepare(
        `INSERT INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at)
         SELECT ?1, ?2, 'clipper', 'earning', ?3, ?4, ?5, ?6, ?7
         WHERE EXISTS (SELECT 1 FROM ledger WHERE id = ?5)`,
      )
      .bind(earningId, clipperId, net, release, spendId, input.campaign ?? 'Earnings', t),
    // 3) audit row, only if (1) happened
    d
      .prepare(
        `INSERT INTO earnings (id, brand_user_id, clipper_user_id, campaign, gross_cents, fee_cents, net_cents, note, created_at)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9
         WHERE EXISTS (SELECT 1 FROM ledger WHERE id = ?10)`,
      )
      .bind(earningId, brandId, clipperId, input.campaign ?? null, grossCents, fee, net, input.note ?? null, t, spendId),
  ])
  if (results[0].meta.changes !== 1) return null
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

/** Takes refunded money back off a brand balance. `ref` makes each refund amount apply once. */
export async function debitRefund(d: D1Database, userId: string, amountCents: number, ref: string) {
  const t = nowSec()
  await d
    .prepare(
      `INSERT OR IGNORE INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at)
       VALUES (?1, ?2, 'brand', 'refund', -?3, ?4, ?5, 'Refund', ?4)`,
    )
    .bind(uid(), userId, amountCents, t, ref)
    .run()
}
