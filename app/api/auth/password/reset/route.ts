import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { db, nowSec } from '@/lib/db'
import { checkCode } from '@/lib/email-code'
import { limit } from '@/lib/guard'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'
import { logEvent } from '@/lib/log'
import { hashPassword, passwordProblem } from '@/lib/password'
import { findOrCreateUser } from '@/lib/user'

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254), code: z.string().regex(/^\d{6}$/), password: z.string().min(1).max(200) })

/** Sets a new password when the emailed code is right. Also lets someone who signed up with Google or Discord add a password. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  await limit(req, { name: 'reset', max: 10, windowSec: 600 })
  const parsed = schema.safeParse(await body(req, 2048))
  if (!parsed.success) throw new HttpError(400, 'Enter the 6-digit code and a new password.')
  const { email, code, password } = parsed.data
  const problem = await passwordProblem(password, email)
  if (problem) throw new HttpError(400, problem)
  const ok = await checkCode(email, 'reset', code)
  if (!ok) throw new HttpError(400, 'That code is not right, or it has expired. Ask for a new one.')

  const user = await findOrCreateUser(email)
  const t = nowSec()
  const d = await db()
  await d
    .prepare(
      `INSERT INTO credentials (email, user_id, password_hash, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)
       ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, updated_at = excluded.updated_at`,
    )
    .bind(email, user.id, await hashPassword(password), t)
    .run()
  await auditSafe({ id: user.id, email }, 'password.reset', email, null)
  logEvent({ kind: 'auth', name: 'password reset', actor: email, req })
  return json({ ok: true })
})
