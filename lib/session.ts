import type { Session } from 'next-auth'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { auth, authConfigured } from '@/auth'
import { APP_TOKEN, emailForAppToken } from './app-auth'
import { db } from './db'
import { rolesForEmail } from './roles'

/** A request from the Mac app carries `Authorization: Bearer lgl_...` instead of a cookie. undefined = not an app request, null = an app token that is not valid (any more). */
async function appSession() {
  let header: string | null
  try {
    header = (await headers()).get('authorization')
  } catch {
    return undefined // not inside a request
  }
  const m = /^Bearer (\S+)$/.exec(header ?? '')
  if (!m || !m[1].startsWith('lgl_')) return undefined // some other kind of bearer (a developer API key) is not ours to judge
  if (!APP_TOKEN.test(m[1])) return null
  const email = await emailForAppToken(m[1])
  if (!email) return null
  let name: string | null = null
  let image: string | null = null
  try {
    const u = await (await db()).prepare('SELECT name, image FROM users WHERE email = ?1').bind(email).first<{ name: string | null; image: string | null }>()
    name = u?.name ?? null
    image = u?.image ?? null
  } catch {
    /* the name is a convenience */
  }
  const roles = await rolesForEmail(email)
  return { user: { email, name, image, roles, role: roles.includes('admin') ? 'admin' : 'user' }, expires: new Date(Date.now() + 86400_000).toISOString() } as unknown as Session
}

/**
 * The current session, or null. Never throws, so a missing secret cannot crash a page.
 * The roles come from the database (see lib/roles.ts), so a role the owner grants or takes away works at once.
 */
export async function getSession() {
  try {
    const app = await appSession()
    if (app !== undefined) return app
    const session = await auth()
    if (!session?.user) return session
    const roles = await rolesForEmail(session.user.email)
    session.user.roles = roles
    session.user.role = roles.includes('admin') ? 'admin' : 'user'
    return session
  } catch (e) {
    console.error('getSession failed:', e instanceof Error ? `${e.name}: ${e.message}` : String(e))
    return null
  }
}

/**
 * Guard for private areas. Before Google is configured it lets everyone through (preview mode);
 * once configured it sends signed-out visitors to /login, and non-admins away from /admin.
 */
export async function requireSession(area: 'user' | 'admin' | 'dev' = 'user') {
  // Opt this route into per-request rendering. Without this, a build that has no secrets (like Cloudflare's)
  // sees no auth call, treats the private pages as static, and ships them with no login check at all.
  await connection()
  if (!authConfigured) return null
  const session = await getSession()
  if (!session?.user) redirect('/login')
  if (area === 'admin' && session.user.role !== 'admin') notFound()
  if (area === 'dev' && !session.user.roles?.includes('dev')) notFound()
  // Suspended and banned accounts cannot open the private areas at all.
  try {
    const d = await db()
    const u = await d.prepare('SELECT status FROM users WHERE email = ?1').bind((session.user.email ?? '').toLowerCase()).first<{ status: string }>()
    if (u && u.status !== 'active') redirect('/login?restricted=1')
  } catch (e) {
    if (isRedirectError(e)) throw e
    /* no database yet: fall through */
  }
  return session
}
