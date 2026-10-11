import { z } from 'zod'
import { db } from '@/lib/db'
import { codeEmail, emailEnabled, sendEmail } from '@/lib/email'
import { issueCode } from '@/lib/email-code'
import { hit, limit } from '@/lib/guard'
import { requestMeta } from '@/lib/log'
import { hasHuman } from '@/lib/human'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'

/** Emails a reset code to an address that has an account. The answer is identical for every address. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  if (!(await emailEnabled())) throw new HttpError(503, 'Email is not set up yet.')
  await limit(req, { name: 'forgot', max: 8, windowSec: 600 })
  if (!(await hasHuman(req))) throw new HttpError(403, 'Please complete the human check first.')
  const parsed = z.object({ email: z.string().trim().toLowerCase().email().max(254) }).safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, 'Enter a valid email address.')
  const { email } = parsed.data
  if ((await hit(`forgot:addr:${email}`, 3600)) > 6) return json({ ok: true })
  const d = await db()
  const member = await d.prepare('SELECT 1 AS x FROM users WHERE email = ?1').bind(email).first()
  if (member) {
    try {
      await sendEmail({ to: email, ...codeEmail(await issueCode(email, 'reset'), 'reset', false, await requestMeta(req)), template: 'password reset code' })
    } catch (e) {
      if (!(e instanceof HttpError && e.status === 429)) throw e
    }
  }
  return json({ ok: true })
})
