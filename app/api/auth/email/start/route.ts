import { z } from 'zod'
import { codeEmail, emailEnabled, sendEmail } from '@/lib/email'
import { issueCode } from '@/lib/email-code'
import { hit, ipHash, limit } from '@/lib/guard'
import { hasHuman } from '@/lib/human'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'
import { auditSafe } from '@/lib/chain'

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254) })

/**
 * Sends a six-digit sign-in code. The answer is always the same whether or not the address already has an account, so
 * this cannot be used to find out who is a member. Needs the human check and is rate limited by network and by address.
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  if (!(await emailEnabled())) throw new HttpError(503, 'Email sign-in is not set up yet.')
  await limit(req, { name: 'email-code', max: 8, windowSec: 600 })
  if (!(await hasHuman(req))) throw new HttpError(403, 'Please complete the human check first.')
  const parsed = schema.safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, 'Enter a valid email address.')
  const { email } = parsed.data
  if ((await hit(`email-code:addr:${email}`, 3600)) > 6) throw new HttpError(429, 'Too many codes for that address. Try again in an hour.')

  const code = await issueCode(email)
  const mail = codeEmail(code)
  await sendEmail({ to: email, ...mail })
  await auditSafe({ id: null, email: 'system' }, 'email.code_sent', null, `${(await ipHash(req)).slice(0, 8)}`)
  return json({ ok: true })
})
