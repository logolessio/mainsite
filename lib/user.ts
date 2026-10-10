import { db, nowSec, uid } from './db'
import { HttpError } from './http'
import { getSession } from './session'

export type UserRow = {
  id: string
  email: string
  name: string | null
  image: string | null
  role: 'user' | 'admin'
  status: 'active' | 'suspended' | 'banned'
  risk_level: 'low' | 'elevated' | 'high'
  risk_reasons: string | null
  stripe_customer_id: string | null
  stripe_account_id: string | null
  connect_ready: number
  connect_details_submitted: number
  last_seen_at: number | null
  created_at: number
}

export async function findOrCreateUser(email: string, name?: string | null, image?: string | null): Promise<UserRow & { isNew: boolean }> {
  const d = await db()
  const e = email.trim().toLowerCase()
  const existing = await d.prepare('SELECT * FROM users WHERE email = ?1').bind(e).first<UserRow>()
  if (existing) return { ...existing, isNew: false }
  await d
    .prepare('INSERT OR IGNORE INTO users (id, email, name, image, created_at) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(uid(), e, name ?? null, image ?? null, nowSec())
    .run()
  const row = await d.prepare('SELECT * FROM users WHERE email = ?1').bind(e).first<UserRow>()
  if (!row) throw new HttpError(500, 'Could not load your account.')
  return { ...row, isNew: true }
}

/**
 * The signed-in person's database row. Throws 401 if nobody is signed in, and 403 if the account is
 * suspended or banned, so a restricted account cannot use any route that goes through here.
 */
export async function requireUser(): Promise<UserRow & { isNew: boolean }> {
  const session = await getSession()
  const email = session?.user?.email
  if (!email) throw new HttpError(401, 'Please sign in.')
  const u = await findOrCreateUser(email, session.user?.name, session.user?.image)
  if (u.status !== 'active') throw new HttpError(403, 'This account is restricted. Contact support if you think that is a mistake.')
  // The owner's role comes from ADMIN_EMAILS (via the session). Keep the row in step with it.
  const role = session.user?.role === 'admin' ? 'admin' : 'user'
  if (u.role !== role) {
    const d = await db()
    await d.prepare('UPDATE users SET role = ?2 WHERE id = ?1').bind(u.id, role).run()
    u.role = role
  }
  return u
}

export async function requireAdmin() {
  const session = await getSession()
  if (session?.user?.role !== 'admin') throw new HttpError(403, 'Admins only.')
  const u = await requireUser()
  if (u.role !== 'admin') throw new HttpError(403, 'Admins only.')
  return u
}

/** Updates "last seen" at most once a minute. Used for the live-users count. */
export async function touch(user: UserRow) {
  const t = nowSec()
  if (user.last_seen_at && t - user.last_seen_at < 60) return
  const d = await db()
  await d.prepare('UPDATE users SET last_seen_at = ?2 WHERE id = ?1').bind(user.id, t).run()
}
