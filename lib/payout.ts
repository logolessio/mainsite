import { db, nowSec } from './db'
import { HttpError } from './http'
import { logEvent } from './log'
import { markPayoutSent, reverseWithdrawal } from './ledger'
import { notify } from './notify'
import { assessRequest } from './risk'
import { getSetting } from './settings'
import { PayPalError, paypalReady, sendPayoutTo } from './paypal'
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

const destKey = (payoutId: string) => `payout-to:${payoutId}`

/** Remembers which PayPal email a payout is going to. It lives in the settings table, next to the payout's own id. */
export async function setPayoutDestination(payoutId: string, email: string) {
  const d = await db()
  await d
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(destKey(payoutId), email, nowSec())
    .run()
}

export async function payoutDestination(payoutId: string) {
  const d = await db()
  return (await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(destKey(payoutId)).first<{ value: string }>())?.value ?? null
}

/**
 * Sends a reserved payout to the PayPal email chosen for it. If PayPal clearly says no, the money goes back on the person's
 * balance. If PayPal does not answer at all, the payout is held for an admin instead of being returned, because it may have gone
 * through and giving the money back could pay twice.
 */
export async function sendPayout(payoutId: string): Promise<{ ok: true } | { ok: false; error: string; held?: boolean }> {
  const d = await db()
  const p = await d.prepare('SELECT id, user_id, amount_cents, status FROM payouts WHERE id = ?1').bind(payoutId).first<{ id: string; user_id: string; amount_cents: number; status: string }>()
  if (!p) throw new HttpError(404, 'Payout not found.')
  if (p.status !== 'pending' && p.status !== 'review') throw new HttpError(409, 'That payout has already been handled.')
  // Claim it so two admins (or a double click) cannot send it twice.
  const claim = await d.prepare("UPDATE payouts SET status = 'pending', updated_at = ?2 WHERE id = ?1 AND status IN ('pending','review')").bind(payoutId, nowSec()).run()
  if (claim.meta.changes !== 1) throw new HttpError(409, 'That payout has already been handled.')
  const email = await payoutDestination(payoutId)
  if (!email) {
    await reverseWithdrawal(payoutId, 'failed', 'No PayPal email was given')
    return { ok: false, error: 'There was no PayPal email on this payout. The money went back to the clipper’s balance.' }
  }
  if (!(await paypalReady())) {
    await d.prepare("UPDATE payouts SET status = 'review', review_reason = 'PayPal is not connected yet', updated_at = ?2 WHERE id = ?1").bind(payoutId, nowSec()).run()
    return { ok: false, held: true, error: 'PayPal is not connected yet, so this payout is waiting.' }
  }
  try {
    const sent = await sendPayoutTo({ payoutId, email, amountCents: p.amount_cents })
    await markPayoutSent(payoutId, sent.batchId)
    logEvent({ kind: 'money', name: 'payout sent', detail: `${payoutId} $${(p.amount_cents / 100).toFixed(2)} → PayPal ${sent.batchId}` })
    await notify(p.user_id, { kind: 'payout', title: `Payout sent: $${(p.amount_cents / 100).toFixed(2)}`, body: `It is on its way to ${email} on PayPal.`, href: '/dashboard/payouts', dedupe: `payout-sent:${payoutId}` })
    return { ok: true }
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Payout failed'
    if (e instanceof PayPalError && e.status === 400) {
      // PayPal said no, clearly: nothing was sent, so the money goes back.
      logEvent({ kind: 'money', name: 'payout refused', detail: `${payoutId}: ${e.code} ${reason.slice(0, 160)}` })
      await reverseWithdrawal(payoutId, 'failed', reason)
      await notify(p.user_id, { kind: 'payout', title: 'Payout failed', body: 'PayPal did not accept it, so your balance has not changed. Check the email and try again.', href: '/dashboard/payouts', dedupe: `payout-failed:${payoutId}` })
      return { ok: false, error: `PayPal did not accept that: ${reason}` }
    }
    // No clear answer: hold it for a person to check in PayPal before anything is returned or resent.
    logEvent({ kind: 'money', name: 'payout unclear', detail: `${payoutId}: ${reason.slice(0, 160)}` })
    await d.prepare("UPDATE payouts SET status = 'review', review_reason = ?2, updated_at = ?3 WHERE id = ?1").bind(payoutId, `PayPal did not answer: ${reason.slice(0, 200)}. Check PayPal before sending again.`, nowSec()).run()
    return { ok: false, held: true, error: 'PayPal did not answer. The payout is being checked and will not be lost.' }
  }
}
