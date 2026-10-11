'use client'

import { ArrowUpRight, ChevronDown, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BrandIcon } from '@/components/brand-icon'
import { FavoriteButton } from '@/components/campaign/favorite-button'
import { usePreview } from '@/components/shell/preview-provider'
import { TransitionLink } from '@/components/shell/transition-link'
import type { Campaign } from '@/lib/campaigns'
import { cn } from '@/lib/utils'

const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
const compact = (n: number) => (n >= 1000 ? `$${(n / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k` : usd(n))

/** A full-screen, swipeable way to browse campaigns: one at a time, with the track playing. */
export function Reels({ campaigns }: { campaigns: Campaign[] }) {
  const scroller = useRef<HTMLDivElement>(null)
  const slides = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)
  const [sound, setSound] = useState(false)
  const { playingId, toggle, stop } = usePreview()
  const playing = useRef<string | null>(null)
  const retries = useRef(0)
  playing.current = playingId

  // The page is a fixed full-screen feed, so the document behind it must not scroll.
  useEffect(() => {
    const el = document.documentElement
    const prev = el.style.overflow
    el.style.overflow = 'hidden'
    return () => {
      el.style.overflow = prev
      stop()
    }
  }, [stop])

  // Which slide is on screen.
  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting && e.intersectionRatio >= 0.6) setActive(Number((e.target as HTMLElement).dataset.i))
      },
      { root, threshold: [0.6] },
    )
    slides.current.forEach((s) => s && io.observe(s))
    return () => io.disconnect()
  }, [campaigns.length])

  // With sound on, the track for the slide on screen plays; moving on plays the next one.
  useEffect(() => {
    retries.current = 0
  }, [active, sound])
  useEffect(() => {
    const c = campaigns[active]
    if (!c) return
    if (!sound) {
      if (playing.current) stop()
      return
    }
    if (playing.current === c.id) return
    if (retries.current++ > 2) return
    toggle(c.id, c.previewUrl)
  }, [active, sound, playingId, campaigns, toggle, stop])

  const go = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(campaigns.length - 1, i))
      slides.current[n]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [campaigns.length],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'PageDown') (e.preventDefault(), go(active + 1))
      else if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'PageUp') (e.preventDefault(), go(active - 1))
      else if (e.key === 'm') setSound((s) => !s)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, go])

  if (campaigns.length === 0)
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <h1 className="font-display text-4xl">No live campaigns yet</h1>
          <p className="mt-3 text-mute">Check back soon. New drops land here first.</p>
        </div>
      </main>
    )

  return (
    <div className="fixed inset-0 z-20 bg-ink">
      <div ref={scroller} className="h-dvh snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Campaigns" tabIndex={-1}>
        {campaigns.map((c, i) => (
          <Slide key={c.id} c={c} i={i} total={campaigns.length} on={i === active} near={Math.abs(i - active) <= 1} playing={playingId === c.id} onPlay={() => (setSound(true), toggle(c.id, c.previewUrl))} refEl={(el) => (slides.current[i] = el)} />
        ))}
      </div>

      {/* position dots */}
      <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2 md:flex">
        {campaigns.map((c, i) => (
          <button key={c.id} type="button" onClick={() => go(i)} aria-label={`Go to ${c.title}`} className="pointer-events-auto grid size-4 place-items-center">
            <span className={cn('block rounded-full bg-paper transition-all', i === active ? 'h-6 w-1.5' : 'size-1.5 opacity-30 hover:opacity-70')} />
          </button>
        ))}
      </div>

      {/* sound + hints */}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 flex items-end justify-between px-4 md:px-8">
        <button
          type="button"
          onClick={() => setSound((s) => !s)}
          aria-pressed={sound}
          className="glass-liquid pointer-events-auto inline-flex h-11 items-center gap-2 rounded-full px-4 text-sm"
        >
          {sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          {sound ? 'Sound on' : 'Tap for sound'}
        </button>
        <p className="hidden text-xs text-mute md:block">
          <kbd className="rounded border border-line px-1.5 py-0.5 font-mono">↑</kbd> <kbd className="rounded border border-line px-1.5 py-0.5 font-mono">↓</kbd> to move · <kbd className="rounded border border-line px-1.5 py-0.5 font-mono">M</kbd> sound
        </p>
      </div>
    </div>
  )
}

function Slide({ c, i, total, on, near, playing, onPlay, refEl }: { c: Campaign; i: number; total: number; on: boolean; near: boolean; playing: boolean; onPlay: () => void; refEl: (el: HTMLElement | null) => void }) {
  return (
    <section ref={refEl} data-i={i} aria-label={`${c.title} by ${c.creator}`} className="relative grid h-dvh snap-start snap-always place-items-center overflow-hidden px-5 pb-24 pt-24 md:px-16">
      {near && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={c.cover} alt="" aria-hidden className={cn('absolute inset-0 size-full scale-125 object-cover blur-3xl saturate-150 transition-opacity duration-700', on ? 'opacity-50' : 'opacity-0')} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink" />

      <div className={cn('relative z-10 flex w-full max-w-5xl flex-col items-center gap-7 transition-all duration-700 ease-out md:flex-row md:gap-16', on ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0')}>
        <button type="button" onClick={onPlay} aria-label={playing ? `Pause ${c.title}` : `Play ${c.title}`} className="group relative aspect-square w-[min(66vw,40dvh)] shrink-0 overflow-hidden rounded-[28px] border border-white/15 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] transition-transform duration-500 hover:scale-[1.02] md:w-[min(34vw,52dvh)] md:rounded-[36px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.cover} alt="" className={cn('size-full object-cover transition-transform duration-[2000ms]', playing && 'scale-110')} />
          <span className="absolute inset-0 grid place-items-center bg-black/0 transition-colors group-hover:bg-black/25">
            <span className={cn('grid size-16 place-items-center rounded-full bg-paper text-ink transition-all', playing ? 'scale-90 opacity-0 group-hover:opacity-100' : 'scale-100 opacity-95')}>
              {playing ? <Pause className="size-6 fill-ink" /> : <Play className="size-6 translate-x-0.5 fill-ink" />}
            </span>
          </span>
          {playing && <Equalizer />}
        </button>

        <div className="w-full max-w-md text-center md:text-left">
          <p className="flex items-center justify-center gap-3 font-mono text-xs text-mute md:justify-start">
            <span>{String(i + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
            <span className="h-px w-6 bg-line-strong" />
            <span>{c.type}</span>
          </p>
          <h2 className="mt-3 font-display text-5xl leading-[0.95] tracking-tight md:text-7xl">{c.title}</h2>
          <p className="mt-2 text-lg text-mute">{c.creator}</p>

          <div className="mt-6 flex items-end justify-center gap-6 md:justify-start">
            <p>
              <span className="font-display text-5xl leading-none md:text-6xl">{usd(c.ratePer1k)}</span>
              <span className="ml-2 text-sm text-mute">per 1K views</span>
            </p>
          </div>
          <p className="mt-3 text-sm text-mute">
            10K views earns about <span className="text-paper">{usd(c.ratePer1k * 10)}</span> · pool {compact(c.budget)}{c.endsOn ? ` · ends ${c.endsOn}` : ''}
          </p>

          <div className="mt-6 flex items-center justify-center gap-3 md:justify-start">
            <TransitionLink href={`/campaign/${c.id}`} className="group inline-flex h-12 items-center gap-2 rounded-full bg-paper px-6 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
              Clip this <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </TransitionLink>
            <FavoriteButton id={c.id} className="size-12" />
            <span className="ml-1 flex items-center gap-2 text-mute">
              {c.platforms.map((p) => (
                <BrandIcon key={p} name={p} className="size-4" />
              ))}
            </span>
          </div>
        </div>
      </div>

      {i === 0 && (
        <p className="pointer-events-none absolute bottom-24 left-1/2 flex -translate-x-1/2 animate-bounce items-center gap-1.5 text-xs text-mute md:bottom-8">
          Scroll <ChevronDown className="size-3.5" />
        </p>
      )}
    </section>
  )
}

/** Little bars that dance while a track plays. Pure CSS, no audio analysis. */
function Equalizer() {
  return (
    <span aria-hidden className="absolute bottom-3 left-3 flex h-5 items-end gap-0.5 rounded-full bg-black/55 px-2.5 py-1.5 backdrop-blur">
      {[0, 1, 2, 3].map((n) => (
        <span key={n} className="w-0.5 origin-bottom rounded-full bg-paper" style={{ height: '100%', animation: `reel-eq ${0.7 + n * 0.17}s ease-in-out ${n * 0.1}s infinite alternate` }} />
      ))}
    </span>
  )
}
