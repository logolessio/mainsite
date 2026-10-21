import { z } from 'zod'
import { codeEmail, emailEnabled, plainMessageEmail, sendEmail } from '@/lib/email'
import { checkCode, issueCode } from '@/lib/email-code'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requestMeta } from '@/lib/log'
import { notify } from '@/lib/notify'
import { addPaypalEmail, paypalEmails, removePaypalEmail } from '@/lib/paypal-emails'
import { requireUser } from '@/lib/user'

/** The PayPal emails a clipper can be paid at: `email` is the default, `emails` is the whole list. */
export const GET = route(async () => {
  const user = await requireUser()
  return json(await paypalEmails(user.id))
})

const mask = (e: string) => e.replace(/^(.{1,2}).*(@.*)$/, '$1***$2')
const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  makeDefault: z.boolean().optional(),
  /** ask for a code to be emailed to the account */
  action: z.literal('send').optional(),
  code: z.string().regex(/^\d{6}$/).optional(),
})

/**
 * Adds an address (and makes it the default unless told not to). With `payout-ceremony` on, a new address first needs a code:
 * { action: 'send', email } emails a six digit code to the account, then { email, code } checks it and adds the address. The code is tied to that address.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'paypal-email', max: 20, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, 'Enter a valid PayPal email address.')
  const { email, makeDefault, action, code } = parsed.data
  const ceremony = await featureOn('payout-ceremony')
  const cur = await paypalEmails(user.id)
  const known = cur.emails.includes(email)
  const account = user.email.toLowerCase()

  if (action === 'send') {
    if (known) throw new HttpError(409, 'That email is already on your list.')
    if (cur.emails.length >= 5) throw new HttpError(400, 'You already have 5 PayPal emails. Remove one first.')
    if (!(await emailEnabled())) throw new HttpError(503, 'Email is not set up yet, so we cannot send the code. Please try again soon.')
    await protect(req, { name: 'paypal-code', max: 6, windowSec: 900, userId: user.id })
    await sendEmail({ to: account, ...codeEmail(await issueCode(account, 'payout', email), 'payout', false, await requestMeta(req)), template: 'payout code' })
    return json({ ok: true, sentTo: mask(account) })
  }

  if (ceremony && !known) {
    if (!code) throw new HttpError(403, 'Confirm it with the code we email you first.')
    const ok = await checkCode(account, 'payout', code)
    if (!ok || ok.payload !== email) throw new HttpError(400, 'That code is not right, or it has expired. Ask for a new one.')
  }

  const saved = await addPaypalEmail(user.id, email, makeDefault ?? true)
  if (ceremony && !known) {
    await notify(user.id, { kind: 'payout', title: 'PayPal email added', body: `${mask(email)} can now be paid. If this was not you, change your password.`, href: '/dashboard/earnings', dedupe: `paypal-add:${email}:${Math.floor(Date.now() / 60000)}` })
    if (await emailEnabled()) {
      await sendEmail({ to: account, ...plainMessageEmail(user.name ?? '', 'A payout email was added', `${email} was added as a PayPal email for payouts on your logoless account. If this was not you, change your password and tell us straight away.`, '/dashboard/earnings'), template: 'payout email added' }).catch(() => null)
    }
  }
  return json({ ok: true, ...saved })
})

export const DELETE = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'paypal-email', max: 20, windowSec: 600, userId: user.id })
  const parsed = schema.pick({ email: true }).safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, 'That email is not valid.')
  return json({ ok: true, ...(await removePaypalEmail(user.id, parsed.data.email)) })
})
