import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { db, nowSec } from '@/lib/db'
import { emailEnabled, plainMessageEmail, sendEmail } from '@/lib/email'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { balances, startWithdrawal } from '@/lib/ledger'
import { logEvent } from '@/lib/log'
import { notify } from '@/lib/notify'
import { paypalReady } from '@/lib/paypal'
import { addPaypalEmail, paypalEmails } from '@/lib/paypal-emails'
import { reviewReason, sendPayout, setPayoutDestination } from '@/lib/payout'
import { getSetting } from '@/lib/settings'
import { SITE } from '@/lib/site'
import { requireUser } from '@/lib/user'

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254), amount: z.number().positive().max(1_000_000).optional() })

const masked = (e: string) => e.replace(/^(.{1,2}).*(@.*)$/, '$1***$2')

/** A receipt to the account's own email, so a payout is never a surprise. It never stops the payout itself. */
async function receipt(user: { email: string; name: string | null }, cents: number, to: string, held: boolean, id: string) {
  try {
    if (!(await emailEnabled())) return
    const amount = `$${(cents / 100).toFixed(2)}`
    await sendEmail({
      to: user.email,
      ...plainMessageEmail(user.name ?? '', held ? `Your ${amount} withdrawal is being checked` : `Your ${amount} withdrawal is on its way`, `${amount} to ${masked(to)}. ${held ? 'We look over some payouts first, which takes under a day, and it is sent as soon as it is cleared.' : 'It usually arrives within minutes.'} Reference ${id}. If you did not ask for this, change your password and tell us straight away.`, '/dashboard/earnings'),
      template: 'payout receipt',
    })
  } catch {
    /* a receipt that does not send is not a reason to fail */
  }
}

/** A clipper picks the PayPal email to be paid at and withdraws. No account set-up, nothing else to connect. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'withdraw', max: 6, windowSec: 600, userId: user.id })
  if ((await getSetting('payouts_paused')) === '1') throw new HttpError(503, 'Withdrawals are paused for a short while. Your balance has not changed.')
  const parsed = schema.safeParse(await body(req, 2048))
  if (!parsed.success) throw new HttpError(400, 'Enter the PayPal email you want to be paid at.')
  const { email, amount } = parsed.data
  // with `payout-ceremony` on, money only goes to an email that was added and confirmed with a code
  const ceremony = await featureOn('payout-ceremony')
  if (ceremony && !(await paypalEmails(user.id)).emails.includes(email)) throw new HttpError(400, 'Add that PayPal email to your list first, so we can confirm it is yours.')
  if (!(await paypalReady())) throw new HttpError(503, 'Withdrawals are not open yet. Your balance has not changed.')

  const b = await balances(user.id)
  const cents = amount === undefined ? b.available : Math.round(amount * 100)
  if (!Number.isInteger(cents) || cents <= 0) throw new HttpError(400, 'Enter a valid amount.')
  if (cents < SITE.minPayoutUsd * 100) throw new HttpError(400, `The minimum withdrawal is $${SITE.minPayoutUsd}.`)

  // Decide first whether it can go straight out, then reserve the money (this step stops double withdrawals).
  const reason = await reviewReason(user, req, cents)
  const payoutId = await startWithdrawal(user.id, cents)
  if (!payoutId) throw new HttpError(409, 'That is more than your available balance.')
  await setPayoutDestination(payoutId, email)
  const d = await db()
  await addPaypalEmail(user.id, email) // remembered for next time

  logEvent({ kind: 'money', name: 'withdrawal requested', actor: user.email, detail: `${payoutId} $${(cents / 100).toFixed(2)} to ${email}${reason ? ` (held: ${reason})` : ''}`, req })
  if (reason) {
    await d.prepare("UPDATE payouts SET status = 'review', review_reason = ?2, updated_at = ?3 WHERE id = ?1").bind(payoutId, reason.slice(0, 300), nowSec()).run()
    await auditSafe({ id: user.id, email: user.email }, 'payout.held', payoutId, reason)
    await notify(user.id, { kind: 'payout', title: 'Your withdrawal is being checked', body: 'We review some withdrawals before sending them. This usually takes under a day.', href: '/dashboard/earnings#withdraw', dedupe: `payout-review:${payoutId}` })
    if (ceremony) await receipt(user, cents, email, true, payoutId)
    return json({ ok: true, payoutId, amount: cents, review: true })
  }

  const sent = await sendPayout(payoutId)
  if (!sent.ok) {
    if (sent.held) {
      if (ceremony) await receipt(user, cents, email, true, payoutId)
      return json({ ok: true, payoutId, amount: cents, review: true })
    }
    throw new HttpError(400, sent.error)
  }
  if (ceremony) await receipt(user, cents, email, false, payoutId)
  return json({ ok: true, payoutId, amount: cents })
})
