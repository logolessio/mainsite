import { auditSafe } from '@/lib/chain'
import { protect } from '@/lib/guard'
import { balances, startWithdrawal } from '@/lib/ledger'
import { body, HttpError, json, route } from '@/lib/http'
import { notify } from '@/lib/notify'
import { reviewReason, sendPayout } from '@/lib/payout'
import { getSetting } from '@/lib/settings'
import { SITE } from '@/lib/site'
import { requireUser } from '@/lib/user'
import { db, nowSec } from '@/lib/db'
import { logEvent } from '@/lib/log'

/** Clipper withdraws earnings to their connected Stripe account. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'withdraw', max: 6, windowSec: 600, userId: user.id })
  if ((await getSetting('payouts_paused')) === '1') throw new HttpError(503, 'Withdrawals are paused for a short while. Your balance is safe.')
  const { amount } = await body<{ amount?: number }>(req).catch(() => ({ amount: undefined }))

  if (!user.stripe_account_id || !user.connect_ready) throw new HttpError(400, 'Connect your Stripe account first.')

  const b = await balances(user.id)
  const cents = amount === undefined ? b.available : Math.round(Number(amount) * 100)
  if (!Number.isInteger(cents) || cents <= 0) throw new HttpError(400, 'Enter a valid amount.')
  if (cents < SITE.minPayoutUsd * 100) throw new HttpError(400, `The minimum withdrawal is $${SITE.minPayoutUsd}.`)

  // Decide first whether it can go straight out, then reserve the money (this step stops double withdrawals).
  const reason = await reviewReason(user, req, cents)
  const payoutId = await startWithdrawal(user.id, cents)
  if (!payoutId) throw new HttpError(409, 'That is more than your available balance.')

  logEvent({ kind: 'money', name: 'withdrawal requested', actor: user.email, detail: `${payoutId} $${(cents / 100).toFixed(2)}${reason ? ` (held: ${reason})` : ''}`, req })
  if (reason) {
    const d = await db()
    await d.prepare("UPDATE payouts SET status = 'review', review_reason = ?2, updated_at = ?3 WHERE id = ?1").bind(payoutId, reason.slice(0, 300), nowSec()).run()
    await auditSafe({ id: user.id, email: user.email }, 'payout.held', payoutId, reason)
    await notify(user.id, { kind: 'payout', title: 'Your withdrawal is being checked', body: 'We review some withdrawals before sending them. This usually takes under a day.', href: '/dashboard/payouts', dedupe: `payout-review:${payoutId}` })
    return json({ ok: true, payoutId, amount: cents, review: true })
  }

  const sent = await sendPayout(payoutId)
  if (!sent.ok) throw new HttpError(502, 'We could not send that payout right now. Your balance has not changed. Please try again later.')
  return json({ ok: true, payoutId, amount: cents })
})
