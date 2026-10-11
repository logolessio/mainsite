import { db, nowSec } from './db'
import { HttpError } from './http'
import { logEvent } from './log'
import { markPayoutSent, reverseWithdrawal } from './ledger'
import { notify } from './notify'
import { assessRequest } from './risk'
import { getSetting } from './settings'
import { stripe } from './stripe'
import type { UserRow } from './user'

/** Decides whether a withdrawal can go straight out, or waits for an admin. Returns the reason if it must wait. */
export async function reviewReason(user: UserRow, req: Request, cents: number): Promise<string | null> {
  const reasons: string[] = []
  if (user.risk_level !== 'low') reasons.push(`Extra checks on this account${user.risk_reasons ? ` (${user.risk_reasons})` : ''}`)

  const now = await assessRequest(req)
  if (now.level === 'elevated') {
    reasons.push(`Withdrawal requested from a VPN, proxy or data-centre network (${now.org ?? 'unknown'})`)
    if (user.risk_level === 'low') {
      const d = await db()
      await d.prepare("UPDATE users SET risk_level = 'elevated', risk_reasons = ?2 WHERE id = ?1").bind(user.id, `Withdrawal from VPN or proxy network (${now.org ?? 'unknown'})`).run()
    }
  }

  const over = Number(await getSetting('review_over_cents'))
  if (over > 0 && cents > over) reasons.push(`Large withdrawal (over $${(over / 100).toFixed(0)})`)

  const cap = Number(await getSetting('daily_payout_cap_cents'))
  if (cap > 0) {
    const d = await db()
    const r = await d
      .prepare("SELECT COALESCE(SUM(amount_cents), 0) AS s FROM payouts WHERE status IN ('sent', 'pending') AND created_at > ?1")
      .bind(nowSec() - 86400)
      .first<{ s: number }>()
    if ((r?.s ?? 0) + cents > cap) reasons.push('Daily payout limit reached')
  }
  return reasons.length ? reasons.join('; ') : null
}

/** Sends a reserved payout through Stripe. On failure the money goes back on the person's balance. */
export async function sendPayout(payoutId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const d = await db()
  const p = await d
    .prepare(
      `SELECT p.id, p.user_id, p.amount_cents, p.status, u.stripe_account_id, u.connect_ready
       FROM payouts p JOIN users u ON u.id = p.user_id WHERE p.id = ?1`,
    )
    .bind(payoutId)
    .first<{ id: string; user_id: string; amount_cents: number; status: string; stripe_account_id: string | null; connect_ready: number }>()
  if (!p) throw new HttpError(404, 'Payout not found.')
  if (p.status !== 'pending' && p.status !== 'review') throw new HttpError(409, 'That payout has already been handled.')
  // Claim it so two admins (or a double click) cannot send it twice.
  const claim = await d.prepare("UPDATE payouts SET status = 'pending', updated_at = ?2 WHERE id = ?1 AND status IN ('pending','review')").bind(payoutId, nowSec()).run()
  if (claim.meta.changes !== 1) throw new HttpError(409, 'That payout has already been handled.')
  if (!p.stripe_account_id || !p.connect_ready) {
    await reverseWithdrawal(payoutId, 'failed', 'Stripe account not ready')
    return { ok: false, error: 'The clipper’s Stripe account is not ready. The money went back to their balance.' }
  }
  try {
    const s = await stripe()
    const transfer = await s.transfers.create(
      { amount: p.amount_cents, currency: 'usd', destination: p.stripe_account_id, transfer_group: `payout_${payoutId}`, metadata: { payout_id: payoutId, user_id: p.user_id } },
      { idempotencyKey: `payout_${payoutId}` },
    )
    await markPayoutSent(payoutId, transfer.id)
    logEvent({ kind: 'money', name: 'payout sent', detail: `${payoutId} $${(p.amount_cents / 100).toFixed(2)} → ${transfer.id}` })
    await notify(p.user_id, { kind: 'payout', title: `Payout sent: $${(p.amount_cents / 100).toFixed(2)}`, body: 'It is on its way to your Stripe account.', href: '/dashboard/payouts', dedupe: `payout-sent:${payoutId}` })
    return { ok: true }
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Transfer failed'
    logEvent({ kind: 'money', name: 'payout failed', detail: `${payoutId}: ${reason.slice(0, 200)}` })
    await reverseWithdrawal(payoutId, 'failed', reason)
    await notify(p.user_id, { kind: 'payout', title: 'Payout failed', body: 'Your balance has not changed. Please try again later.', href: '/dashboard/payouts', dedupe: `payout-failed:${payoutId}` })
    return { ok: false, error: 'Stripe could not send it. The money went back to the clipper’s balance.' }
  }
}
