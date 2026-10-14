import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { auth, authConfigured } from '@/auth'
import { db } from './db'
import { rolesForEmail } from './roles'

/**
 * The current session, or null. Never throws, so a missing secret cannot crash a page.
 * The roles come from the database (see lib/roles.ts), so a role the owner grants or takes away works at once.
 */
export async function getSession() {
  try {
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
