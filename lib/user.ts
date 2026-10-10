import { db, nowSec, uid } from './db'
import { HttpError } from './http'
import { getSession } from './session'

export type UserRow = {
  id: string
  email: string
  name: string | null
  stripe_customer_id: string | null
  stripe_account_id: string | null
  connect_ready: number
  connect_details_submitted: number
  created_at: number
}

export async function findOrCreateUser(email: string, name?: string | null): Promise<UserRow> {
  const d = await db()
  const e = email.trim().toLowerCase()
  await d
    .prepare('INSERT INTO users (id, email, name, created_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(email) DO UPDATE SET name = COALESCE(users.name, excluded.name)')
    .bind(uid(), e, name ?? null, nowSec())
    .run()
  const row = await d.prepare('SELECT * FROM users WHERE email = ?1').bind(e).first<UserRow>()
  if (!row) throw new HttpError(500, 'Could not load your account.')
  return row
}

/** The signed-in person's database row. Throws 401 if nobody is signed in. */
export async function requireUser(): Promise<UserRow> {
  const session = await getSession()
  const email = session?.user?.email
  if (!email) throw new HttpError(401, 'Please sign in.')
  return findOrCreateUser(email, session.user?.name)
}

export async function requireAdmin(): Promise<UserRow> {
  const session = await getSession()
  if (session?.user?.role !== 'admin') throw new HttpError(403, 'Admins only.')
  return requireUser()
}
