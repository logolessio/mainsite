import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { db, nowSec } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { hashPassword, passwordProblem, verifyPassword } from '@/lib/password'
import { requireUser } from '@/lib/user'

/** Does this account have a password? (People who signed up with Google or Discord may not.) */
export const GET = route(async () => {
  const user = await requireUser()
  const d = await db()
  const row = await d.prepare('SELECT 1 AS x FROM credentials WHERE email = ?1').bind(user.email).first()
  return json({ email: user.email, hasPassword: Boolean(row) })
})

const schema = z.object({ current: z.string().min(1).max(200), next: z.string().min(1).max(200) })

/** Changes the password of the signed-in person. Needs the current password, so a stolen session alone cannot lock them out. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'password', max: 8, windowSec: 900, userId: user.id })
  const parsed = schema.safeParse(await body(req, 2048))
  if (!parsed.success) throw new HttpError(400, 'Enter your current password and a new one.')
  const { current, next } = parsed.data
  const d = await db()
  const row = await d.prepare('SELECT password_hash FROM credentials WHERE email = ?1').bind(user.email).first<{ password_hash: string }>()
  if (!row) throw new HttpError(400, 'This account signs in with Google or Discord, so it has no password yet. Use "Forgot your password" on the login page to add one.')
  if (!(await verifyPassword(current, row.password_hash))) throw new HttpError(400, 'Your current password is not right.')
  if (current === next) throw new HttpError(400, 'Choose a password you have not used just now.')
  const problem = await passwordProblem(next, user.email)
  if (problem) throw new HttpError(400, problem)
  await d.prepare('UPDATE credentials SET password_hash = ?2, updated_at = ?3 WHERE email = ?1').bind(user.email, await hashPassword(next), nowSec()).run()
  await auditSafe({ id: user.id, email: user.email }, 'password.change', user.email, null)
  return json({ ok: true })
})
