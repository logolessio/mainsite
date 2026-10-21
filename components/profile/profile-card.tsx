'use client'

import { animate, motion, useInView } from 'framer-motion'
import { BadgeCheck, CalendarDays, Flag, Pencil, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { BadgeStar } from '@/components/badges/badge-star'
import { BrandIcon } from '@/components/brand-icon'
import { Tilt3D } from '@/components/motion/tilt'
import { TransitionLink } from '@/components/shell/transition-link'
import { BADGE_BY_ID } from '@/lib/badges-defs'
import { EASE_OUT } from '@/lib/layout'
import { FONT_SCALE, PROFILE_FONT_CLASS } from '@/lib/profile-fonts'
import { BANNER_PRESETS, type ProfileView } from '@/lib/profile-style'
import { giphyImage, initialsOf, noiseLayer, tintHex } from '@/lib/profile-extras'
import { cn } from '@/lib/utils'
import { CardEffectLayer } from './card-effect'
import { ProfileTheme } from './profile-theme'

export type ProfileLinkOut = { platform: string; href: string; label: string; verified?: boolean }

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

/** The parts of the card the studio preview can open for editing. */
export type EditTarget = 'avatar' | 'banner' | 'card' | 'badges' | 'background' | 'name' | 'about' | 'privacy' | 'accounts'

export type ProfileCardProps = {
  view: ProfileView
  stats: Stats
  links: ProfileLinkOut[]
  isOwner: boolean
  preview?: boolean
  className?: string
  /** Show the profile studio choices (taller banners, GIFs, colour pictures, tints, text-effect controls). */
  studio?: boolean
  /** In the studio preview: a pencil on each part opens its controls. */
  onEdit?: (target: EditTarget) => void
}

/** Speed 0 to 100 as an animation-length multiplier: 50 is normal, 0 is about 2.5 times slower, 100 about 3 times faster. */
export const nameSpeed = (speed: number) => 2.5 * Math.pow(0.135, speed / 100)

function Pencil2({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={label}
      title={label}
      className={cn('grid size-9 place-items-center rounded-pill border border-white/25 bg-black/65 text-white shadow-[0_6px_18px_-6px_rgb(0_0_0/0.9)] backdrop-blur-md transition-all hover:scale-110 hover:bg-black/85 focus-visible:outline-2 focus-visible:outline-white', className)}
    >
      <Pencil className="size-4" />
    </button>
  )
}

/** In the studio, a part of the card that opens its own controls when it is clicked: it is outlined softly under the pointer. */
function Hot({ onEdit, target, label, as: Tag = 'div', className, children }: { onEdit?: (t: EditTarget) => void; target: EditTarget; label: string; as?: 'div' | 'span'; className?: string; children: React.ReactNode }) {
  if (!onEdit) return <>{children}</>
  return (
    <Tag
      role="button"
      tabIndex={0}
      aria-label={label}
      title={label}
      onClick={() => onEdit(target)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit(target)
        }
      }}
      className={cn('-mx-1.5 cursor-pointer rounded-chip px-1.5 outline outline-1 -outline-offset-1 outline-transparent transition-[outline-color,background-color] duration-200 hover:bg-white/[0.06] hover:outline-white/30 focus-visible:outline-white/60', Tag === 'span' && 'inline-block', className)}
    >
      {children}
    </Tag>
  )
}

/** A picture: an uploaded or ready-made image, a GIF, or a solid colour with initials, an emoji or nothing. */
export function AvatarFace({ view, studio, size = 96 }: { view: ProfileView; studio?: boolean; size?: number }) {
  const a = view.extras.avatar
  if (studio && a.kind === 'color') {
    return (
      <span className="relative grid size-full place-items-center overflow-hidden" style={{ background: a.color }}>
        {a.noise > 0 && <span aria-hidden="true" className="absolute inset-0" style={{ background: noiseLayer(a.noise), mixBlendMode: 'overlay' }} />}
        {a.glyph === 'emoji' && <span className="relative leading-none" style={{ fontSize: size * 0.46 }}>{a.emoji}</span>}
        {a.glyph === 'initials' && <span className="relative font-semibold tracking-tight text-white [text-shadow:0_1px_6px_rgb(0_0_0/0.35)]" style={{ fontSize: size * 0.36 }}>{initialsOf(view.displayName, view.handle)}</span>}
      </span>
    )
  }
  const src = studio && a.kind === 'gif' && a.gif ? giphyImage(a.gif) : view.avatar
  if (!src) return <span className="grid size-full place-items-center text-4xl font-medium">{view.displayName.trim()[0]?.toUpperCase() ?? '?'}</span>
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" className="size-full object-cover" />
}

/**
 * The profile, laid out like a Discord profile: banner, avatar with a status dot, a display name in a chosen font and
 * effect, badges, then an "About me" panel with member-since, stats and connections.
 */
export function ProfileCard({ view, stats, links, isOwner, preview = false, className, studio = false, onEdit }: ProfileCardProps) {
  const nameFont = PROFILE_FONT_CLASS[view.font]
  const scale = FONT_SCALE[view.font] ?? 'text-[1.7rem]'
  const joined = new Date(view.joinedAt * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const badges = view.show.badges ? view.badges.map((id) => BADGE_BY_ID[id]).filter(Boolean) : []
  const statRows: [string, React.ReactNode][] = []
  if (stats.clips !== undefined) statRows.push(['Submissions', <Count key="c" to={stats.clips} />])
  if (stats.views !== undefined) statRows.push(['Views', <Count key="v" to={stats.views} />])
  if (stats.earnedCents !== undefined) statRows.push(['Earned', <Count key="e" to={Math.floor(stats.earnedCents / 100)} prefix="$" />])
  if (stats.campaigns !== undefined) statRows.push(['Campaigns', <Count key="m" to={stats.campaigns} />])
  const showLinks = view.show.links && links.length > 0
  const ex = view.extras
  const nameVars = {
    ['--na' as string]: view.accent,
    ['--nb' as string]: view.accent2,
    ...(studio ? { ['--nx-i' as string]: String(ex.name.intensity / 50), ['--nx-sp' as string]: String(nameSpeed(ex.name.speed)), ['--nx-ang' as string]: `${ex.name.angle}deg` } : {}),
  }
  const tint = studio ? ex.effectTint : undefined
  const fxColors: [string, string] = tint ? [tintHex(view.accent, tint.color, tint.amount), tintHex(view.accent2, tint.color, tint.amount)] : [view.accent, view.accent2]
  const gifBanner = studio && ex.banner.gif
  const tallBanner = studio && (view.bannerKind === 'image' || gifBanner)
  const bannerCss: React.CSSProperties = gifBanner ? { background: `center / cover no-repeat url(${giphyImage(ex.banner.gif)}), #111` } : bannerStyle(view.bannerKind, view.banner)

  const card = (
    <motion.article
      aria-label={`${view.displayName}'s profile`}
      initial={false}
      className={cn('relative w-[min(440px,calc(100vw-2rem))] overflow-hidden rounded-card border border-white/10 text-paper shadow-[0_40px_90px_-30px_rgb(0_0_0/0.95),0_0_0_1px_rgb(0_0_0/0.4)]', className)}
      style={{
        ['--card' as string]: '#0f1012',
        background: `linear-gradient(165deg, color-mix(in srgb, ${view.accent} 34%, #101113) 0%, color-mix(in srgb, ${view.accent2} 24%, #0b0b0c) 100%)`,
      }}
    >
      <CardEffectLayer effect={view.cardEffect} intensity={view.effectIntensity} speed={view.effectSpeed} colors={fxColors} tint={tint} />

      {/* banner, 16 by 9 like the picture it was made from, with the avatar over its bottom edge */}
      <div className="relative">
      <div className={cn('relative overflow-hidden', !tallBanner && 'aspect-video')} style={{ ...bannerCss, ...(tallBanner ? { aspectRatio: `1 / ${ex.banner.aspect}` } : {}) }}>
        {studio && view.bannerKind === 'color' && !gifBanner && ex.banner.noise > 0 && <span aria-hidden="true" className="absolute inset-0" style={{ background: noiseLayer(ex.banner.noise), mixBlendMode: 'overlay' }} />}
        <span aria-hidden="true" className="absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent [animation:banner-sheen_7s_ease-in-out_1.2s_infinite]" />
      </div>
      {onEdit && <Pencil2 label="Edit banner" onClick={() => onEdit('banner')} className="absolute top-3 right-3 z-30" />}
      <motion.div
        initial={false}
        style={{ top: 'calc(100% - 48px)' }}
        className="absolute left-4 z-20"
      >
        <div className="relative size-[96px] rounded-pill ring-[7px] ring-[var(--card)]" style={{ boxShadow: `0 0 0 7px var(--card), 0 0 40px -6px ${view.accent}` }}>
          <div className="size-full overflow-hidden rounded-pill bg-raised">
            <AvatarFace view={view} studio={studio} />
          </div>
          {onEdit && <Pencil2 label="Edit profile picture" onClick={() => onEdit('avatar')} className="absolute -top-1 -right-2 z-10 size-8" />}
          {view.show.status && (
            <span
              title={view.online ? 'Online' : 'Offline'}
              className={cn('absolute right-0 bottom-0 size-6 rounded-pill border-[5px] border-[var(--card)]', view.online ? 'bg-[#23a55a]' : 'bg-[#80848e]')}
            >
              {view.online && <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-pill bg-[#23a55a]/60" />}
            </span>
          )}
        </div>
      </motion.div>
      </div>

      <div className="relative z-20 px-4 pt-[62px] pb-4">
        {onEdit && (
          <div className="absolute top-3 right-3 flex gap-2">
            <Pencil2 label="Edit card colours and effect" onClick={() => onEdit('card')} />
          </div>
        )}
        <h1 className="flex flex-wrap items-center gap-x-2.5 gap-y-1 leading-tight">
          <Hot onEdit={onEdit} target="name" label="Change your name, font and effect" as="span" className="min-w-0">
            <span
              style={nameVars}
              className={cn(nameFont, scale, 'min-w-0 break-words font-bold', `nx-${view.nameEffect}`)}
            >
              {view.displayName}
            </span>
          </Hot>
          {onEdit && (
            <button type="button" onClick={() => onEdit('badges')} className="inline-flex h-6 items-center gap-1 rounded-pill border border-dashed border-white/30 px-2 text-[11px] text-white/80 hover:bg-white/10">
              <Pencil className="size-3" /> Badges
            </button>
          )}
          {badges.length > 0 && (
            <span className="inline-flex items-center gap-1" aria-label="Badges">
              {badges.map((b) => (
                <span key={b.id} title={`${b.name}: ${b.how}`} className="inline-flex">
                  <BadgeStar badge={b} size={20} />
                </span>
              ))}
            </span>
          )}
          {view.isStaff && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-semibold tracking-wide" style={{ color: view.accent }}>
              <ShieldCheck className="size-3" /> Team
            </span>
          )}
        </h1>
        <Hot onEdit={onEdit} target="about" label="Change your username and pronouns" className="mt-0.5">
          <p className="text-sm text-paper/80">
            <span className="font-medium">{view.handle}</span>
            {view.pronouns ? <span className="text-paper/55"> · {view.pronouns}</span> : onEdit ? <span className="text-paper/40"> · add pronouns</span> : null}
          </p>
        </Hot>

        <motion.div
          initial={false}
          className="mt-4 grid gap-3.5 rounded-panel bg-black/40 p-3.5"
        >
          {(view.bio || onEdit) && (
            <Hot onEdit={onEdit} target="about" label="Change your bio">
              <Section title="About me">
                {view.bio ? <p className="text-sm leading-[1.4] whitespace-pre-wrap text-paper/90">{view.bio}</p> : <p className="text-sm text-paper/45">Write a short bio</p>}
              </Section>
            </Hot>
          )}

          {(view.show.joined || (view.show.country && view.country)) && (
            <Hot onEdit={onEdit} target="about" label="Change your country">
              <Section title="Member since">
                <p className="flex items-center gap-2 text-sm text-paper/90">
                  <CalendarDays className="size-4 text-paper/60" />
                  {view.show.joined ? joined : ''}
                  {view.show.country && view.country && <span className="ml-1 rounded-chip bg-white/10 px-1.5 font-mono text-[11px]">{view.country}</span>}
                </p>
              </Section>
            </Hot>
          )}

          {statRows.length > 0 && (
            <Hot onEdit={onEdit} target="privacy" label="Choose which numbers show">
            <Section title="Stats">
              <ul className="grid grid-cols-2 gap-1.5">
                {statRows.map(([label, node]) => (
                  <li key={label} className="rounded-chip bg-white/[0.06] px-3 py-2">
                    <p className="text-[11px] text-paper/55">{label}</p>
                    <p className="text-lg leading-tight font-semibold tabular-nums">{node}</p>
                  </li>
                ))}
              </ul>
            </Section>
            </Hot>
          )}

          {showLinks && (
            <Hot onEdit={onEdit} target="accounts" label="Change your accounts">
            <Section title="Creator accounts">
              <ul className="flex flex-wrap gap-2">
                {links.map((l) => {
                  const Tag = (preview ? 'span' : 'a') as 'a'
                  return (
                  <li key={l.platform}>
                    <Tag
                      {...(preview ? { role: 'img' } : { href: l.href, target: '_blank', rel: 'noopener noreferrer nofollow ugc' })}
                      aria-label={preview ? l.label : `${l.label}${l.verified ? ', verified' : ''} (opens in a new tab)`}
                      title={l.label}
                      className="group relative grid size-11 place-items-center overflow-hidden rounded-panel border border-white/[0.08] bg-white/[0.06] transition-all duration-200 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.14] active:scale-95"
                    >
                      <span aria-hidden="true" className="absolute inset-y-0 -left-full w-full -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-[220%]" />
                      <BrandIcon name={l.platform} className="relative size-5" />
                      {l.verified && (!studio || ex.privacy.verifiedTicks) && <BadgeCheck aria-hidden="true" className="absolute right-0.5 bottom-0.5 size-3.5 rounded-pill bg-black text-emerald-300" />}
                    </Tag>
                  </li>
                  )
                })}
              </ul>
            </Section>
            </Hot>
          )}

          {!onEdit && !view.bio && statRows.length === 0 && !showLinks && !view.show.joined && <p className="text-sm text-paper/55">Nothing to show yet.</p>}
        </motion.div>

        {isOwner && !preview && (
          <TransitionLink href="/dashboard/profile" className="mt-3 flex h-10 items-center justify-center gap-2 rounded-tile bg-white/[0.1] text-sm font-medium transition-colors hover:bg-white/[0.18]">
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
        // the whole tilt floats (not just the card inside it), so the light sweep that rides on the card floats with it
        <Tilt3D max={4.5} perspective={1600} className="animate-float rounded-card">
          {card}
        </Tilt3D>
      )}
      {!preview && !isOwner && (
        <a
          href={`/report?about=profile&ref=${encodeURIComponent(`@${view.handle}`)}`}
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
