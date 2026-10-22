import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { ProfileCard, type ProfileLinkOut } from '@/components/profile/profile-card'
import { ProfileBackdrop } from '@/components/profile/profile-backdrop'
import { featureOn } from '@/lib/features'
import { Lock } from 'lucide-react'
import { Logo } from '@/components/logo'
import { TransitionLink } from '@/components/shell/transition-link'
import { db } from '@/lib/db'
import { profileByHandle, profileStats } from '@/lib/profile'
import { verifiedHandles } from '@/lib/bio-verify'
import { CLIPPING_PLATFORMS, LINK_PLATFORMS } from '@/lib/profile-style'
import { getSession } from '@/lib/session'

type Props = { params: Promise<{ handle: string }> }

const clean = (h: string) => decodeURIComponent(h).replace(/^@/, '')

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection()
  const p = await profileByHandle(clean((await params).handle)).catch(() => null)
  if (!p) return { title: 'Profile not found | logoless', robots: { index: false } }
  if (p.view.extras.privacy.profile !== 'public') return { title: `@${p.view.handle} | logoless`, robots: { index: false } }
  return {
    title: `${p.view.displayName} (@${p.view.handle}) | logoless`,
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

  // Privacy choices are always honoured, whether or not the newer profile features are switched on.
  const vis = p.view.extras.privacy.profile
  if (!isOwner && (vis === 'private' || (vis === 'members' && !session?.user?.email))) {
    return (
      <main className="relative grid min-h-dvh place-items-center px-4 py-24">
        <TransitionLink href="/" aria-label="logoless home" className="fixed top-5 left-5 z-50 block">
          <Logo />
        </TransitionLink>
        <div className="w-full max-w-sm rounded-card border border-line bg-[#0b0b0d] p-7 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-pill bg-white/[0.06]">
            <Lock className="size-5" />
          </span>
          <h1 className="mt-4 text-xl font-medium">@{p.view.handle}</h1>
          <p className="mt-2 text-sm text-mute">{vis === 'private' ? 'This profile is private.' : 'Sign in to logoless to see this profile.'}</p>
          {vis === 'members' && (
            <a href={`/login?next=${encodeURIComponent(`/@${p.view.handle}`)}`} className="mt-5 inline-flex h-10 items-center rounded-pill bg-paper px-5 text-sm font-medium text-ink hover:bg-paper/85">
              Sign in
            </a>
          )}
        </div>
      </main>
    )
  }

  const studio = await featureOn('profile-studio')
  const s = await profileStats(p.userId)
  const show = p.view.show
  const stats = {
    ...(show.clips ? { clips: s.clips } : {}),
    ...(show.views ? { views: s.views } : {}),
    ...(show.earnings ? { earnedCents: s.earnedCents } : {}),
    ...(show.campaigns ? { campaigns: s.campaigns } : {}),
  }

  const links: ProfileLinkOut[] = []
  const proven = show.links ? await verifiedHandles(p.userId, p.view.links) : {}
  // Only the accounts a member clips from, and only when they chose to show them.
  for (const l of p.view.links) {
    const meta = LINK_PLATFORMS.find((m) => m.id === l.platform)
    if (!meta || !CLIPPING_PLATFORMS.includes(l.platform) || p.view.extras.privacy.hiddenLinks.includes(l.platform)) continue
    links.push({ platform: l.platform, href: l.url, label: meta.label, verified: p.view.extras.privacy.verifiedTicks && Boolean((proven as Record<string, string>)[l.platform]) })
  }

  return (
    <main data-keep-theme className="relative grid min-h-dvh place-items-center bg-ink px-4 py-24">
      <TransitionLink href="/" aria-label="logoless home" className="fixed top-5 left-5 z-50 block">
        <Logo />
      </TransitionLink>
      {studio && <ProfileBackdrop bg={p.view.extras.bg} overlay={p.view.extras.overlay} color={p.view.dotColor} accents={[p.view.accent, p.view.accent2]} />}
      <div className="relative z-10">
        <ProfileCard view={p.view} stats={stats} links={links} isOwner={isOwner} studio={studio} />
      </div>
    </main>
  )
}
