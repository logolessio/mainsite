import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { db, nowSec, uid } from './db'
import { HttpError } from './http'
import { ownerEmails } from './roles'
import { getSession } from './session'
import { overIpLimit, recordSignupIp } from './ip-limit'
import { getSetting } from './settings'

export type UserRow = {
  id: string
  email: string
  name: string | null
  image: string | null
  role: 'user' | 'admin'
  status: 'active' | 'suspended' | 'banned'
  risk_level: 'low' | 'elevated' | 'high'
  risk_reasons: string | null
  last_seen_at: number | null
  created_at: number
}

/** `fromDiscord`: the account is being made by the bot, so the request's address is Discord's, not the person's: the limit per address is skipped and no address is kept. */
export async function findOrCreateUser(email: string, name?: string | null, image?: string | null, opts: { fromDiscord?: boolean } = {}): Promise<UserRow & { isNew: boolean }> {
  const d = await db()
  const e = email.trim().toLowerCase()
  const existing = await d.prepare('SELECT * FROM users WHERE email = ?1').bind(e).first<UserRow>()
  if (existing) return { ...existing, isNew: false }
  if ((await getSetting('signups_paused')) === '1') throw new HttpError(403, 'New accounts are paused for a moment. Please try again soon.')
  // up to three accounts from one network address (the owner's own addresses are never held back)
  if (!opts.fromDiscord && !(await isOwnerEmail(e)) && (await overIpLimit())) throw new HttpError(403, 'Too many accounts have been made from this network. If that is a mistake, contact support and we will sort it out.')
  const id = uid()
  await d
    .prepare('INSERT OR IGNORE INTO users (id, email, name, image, created_at) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(id, e, name ?? null, image ?? null, nowSec())
    .run()
  const row = await d.prepare('SELECT * FROM users WHERE email = ?1').bind(e).first<UserRow>()
  if (!row) throw new HttpError(500, 'Could not load your account.')
  if (row.id === id && !opts.fromDiscord) await recordSignupIp(row.id)
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

/** Is this address the owner's (one of ADMIN_EMAILS)? Granted admins are not. */
export async function isOwnerEmail(email: string | null | undefined) {
  const e = (email ?? '').trim().toLowerCase()
  return Boolean(e) && (await ownerEmails()).includes(e)
}

/**
 * The owner, and nobody else: for the things a granted admin may not do (moving money by hand, deleting or banning people, owner API
 * keys, deleting logs, the launch gate). Checked here on the server, so hiding a button is never the only thing in the way.
 */
export async function requireOwner() {
  const u = await requireAdmin()
  if (!(await isOwnerEmail(u.email))) throw new HttpError(403, 'Only the owner can do this.')
  return u
}

/** Updates "last seen" at most once a minute. Used for the live-users count. */
export async function touch(user: UserRow) {
  const t = nowSec()
  if (user.last_seen_at && t - user.last_seen_at < 60) return
  const d = await db()
  await d.prepare('UPDATE users SET last_seen_at = ?2 WHERE id = ?1').bind(user.id, t).run()
}

/** For server-rendered pages: the signed-in person's row, or a redirect to /login. */
export async function pageUser() {
  await connection()
  const session = await getSession()
  const email = session?.user?.email
  if (!email) redirect('/login')
  const u = await findOrCreateUser(email, session.user?.name, session.user?.image)
  if (u.status === 'banned') redirect('/login')
  // The name on the profile is the account's name: an account whose profile name was changed before the two were kept together is brought in step here.
  try {
    const d = await db()
    const p = await d.prepare('SELECT display_name FROM profiles WHERE user_id = ?1').bind(u.id).first<{ display_name: string }>()
    if (p?.display_name && p.display_name !== u.name) {
      await d.prepare('UPDATE users SET name = ?2 WHERE id = ?1').bind(u.id, p.display_name).run()
      u.name = p.display_name
    }
  } catch {
    /* the page still opens with the name it had */
  }
  return u
}

export async function requireDev() {
  const session = await getSession()
  if (!session?.user?.roles?.includes('dev')) throw new HttpError(403, 'Developers only.')
  return requireUser()
}

/** Someone on the team: an admin or a developer. For tools both sides need, like pushing features. */
export async function requireStaff() {
  const session = await getSession()
  const roles = session?.user?.roles ?? []
  if (!roles.includes('admin') && !roles.includes('dev')) throw new HttpError(403, 'Team only.')
  return requireUser()
}

/** For developer pages: anyone without the developer role sees a plain 404. */
export async function pageDev() {
  await connection()
  const session = await getSession()
  if (!session?.user?.roles?.includes('dev')) notFound()
  return pageUser()
}

/** For admin pages: anyone who is not an admin sees a plain 404, so the page does not even confirm it exists. */
export async function pageAdmin() {
  await connection()
  const session = await getSession()
  if (session?.user?.role !== 'admin') notFound()
  return pageUser()
}
