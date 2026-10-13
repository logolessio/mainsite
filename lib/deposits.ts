import { db, nowSec } from './db'
import { creditTopup } from './ledger'
import { logEvent } from './log'
import { notify } from './notify'
import { captureOrder } from './paypal'

/**
 * Finishes a payment a brand approved at PayPal: takes the money, marks it paid and adds it to their balance. The order id is the
 * ledger reference, so running this twice (the return page and the webhook both do) adds the money only once.
 */
export async function settleDeposit(orderId: string): Promise<{ ok: true; amountCents: number } | { ok: false; error: string }> {
  const d = await db()
  const row = await d.prepare('SELECT user_id, amount_cents, status FROM topups WHERE session_id = ?1').bind(orderId).first<{ user_id: string; amount_cents: number; status: string }>()
  if (!row) return { ok: false, error: 'We could not find that payment.' }
  if (row.status === 'paid') return { ok: true, amountCents: row.amount_cents }
  if (row.status !== 'open') return { ok: false, error: 'That payment is no longer open. Start a new one.' }

  const cap = await captureOrder(orderId)
  if (cap.status !== 'COMPLETED' || !cap.captureId) {
    if (cap.status === 'PENDING') return { ok: false, error: 'PayPal is still checking that payment. It will be added to your balance when it clears.' }
    return { ok: false, error: 'PayPal did not complete that payment. You have not been charged.' }
  }
  // never trust the amount we hoped for: credit what PayPal says it took, and only if it matches what was asked
  if (cap.amountCents !== row.amount_cents) {
    logEvent({ kind: 'money', name: 'deposit amount mismatch', detail: `${orderId}: asked ${row.amount_cents}, captured ${cap.amountCents}` })
    return { ok: false, error: 'The amount did not match. Contact support so we can sort it out.' }
  }
  const t = nowSec()
  // "payment_intent" holds PayPal's capture id and "stripe_fee_cents" what PayPal charged us: the columns keep their old names
  await d.prepare("UPDATE topups SET status = 'paid', payment_intent = ?2, paid_at = ?3, stripe_fee_cents = ?4 WHERE session_id = ?1 AND status = 'open'").bind(orderId, cap.captureId, t, cap.feeCents).run()
  const first = await creditTopup(d, row.user_id, orderId, row.amount_cents)
  if (first) {
    logEvent({ kind: 'money', name: 'funds added', detail: `${row.user_id} +$${(row.amount_cents / 100).toFixed(2)} (PayPal ${orderId})` })
    await notify(row.user_id, { kind: 'account', title: `$${(row.amount_cents / 100).toFixed(2)} added to your balance`, body: 'It is ready to put into a campaign.', href: '/brand/billing', dedupe: `deposit:${orderId}` })
  }
  return { ok: true, amountCents: row.amount_cents }
}

