import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { ProfileCard, type ProfileLinkOut } from '@/components/profile/profile-card'
import { Logo } from '@/components/logo'
import { TransitionLink } from '@/components/shell/transition-link'
import { db } from '@/lib/db'
import { externalHref, profileByHandle, profileStats } from '@/lib/profile'
import { LINK_PLATFORMS, WARN_PLATFORMS } from '@/lib/profile-style'
import { getSession } from '@/lib/session'

type Props = { params: Promise<{ handle: string }> }

const clean = (h: string) => decodeURIComponent(h).replace(/^@/, '')

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection()
  const p = await profileByHandle(clean((await params).handle)).catch(() => null)
  if (!p) return { title: 'Profile not found — logoless', robots: { index: false } }
  return {
    title: `${p.view.displayName} (@${p.view.handle}) — logoless`,
    description: p.view.bio || `${p.view.displayName} on logoless`,
    robots: { index: false }, // member pages are not for search engines to list
  }
}

/** A profile page is just the card, floating over the dots, with the logo in the corner. No menus, no footer. */
export default async function ProfilePage({ params }: Props) {
  await connection()
  const handle = clean((await params).handle)
  const p = await profileByHandle(handle).catch(() => null)
  if (!p) notFound()

  const session = await getSession()
  let isOwner = false
  if (session?.user?.email) {
    const d = await db()
    const me = await d.prepare('SELECT id FROM users WHERE email = ?1').bind(session.user.email.toLowerCase()).first<{ id: string }>()
    isOwner = me?.id === p.userId
  }

  const s = await profileStats(p.userId)
  const show = p.view.show
  const stats = {
    ...(show.clips ? { clips: s.clips } : {}),
    ...(show.views ? { views: s.views } : {}),
    ...(show.earnings ? { earnedCents: s.earnedCents } : {}),
    ...(show.campaigns ? { campaigns: s.campaigns } : {}),
  }

  const links: ProfileLinkOut[] = []
  for (const l of p.view.links) {
    const meta = LINK_PLATFORMS.find((m) => m.id === l.platform)
    if (!meta) continue
    // Websites, Discord invites and link hubs are the usual scam routes, so they open the warning page first.
    const href = WARN_PLATFORMS.includes(l.platform) ? await externalHref(l.url) : l.url
    links.push({ platform: l.platform, href, label: meta.label })
  }

  return (
    <main className="relative grid min-h-dvh place-items-center px-4 py-24">
      <TransitionLink href="/" aria-label="logoless home" className="fixed top-5 left-5 z-50 block">
        <Logo />
      </TransitionLink>
      <ProfileCard view={p.view} stats={stats} links={links} isOwner={isOwner} />
    </main>
  )
}
