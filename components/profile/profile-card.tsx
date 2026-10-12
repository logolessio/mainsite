'use client'

import { animate, motion, useInView } from 'framer-motion'
import { CalendarDays, Flag, Globe, Pencil, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BadgeStar } from '@/components/badges/badge-star'
import { BrandIcon } from '@/components/brand-icon'
import { Tilt3D } from '@/components/motion/tilt'
import { TransitionLink } from '@/components/shell/transition-link'
import { BADGE_BY_ID } from '@/lib/badges-defs'
import { EASE_OUT } from '@/lib/layout'
import { FONT_SCALE, PROFILE_FONT_CLASS } from '@/lib/profile-fonts'
import { BANNER_PRESETS, type ProfileView } from '@/lib/profile-style'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { CardEffectLayer } from './card-effect'
import { ProfileTheme } from './profile-theme'

export type ProfileLinkOut = { platform: string; href: string; label: string }

export function bannerStyle(kind: 'preset' | 'image' | 'color', value: string): React.CSSProperties {
  if (kind === 'image') return { background: `center / cover no-repeat url(${value})` }
  if (kind === 'color') return { background: value }
  return { background: BANNER_PRESETS.find((b) => b.id === value)?.css ?? BANNER_PRESETS[0].css }
}

function Count({ to, prefix = '' }: { to: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!inView) return
    const c = animate(0, to, { duration: 1.2, ease: EASE_OUT, onUpdate: (v) => setN(v) })
    return () => c.stop()
  }, [inView, to])
  return (
    <span ref={ref}>
      {prefix}
      {Math.round(n).toLocaleString('en-US')}
    </span>
  )
}

type Stats = Partial<{ clips: number; views: number; earnedCents: number; campaigns: number }>

export type ProfileCardProps = {
  view: ProfileView
  stats: Stats
  links: ProfileLinkOut[]
  isOwner: boolean
  preview?: boolean
  className?: string
}

/**
 * The profile, laid out like a Discord profile: banner, avatar with a status dot, a display name in a chosen font and
 * effect, badges, then an "About me" panel with member-since, stats and connections.
 */
export function ProfileCard({ view, stats, links, isOwner, preview = false, className }: ProfileCardProps) {
  const nameFont = PROFILE_FONT_CLASS[view.font]
  const scale = FONT_SCALE[view.font] ?? 'text-[1.7rem]'
  const joined = new Date(view.joinedAt * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const badges = view.show.badges ? view.badges.map((id) => BADGE_BY_ID[id]).filter(Boolean) : []
  const statRows: [string, React.ReactNode][] = []
  if (stats.clips !== undefined) statRows.push(['Clips', <Count key="c" to={stats.clips} />])
  if (stats.views !== undefined) statRows.push(['Views', <Count key="v" to={stats.views} />])
  if (stats.earnedCents !== undefined) statRows.push(['Earned', <Count key="e" to={Math.floor(stats.earnedCents / 100)} prefix="$" />])
  if (stats.campaigns !== undefined) statRows.push(['Campaigns', <Count key="m" to={stats.campaigns} />])
  const showLinks = view.show.links && links.length > 0
  const nameVars = { ['--na' as string]: view.accent, ['--nb' as string]: view.accent2 }

  const card = (
    <motion.article
      aria-label={`${view.displayName}'s profile`}
      initial={{ opacity: 0, y: 36, scale: 0.93, filter: 'blur(14px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.95, ease: EASE_OUT }}
      className={cn('relative w-[min(440px,calc(100vw-2rem))] overflow-hidden rounded-[22px] border border-white/10 text-paper shadow-[0_40px_90px_-30px_rgb(0_0_0/0.95),0_0_0_1px_rgb(0_0_0/0.4)]', className)}
      style={{
        ['--card' as string]: '#0f1012',
        background: `linear-gradient(165deg, color-mix(in srgb, ${view.accent} 34%, #101113) 0%, color-mix(in srgb, ${view.accent2} 24%, #0b0b0c) 100%)`,
      }}
    >
      <CardEffectLayer effect={view.cardEffect} intensity={view.effectIntensity} speed={view.effectSpeed} colors={[view.accent, view.accent2]} />

      {/* banner */}
      <div className="relative h-[136px] overflow-hidden" style={bannerStyle(view.bannerKind, view.banner)}>
        <span aria-hidden="true" className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent [animation:banner-sheen_7s_ease-in-out_1.2s_infinite]" />
      </div>

      {/* avatar, over the banner edge */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -14 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.25 }}
        className="absolute top-[88px] left-4 z-20"
      >
        <div className="relative size-[96px] rounded-full ring-[7px] ring-[var(--card)]" style={{ boxShadow: `0 0 0 7px var(--card), 0 0 40px -6px ${view.accent}` }}>
          <div className="size-full overflow-hidden rounded-full bg-raised">
            {view.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={view.avatar} alt="" width={96} height={96} referrerPolicy="no-referrer" className="size-full object-cover" />
            ) : (
              <span className="grid size-full place-items-center text-4xl font-medium">{view.displayName.trim()[0]?.toUpperCase() ?? '?'}</span>
            )}
          </div>
          {view.show.status && (
            <span
              title={view.online ? 'Online' : 'Offline'}
              className={cn('absolute right-0 bottom-0 size-6 rounded-full border-[5px] border-[var(--card)]', view.online ? 'bg-[#23a55a]' : 'bg-[#80848e]')}
            >
              {view.online && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full bg-[#23a55a]/60" />}
            </span>
          )}
        </div>
      </motion.div>

      {/* badges, on the right like Discord */}
      {badges.length > 0 && (
        <motion.ul
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.55 } } }}
          className="absolute top-[146px] right-3 z-20 flex max-w-[55%] flex-wrap justify-end gap-1 rounded-lg bg-black/45 px-1.5 py-1"
        >
          {badges.map((b) => (
            <motion.li
              key={b.id}
              variants={{ hidden: { scale: 0, rotate: -90 }, show: { scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 300, damping: 14 } } }}
              whileHover={{ scale: 1.3, rotate: 8 }}
              title={`${b.name}: ${b.how}`}
            >
              <BadgeStar badge={b} size={28} />
            </motion.li>
          ))}
        </motion.ul>
      )}

      <div className="relative z-20 px-4 pt-[62px] pb-4">
        <h1 className="flex flex-wrap items-center gap-x-2.5 gap-y-1 leading-tight">
          <span
            style={nameVars}
            className={cn(nameFont, scale, 'min-w-0 break-words font-bold', `nx-${view.nameEffect}`)}
          >
            {view.displayName}
          </span>
          {view.isStaff && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide" style={{ color: view.accent }}>
              <ShieldCheck className="size-3" /> Team
            </span>
          )}
        </h1>
        <p className="mt-0.5 text-sm text-paper/80">
          <span className="font-medium">{view.handle}</span>
          {view.pronouns && <span className="text-paper/55"> · {view.pronouns}</span>}
        </p>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.09, delayChildren: 0.45 } } }}
          className="mt-4 grid gap-3.5 rounded-xl bg-black/40 p-3.5"
        >
          {view.bio && (
            <Section title="About me">
              <p className="text-sm leading-[1.4] whitespace-pre-wrap text-paper/90">{view.bio}</p>
            </Section>
          )}

          {(view.show.joined || (view.show.country && view.country)) && (
            <Section title="Member since">
              <p className="flex items-center gap-2 text-sm text-paper/90">
                <CalendarDays className="size-4 text-paper/60" />
                {view.show.joined ? joined : ''}
                {view.show.country && view.country && <span className="ml-1 rounded bg-white/10 px-1.5 font-mono text-[11px]">{view.country}</span>}
              </p>
            </Section>
          )}

          {statRows.length > 0 && (
            <Section title="Stats">
              <ul className="grid grid-cols-2 gap-1.5">
                {statRows.map(([label, node]) => (
                  <li key={label} className="rounded-lg bg-white/[0.06] px-3 py-2">
                    <p className="text-[11px] text-paper/55">{label}</p>
                    <p className="text-lg leading-tight font-semibold tabular-nums">{node}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {showLinks && (
            <Section title="Connections">
              <ul className="flex flex-wrap gap-2">
                {links.map((l) => (
                  <li key={l.platform}>
                    <a
                      href={preview ? undefined : l.href}
                      target="_blank"
                      rel="noopener noreferrer nofollow ugc"
                      aria-label={l.label}
                      title={l.label}
                      className="group relative grid size-11 place-items-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.06] transition-all duration-200 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.14] active:scale-95"
                    >
                      <span aria-hidden="true" className="absolute inset-y-0 -left-full w-full -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-[220%]" />
                      {l.platform === 'website' ? <Globe className="relative size-5" /> : <BrandIcon name={l.platform} className="relative size-5" />}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-2.5 text-[11px] leading-snug text-paper/40">
                Added by this member, not official {SITE.name} links.{' '}
                <TransitionLink href="/legal/external-links" className="underline underline-offset-2 hover:text-paper">
                  Learn more
                </TransitionLink>
              </p>
            </Section>
          )}

          {!view.bio && statRows.length === 0 && !showLinks && !view.show.joined && <p className="text-sm text-paper/55">Nothing to show yet.</p>}
        </motion.div>

        {isOwner && !preview && (
          <TransitionLink href="/dashboard/profile" className="mt-3 flex h-10 items-center justify-center gap-2 rounded-lg bg-white/[0.1] text-sm font-medium transition-colors hover:bg-white/[0.18]">
            <Pencil className="size-4" /> Edit profile
          </TransitionLink>
        )}
      </div>
    </motion.article>
  )

  return (
    <div className="flex flex-col items-center">
      {!preview && <ProfileTheme dot={view.dotColor} />}
      {preview ? (
        card
      ) : (
        <Tilt3D max={4.5} perspective={1600} className="rounded-[22px]">
          <div className="animate-float">{card}</div>
        </Tilt3D>
      )}
      {!preview && !isOwner && (
        <a
          href={`mailto:${SITE.emails.abuse}?subject=${encodeURIComponent(`Report profile @${view.handle}`)}`}
          className="mt-8 inline-flex items-center gap-1.5 text-xs text-mute transition-colors hover:text-paper"
        >
          <Flag className="size-3" /> Report this profile
        </a>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.section variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } } }}>
      <h2 className="mb-1.5 text-[11px] font-bold text-paper/85">{title}</h2>
      {children}
    </motion.section>
  )
}
