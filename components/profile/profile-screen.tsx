'use client'

import { animate, motion, useInView } from 'framer-motion'
import { ArrowUpRight, Eye, Film, Flag, Globe, Link2, Pencil, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BadgeStar } from '@/components/badges/badge-star'
import { BrandIcon, type BrandName } from '@/components/brand-icon'
import { Avatar } from '@/components/shell/nav-user'
import { TransitionLink } from '@/components/shell/transition-link'
import { BADGE_BY_ID } from '@/lib/badges-defs'
import { EASE_OUT } from '@/lib/layout'
import { PROFILE_FONT_CLASS } from '@/lib/profile-fonts'
import { BANNER_PRESETS, LINK_PLATFORMS, type ProfileStats, type ProfileView } from '@/lib/profile-style'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { ProfileTheme } from './profile-theme'

const BRAND_ICONS = new Set(['tiktok', 'youtube', 'instagram', 'discord', 'twitch', 'x'])

export type ProfileLinkOut = { platform: string; href: string; label: string }

export function bannerStyle(kind: 'preset' | 'image', value: string): React.CSSProperties {
  if (kind === 'image') return { background: `center / cover no-repeat url(${value})` }
  return { background: BANNER_PRESETS.find((b) => b.id === value)?.css ?? BANNER_PRESETS[0].css }
}

function Count({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    const c = animate(0, to, { duration: 1.1, ease: EASE_OUT, onUpdate: (v) => setN(v) })
    return () => c.stop()
  }, [inView, to])
  return (
    <span ref={ref}>
      {prefix}
      {Math.round(n).toLocaleString('en-US')}
      {suffix}
    </span>
  )
}

export type ProfileScreenProps = {
  view: ProfileView
  stats: Partial<{ clips: number; views: number; earnedCents: number; campaigns: number }>
  links: ProfileLinkOut[]
  website: { href: string; host: string } | null
  isOwner: boolean
  preview?: boolean
}

/** The public profile. Also used, with `preview`, as the live preview inside the profile editor. */
export function ProfileScreen({ view, stats, links, website, isOwner, preview = false }: ProfileScreenProps) {
  const font = PROFILE_FONT_CLASS[view.font]
  const shownStats: { label: string; node: React.ReactNode; icon: React.ReactNode }[] = []
  if (stats.clips !== undefined) shownStats.push({ label: 'Clips', node: <Count to={stats.clips} />, icon: <Film className="size-4" /> })
  if (stats.views !== undefined) shownStats.push({ label: 'Views', node: <Count to={stats.views} />, icon: <Eye className="size-4" /> })
  if (stats.earnedCents !== undefined) shownStats.push({ label: 'Earned', node: <Count to={Math.floor(stats.earnedCents / 100)} prefix="$" />, icon: <span className="font-mono text-sm">$</span> })
  if (stats.campaigns !== undefined) shownStats.push({ label: 'Campaigns', node: <Count to={stats.campaigns} />, icon: <Link2 className="size-4" /> })
  const joined = new Date(view.joinedAt * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const badges = view.show.badges ? view.badges.map((id) => BADGE_BY_ID[id]).filter(Boolean) : []

  return (
    <div className={cn(font, 'relative')} style={{ ['--user-accent' as string]: view.accent }}>
      {!preview && <ProfileTheme dot={view.dotColor} />}

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
        className="group relative h-52 overflow-hidden rounded-[36px] border border-line-strong md:h-72 md:rounded-[48px]"
        style={bannerStyle(view.bannerKind, view.banner)}
      >
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
        <span
          aria-hidden="true"
          className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 transition-all duration-[1400ms] ease-out group-hover:left-full group-hover:opacity-100"
        />
      </motion.div>

      <div className="relative px-2 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT }}
          className="-mt-14 flex flex-wrap items-end gap-5 md:-mt-20"
        >
          <span className="rounded-full p-1.5" style={{ background: view.accent, boxShadow: `0 0 0 6px #000, 0 0 50px -8px ${view.accent}` }}>
            <Avatar src={view.avatar} name={view.displayName} size={128} className="border-0 text-5xl" />
          </span>
          <div className="min-w-0 flex-1 pb-2">
            <h1 className="flex flex-wrap items-center gap-3 text-4xl leading-[1.02] font-medium tracking-tight md:text-6xl">
              <span className="break-words">{view.displayName}</span>
              {view.isStaff && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 font-sans text-xs font-normal tracking-normal" style={{ color: view.accent }}>
                  <ShieldCheck className="size-3.5" /> logoless team
                </span>
              )}
            </h1>
            <p className="mt-1.5 font-mono text-sm text-mute">@{view.handle}</p>
          </div>
          {isOwner && !preview && (
            <TransitionLink href="/dashboard/profile" className="mb-2 inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 font-sans text-sm hover:bg-paper/10">
              <Pencil className="size-4" /> Edit profile
            </TransitionLink>
          )}
        </motion.div>

        {view.bio && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 max-w-2xl text-lg leading-relaxed text-paper/85">
            {view.bio}
          </motion.p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-sm text-mute">
          {view.show.joined && <span>Joined {joined}</span>}
          {view.show.country && view.country && <span className="font-mono">{view.country}</span>}
        </div>

        {shownStats.length > 0 && (
          <motion.ul
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } } }}
            className="mt-8 grid grid-cols-2 gap-3 font-sans md:grid-cols-4"
          >
            {shownStats.map((s) => (
              <motion.li
                key={s.label}
                variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } } }}
                className="rounded-[22px] border border-line bg-surface/80 p-4"
              >
                <p className="flex items-center gap-2 text-xs text-mute">
                  <span style={{ color: view.accent }}>{s.icon}</span>
                  {s.label}
                </p>
                <p className="mt-2 text-3xl font-medium tracking-tight">{s.node}</p>
              </motion.li>
            ))}
          </motion.ul>
        )}

        {badges.length > 0 && (
          <section aria-label="Badges" className="mt-10">
            <ul className="flex flex-wrap gap-3 md:gap-5">
              {badges.map((b, i) => (
                <motion.li
                  key={b.id}
                  initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5 + i * 0.09, type: 'spring', stiffness: 220, damping: 16 }}
                  whileHover={{ y: -4, rotate: 6 }}
                  title={`${b.name}: ${b.how}`}
                  className="flex w-[84px] flex-col items-center gap-1.5 text-center"
                >
                  <BadgeStar badge={b} size={84} />
                  <span className="font-sans text-[11px] leading-tight text-mute">{b.name}</span>
                </motion.li>
              ))}
            </ul>
          </section>
        )}

        {view.show.links && (links.length > 0 || website) && (
          <section aria-label="Links" className="mt-10 font-sans">
            <ul className="flex flex-wrap gap-2">
              {links.map((l) => (
                <li key={l.platform}>
                  <a
                    href={preview ? undefined : l.href}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    className="inline-flex h-11 items-center gap-2.5 rounded-full border border-line-strong px-5 text-sm transition-colors hover:bg-paper/10"
                    style={{ ['--tw-ring-color' as string]: view.accent }}
                  >
                    {BRAND_ICONS.has(l.platform) ? <BrandIcon name={l.platform as BrandName} /> : <Link2 className="size-4" />}
                    {l.label}
                    <ArrowUpRight className="size-3.5 text-mute" />
                  </a>
                </li>
              ))}
              {website && (
                <li>
                  <a
                    href={preview ? undefined : website.href}
                    rel="nofollow ugc"
                    className="inline-flex h-11 items-center gap-2.5 rounded-full border px-5 text-sm transition-colors hover:bg-paper/10"
                    style={{ borderColor: view.accent }}
                  >
                    <Globe className="size-4" style={{ color: view.accent }} />
                    {website.host}
                    <ArrowUpRight className="size-3.5 text-mute" />
                  </a>
                </li>
              )}
            </ul>
            <p className="mt-4 max-w-xl text-xs leading-relaxed text-mute">
              Links are added by this member. They are not official {SITE.name} links and we do not check or endorse them.{' '}
              <TransitionLink href="/legal/external-links" className="underline underline-offset-2 hover:text-paper">
                Learn more
              </TransitionLink>
            </p>
          </section>
        )}

        {!preview && !isOwner && (
          <p className="mt-14 font-sans text-xs text-mute">
            <a href={`mailto:${SITE.emails.abuse}?subject=${encodeURIComponent(`Report profile @${view.handle}`)}`} className="inline-flex items-center gap-1.5 hover:text-paper">
              <Flag className="size-3.5" /> Report this profile
            </a>
          </p>
        )}
      </div>
    </div>
  )
}

export { LINK_PLATFORMS }
