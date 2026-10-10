import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { ProfileScreen, type ProfileLinkOut } from '@/components/profile/profile-screen'
import { db } from '@/lib/db'
import { externalHref, profileByHandle, profileStats } from '@/lib/profile'
import { LINK_PLATFORMS } from '@/lib/profile-style'
import { getSession } from '@/lib/session'
import { CONTAINER } from '@/lib/layout'

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
    // Discord invites are the most common scam link, so they get the same warning page as websites.
    const href = l.platform === 'discord' ? await externalHref(l.url) : l.url
    links.push({ platform: l.platform, href, label: meta.label })
  }
  const website = p.view.website ? { href: await externalHref(p.view.website), host: new URL(p.view.website).hostname.replace(/^www\./, '') } : null

  return (
    <main className={`${CONTAINER} max-w-5xl pt-24 pb-32 md:pt-28`}>
      <ProfileScreen view={p.view} stats={stats} links={links} website={website} isOwner={isOwner} />
    </main>
  )
}
