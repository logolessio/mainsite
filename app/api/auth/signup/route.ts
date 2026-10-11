import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { db } from '@/lib/db'
import { alreadyMemberEmail, codeEmail, emailEnabled, sendEmail } from '@/lib/email'
import { issueCode } from '@/lib/email-code'
import { hit, limit } from '@/lib/guard'
import { hasHuman } from '@/lib/human'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'
import { hashPassword, passwordProblem } from '@/lib/password'
import { getSetting } from '@/lib/settings'

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
  name: z.string().trim().max(60).optional(),
})

/**
 * Step one of signing up: check the password, then email a six-digit code to prove the address is real. Nothing is
 * created until the code is entered. The answer never reveals whether the address already has an account (those people
 * get an email saying so instead of a code).
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  if (!(await emailEnabled())) throw new HttpError(503, 'Email sign-up is not set up yet.')
  await limit(req, { name: 'signup', max: 8, windowSec: 600 })
  if (!(await hasHuman(req))) throw new HttpError(403, 'Please complete the human check first.')
  if ((await getSetting('signups_paused')) === '1') throw new HttpError(503, 'New accounts are paused for a moment. Please try again soon.')
  const parsed = schema.safeParse(await body(req, 4 * 1024))
  if (!parsed.success) throw new HttpError(400, 'Enter a valid email address and a password.')
  const { email, password, name } = parsed.data
  const problem = await passwordProblem(password, email)
  if (problem) throw new HttpError(400, problem)
  if ((await hit(`signup:addr:${email}`, 3600)) > 6) throw new HttpError(429, 'Too many tries for that address. Try again in an hour.')

  const d = await db()
  const has = await d.prepare('SELECT 1 AS x FROM credentials WHERE email = ?1').bind(email).first()
  try {
    if (has) await sendEmail({ to: email, ...alreadyMemberEmail() })
    else {
      const code = await issueCode(email, 'signup', JSON.stringify({ hash: await hashPassword(password), name: name ?? '' }))
      await sendEmail({ to: email, ...codeEmail(code, 'signup') })
    }
  } catch (e) {
    // A 429 here means a code was sent a moment ago and is still valid. Saying nothing keeps accounts private.
    if (!(e instanceof HttpError && e.status === 429)) throw e
  }
  await auditSafe({ id: null, email: 'system' }, 'signup.started', null, null)
  return json({ ok: true })
})
