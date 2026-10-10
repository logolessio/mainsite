import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { auth, authConfigured } from '@/auth'

/** The current session, or null. Never throws, so a missing secret cannot crash a page. */
export async function getSession() {
  try {
    return await auth()
  } catch {
    return null
  }
}

/**
 * Guard for private areas. Before Google is configured it lets everyone through (preview mode);
 * once configured it sends signed-out visitors to /login, and non-admins away from /admin.
 */
export async function requireSession(area: 'user' | 'admin' = 'user') {
  // Opt this route into per-request rendering. Without this, a build that has no secrets (like Cloudflare's)
  // sees no auth call, treats the private pages as static, and ships them with no login check at all.
  await connection()
  if (!authConfigured) return null
  const session = await getSession()
  if (!session?.user) redirect('/login')
  if (area === 'admin' && session.user.role !== 'admin') notFound()
  return session
}
