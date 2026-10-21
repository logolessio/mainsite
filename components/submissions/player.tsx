'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, Eye, Heart, Loader2, MessageCircle, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { TransitionLink } from '@/components/shell/transition-link'
import { useDialog } from '@/hooks/use-dialog'
import type { FeedClip } from '@/lib/clip-feed'
import { EASE_OUT, SPRING_POP } from '@/lib/layout'
import { agoText } from '@/lib/time-ago'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { compact, Face, PLATFORM_LABEL, PlatformIcon, StarsAverage } from './bits'

type Rating = FeedClip['rating']

/**
 * Watching a clip: the platform's own player on the left (on a phone, on top), and everything about it beside it: who clipped it, for
 * which campaign, its numbers, and the stars. ← and → move through the feed, Escape closes.
 */
export function Player({ clip, onClose, onPrev, onNext, signedIn, me, onRated }: { clip: FeedClip | null; onClose: () => void; onPrev?: () => void; onNext?: () => void; signedIn: boolean; me: string | null; onRated: (id: string, r: Rating) => void }) {
  const open = clip !== null
  const box = useDialog<HTMLDivElement>(open, onClose, { initial: 'none' })
  // focus lands on the dialog without scrolling it (a plain focus() scrolls the tall phone layout past the close button),
  // and each clip starts at the top
  const id = clip?.id
  useEffect(() => {
    if (!id) return
    const t = window.setTimeout(() => {
      const el = box.current
      if (!el) return
      if (!el.contains(document.activeElement)) el.focus({ preventScroll: true })
      el.closest('[data-player-scroll]')?.scrollTo({ top: 0 })
    }, 30)
    return () => window.clearTimeout(t)
  }, [id, box])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      if (e.key === 'ArrowLeft' && onPrev) (e.preventDefault(), onPrev())
      if (e.key === 'ArrowRight' && onNext) (e.preventDefault(), onNext())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onPrev, onNext])

  // drawn at the top of the page, so the site's own bar (and any page wrapper with a transform) can never sit above it
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {clip && (
        <motion.div key="player" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} data-player-scroll className="fixed inset-0 z-[120] overflow-y-auto bg-black/80 backdrop-blur-md" onMouseDown={onClose}>
          <div className="flex min-h-full items-start justify-center p-0 md:items-center md:p-8">
            <motion.div
              ref={box}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={`${clip.by.name}'s clip for ${clip.campaign.title}`}
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              onMouseDown={(e) => e.stopPropagation()}
              className="relative grid w-full max-w-5xl overflow-hidden bg-[#0b0b0d] outline-none md:grid-cols-[auto_minmax(0,1fr)] md:rounded-card md:border md:border-white/10 md:shadow-[0_60px_140px_-40px_rgb(0_0_0/1)]"
            >
              <div className="absolute top-3 right-3 z-10">
                <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-pill bg-black/55 text-paper backdrop-blur-md transition-colors hover:bg-white/15">
                  <X className="size-5" />
                </button>
              </div>
              {/* a new clip (← and →) draws both halves afresh: the player loads again and the numbers rise in */}
              <Media key={`m-${clip.id}`} clip={clip} />
              <Side key={`s-${clip.id}`} clip={clip} signedIn={signedIn} own={me !== null && me === clip.by.handle} onRated={onRated} onClose={onClose} onPrev={onPrev} onNext={onNext} />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

function NavButton({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={!onClick} className="grid size-11 shrink-0 place-items-center rounded-pill border border-line-strong text-paper transition-all hover:bg-white/[0.08] active:scale-95 disabled:opacity-30">
      {children}
    </button>
  )
}

function Media({ clip }: { clip: FeedClip }) {
  const [ready, setReady] = useState(false)
  const frame = clip.tall ? 'aspect-[9/16] h-[min(72dvh,780px)] md:h-[min(84dvh,780px)] mx-auto' : 'aspect-video w-full md:w-[min(56vw,640px)] md:self-center'
  return (
    <div className="relative bg-black md:min-h-[min(84dvh,780px)] md:content-center">
      <div className={cn('relative overflow-hidden bg-black', frame)}>
        {clip.thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={clip.thumb} alt="" referrerPolicy="no-referrer" className={cn('absolute inset-0 size-full object-cover transition-opacity duration-500', ready ? 'opacity-0' : 'opacity-60 blur-sm')} />
        )}
        {clip.embed ? (
          <>
            {!ready && <Loader2 aria-hidden="true" className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2 animate-spin text-paper/70" />}
            <iframe
              src={clip.embed}
              title={clip.title ?? `${PLATFORM_LABEL[clip.platform]} clip`}
              onLoad={() => setReady(true)}
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className={cn('absolute inset-0 size-full border-0 transition-opacity duration-500', ready ? 'opacity-100' : 'opacity-0')}
            />
          </>
        ) : (
          <a href={clip.url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 grid place-items-center">
            <span className="inline-flex h-12 items-center gap-2 rounded-pill bg-paper px-5 text-sm font-medium text-ink">
              <PlatformIcon platform={clip.platform} /> Watch on {PLATFORM_LABEL[clip.platform]} <ArrowUpRight className="size-4" />
            </span>
          </a>
        )}
      </div>
    </div>
  )
}

function Side({ clip, signedIn, own, onRated, onClose, onPrev, onNext }: { clip: FeedClip; signedIn: boolean; own: boolean; onRated: (id: string, r: Rating) => void; onClose: () => void; onPrev?: () => void; onNext?: () => void }) {
  const stats = [
    { icon: Eye, label: 'Views', value: compact(clip.views) },
    { icon: Heart, label: 'Likes', value: clip.likes === null ? '–' : compact(clip.likes) },
    { icon: MessageCircle, label: 'Comments', value: clip.comments === null ? '–' : compact(clip.comments) },
    { icon: CalendarDays, label: 'Posted', value: clip.postedAt ? agoText(clip.postedAt) : agoText(clip.submittedAt) },
  ]
  return (
    <div className="flex min-w-0 flex-col gap-6 p-5 pb-8 md:p-8">
      <div className="flex items-center gap-3 pr-10">
        <Face src={clip.by.avatar} name={clip.by.name} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-medium">{clip.by.name}</p>
          <p className="truncate text-sm text-mute">@{clip.by.handle}</p>
        </div>
        <TransitionLink href={`/@${clip.by.handle}`} onClick={onClose} className="inline-flex h-9 shrink-0 items-center rounded-pill bg-paper px-4 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
          Profile
        </TransitionLink>
      </div>

      {clip.title && <p className="line-clamp-4 text-[15px] leading-relaxed text-paper/80">{clip.title}</p>}

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-2">
        {stats.map((s, i) => (
          <motion.li key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 + i * 0.05, ease: EASE_OUT }} className="rounded-2xl border border-line bg-white/[0.03] px-3.5 py-3">
            <span className="flex items-center gap-1.5 text-[11px] text-mute"><s.icon className="size-3.5" />{s.label}</span>
            <span className="mt-1 block font-mono text-lg tabular-nums">{s.value}</span>
          </motion.li>
        ))}
      </ul>

      <RateStars clip={clip} signedIn={signedIn} own={own} onRated={onRated} />

      <TransitionLink href={`/campaign/${clip.campaign.id}`} onClick={onClose} className="group flex items-center gap-3 rounded-2xl border border-line bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.07]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={clip.campaign.cover} alt="" className="size-12 shrink-0 rounded-panel object-cover" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-mute">Clipped for</span>
          <span className="block truncate text-[15px] group-hover:underline">{clip.campaign.title}</span>
          <span className="block truncate text-xs text-mute">{clip.campaign.creator}</span>
        </span>
        <ArrowUpRight className="size-4 text-mute transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </TransitionLink>

      <div className="mt-auto flex items-center gap-2">
        <NavButton label="Previous clip (←)" onClick={onPrev}><ChevronLeft className="size-5" /></NavButton>
        <a href={clip.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-pill border border-line-strong px-4 text-sm transition-colors hover:bg-white/[0.06]">
          <PlatformIcon platform={clip.platform} /> <span className="truncate">Open on {PLATFORM_LABEL[clip.platform] ?? 'the platform'}</span> <ArrowUpRight className="size-4 shrink-0" />
        </a>
        <NavButton label="Next clip (→)" onClick={onNext}><ChevronRight className="size-5" /></NavButton>
      </div>
    </div>
  )
}

/** Five stars. Signed-in visitors rate once (pressing again changes it, pressing your own rating takes it back). Not on your own clip. */
function RateStars({ clip, signedIn, own, onRated }: { clip: FeedClip; signedIn: boolean; own: boolean; onRated: (id: string, r: Rating) => void }) {
  const [hover, setHover] = useState(0)
  const [busy, setBusy] = useState(false)
  const [pop, setPop] = useState(0)
  const mine = clip.rating.mine ?? 0
  const can = signedIn && !own
  const shown = hover || mine

  const rate = async (n: number) => {
    if (!can || busy) return
    const stars = n === mine ? 0 : n
    const before = clip.rating
    // the stars move at once; the server's answer settles the average
    const count = before.count + (before.mine ? 0 : 1) - (stars === 0 && before.mine ? 1 : 0)
    const total = before.avg * before.count - (before.mine ?? 0) + stars
    onRated(clip.id, { mine: stars || null, count, avg: count ? Math.round((total / count) * 10) / 10 : 0 })
    setPop(stars)
    setBusy(true)
    try {
      const res = await fetch('/api/clips/rate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: clip.id, stars }) })
      const j = (await res.json()) as { rating?: Rating; error?: string }
      if (!res.ok || !j.rating) throw new Error(j.error ?? 'Could not save your rating.')
      onRated(clip.id, j.rating)
      if (stars) toast.ok(`Rated ${stars} star${stars === 1 ? '' : 's'}`)
    } catch (e) {
      onRated(clip.id, before)
      toast.error(e instanceof Error ? e.message : 'Could not save your rating.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-sm">{own ? 'Your clip' : mine ? 'Your rating' : 'Rate this clip'}</p>
        <p className="flex items-center gap-2 font-mono text-xs text-mute tabular-nums">
          {clip.rating.count > 0 ? (
            <>
              <StarsAverage avg={clip.rating.avg} size={11} />
              {clip.rating.avg.toFixed(1)} · {clip.rating.count} rating{clip.rating.count === 1 ? '' : 's'}
            </>
          ) : (
            'No ratings yet'
          )}
        </p>
      </div>
      <div role="radiogroup" aria-label="Your rating" className="mt-3 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <motion.button
            key={n}
            type="button"
            role="radio"
            aria-checked={mine === n}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
            disabled={!can || busy}
            onMouseEnter={() => can && setHover(n)}
            onFocus={() => can && setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => rate(n)}
            whileTap={can ? { scale: 0.8 } : undefined}
            animate={pop && n <= pop ? { scale: [1, 1.35, 1], rotate: [0, -12, 0] } : { scale: 1, rotate: 0 }}
            transition={pop && n <= pop ? { duration: 0.45, delay: (n - 1) * 0.05, ease: EASE_OUT } : SPRING_POP}
            onAnimationComplete={() => n === pop && setPop(0)}
            className={cn('grid size-10 place-items-center rounded-panel outline-none transition-colors focus-visible:ring-2 focus-visible:ring-paper/60', can ? 'cursor-pointer hover:bg-white/[0.06]' : 'cursor-default')}
          >
            <Star className={cn('size-7 transition-colors duration-200', n <= shown ? 'fill-paper text-paper' : 'fill-transparent text-white/25')} strokeWidth={1.5} />
          </motion.button>
        ))}
        {busy && <Loader2 aria-hidden="true" className="ml-2 size-4 animate-spin text-mute" />}
      </div>
      {!signedIn && (
        <p className="mt-3 text-xs text-mute">
          <TransitionLink href="/login?next=/submissions" className="text-paper underline underline-offset-2">Log in</TransitionLink> to rate clips. One rating each.
        </p>
      )}
      {signedIn && !own && mine > 0 && <p className="mt-3 text-xs text-mute">Press a star to change your rating, or the same one to take it back.</p>}
      {own && <p className="mt-3 text-xs text-mute">Other people rate your clips. You can’t rate your own.</p>}
    </div>
  )
}
