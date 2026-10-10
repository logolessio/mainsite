import { evaluateBadges } from '@/lib/badges'
import { db } from '@/lib/db'
import { json, route } from '@/lib/http'
import { unreadCount } from '@/lib/notify'
import { ensureProfile, toView } from '@/lib/profile'
import { recordSignup } from '@/lib/risk'
import { getSession } from '@/lib/session'
import { findOrCreateUser, touch } from '@/lib/user'

/**
 * What the top bar needs about the signed-in person. Signed-out visitors get { signedIn: false } and nothing else.
 * This is also where a brand new account gets its profile and its sign-up network check.
 */
export const GET = route(async (req: Request) => {
  const session = await getSession()
  const email = session?.user?.email
  if (!email) return json({ signedIn: false })

  const user = await findOrCreateUser(email, session.user?.name, session.user?.image)
  if (user.status === 'banned') return json({ signedIn: false })
  if (user.isNew) await recordSignup(user.id, req)
  const row = await ensureProfile(user)
  await touch(user)
  const d = await db()
  if (user.role !== (session.user?.role === 'admin' ? 'admin' : 'user')) {
    await d.prepare('UPDATE users SET role = ?2 WHERE id = ?1').bind(user.id, session.user?.role === 'admin' ? 'admin' : 'user').run()
  }
  if (user.isNew) await evaluateBadges(user.id)

  const view = toView(row, user.role === 'admin')
  return json({
    signedIn: true,
    isAdmin: session.user?.role === 'admin',
    restricted: user.status !== 'active',
    unread: await unreadCount(user.id),
    profile: {
      handle: view.handle,
      displayName: view.displayName,
      bio: view.bio,
      avatar: view.avatar ?? user.image ?? session.user?.image ?? null,
      banner: view.banner,
      bannerKind: view.bannerKind,
      accent: view.accent,
      badges: view.badges,
    },
  })
})
