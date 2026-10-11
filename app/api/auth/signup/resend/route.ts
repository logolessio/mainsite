import { z } from 'zod'
import { db } from '@/lib/db'
import { codeEmail, emailEnabled, sendEmail } from '@/lib/email'
import { issueCode } from '@/lib/email-code'
import { hit, limit } from '@/lib/guard'
import { requestMeta } from '@/lib/log'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'

/** Sends the confirmation code again for a sign-up that is waiting. Does nothing (and says nothing) otherwise. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  if (!(await emailEnabled())) throw new HttpError(503, 'Email sign-up is not set up yet.')
  await limit(req, { name: 'signup-resend', max: 8, windowSec: 600 })
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(254) }).safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, 'Enter a valid email address.')
  const { email } = parsed.data
  if ((await hit(`signup:addr:${email}`, 3600)) > 8) throw new HttpError(429, 'Too many codes for that address. Try again in an hour.')
  const d = await db()
  const pending = await d.prepare("SELECT 1 AS x FROM email_codes WHERE email = ?1 AND purpose = 'signup'").bind(email).first()
  if (!pending) return json({ ok: true })
  try {
    await sendEmail({ to: email, ...codeEmail(await issueCode(email, 'signup'), 'signup', false, await requestMeta(req)), template: 'sign-up code (resend)' })
  } catch (e) {
    if (!(e instanceof HttpError && e.status === 429)) throw e
  }
  return json({ ok: true })
})
