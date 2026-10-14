import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { codeEmail, emailEnabled, sendEmail } from '@/lib/email'
import { checkCode, issueCode } from '@/lib/email-code'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requestMeta } from '@/lib/log'
import { isVerified, markVerified } from '@/lib/verification'
import { requireUser } from '@/lib/user'

/** Whether this account has been verified. Discord and email sign-ups already are. */
export const GET = route(async () => {
  const user = await requireUser()
  return json(await isVerified(user.id, user.email))
})

const schema = z.union([z.object({ action: z.literal('send') }), z.object({ action: z.literal('check'), code: z.string().regex(/^\d{6}$/) })])

/** Sends a six digit code to the account's email, or checks the one that was typed. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'verify-code', max: 12, windowSec: 900, userId: user.id })
  const parsed = schema.safeParse(await body(req, 512))
  if (!parsed.success) throw new HttpError(400, 'Enter the 6 digit code.')
  const state = await isVerified(user.id, user.email)
  if (state.verified) return json({ ok: true, verified: true })

  const email = user.email.toLowerCase()
  if (parsed.data.action === 'send') {
    if (!(await emailEnabled())) throw new HttpError(503, 'Email is not set up yet. Please try again soon.')
    const code = await issueCode(email, 'verify')
    await sendEmail({ to: email, ...codeEmail(code, 'verify', false, await requestMeta(req)), template: 'verify code' })
    return json({ ok: true, verified: false, sentTo: email.replace(/^(.).*(@.*)$/, '$1***$2') })
  }
  const ok = await checkCode(email, 'verify', parsed.data.code)
  if (!ok) throw new HttpError(400, 'That code is not right, or it has expired. Ask for a new one.')
  await markVerified(user.id)
  await auditSafe({ id: user.id, email: user.email }, 'account.verified', user.id, 'code')
  return json({ ok: true, verified: true })
})
