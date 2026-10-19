'use client'

import { animate, AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BadgeArt } from '@/components/badges/badge-art'
import { Confetti } from '@/components/invite/bits'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { BADGE_BY_ID } from '@/lib/badges-defs'
import { EASE_OUT } from '@/lib/layout'
import type { Recap } from '@/lib/recap'
import { cn } from '@/lib/utils'

const SLIDE_MS = 6500
const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** A number that counts up from zero when its slide appears. */
function Num({ to, format }: { to: number; format: (n: number) => string }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const c = animate(0, to, { duration: 1.4, ease: EASE_OUT, onUpdate: setV })
    return () => c.stop()
  }, [to])
  return <span className="tabular-nums">{format(v)}</span>
}

function comparison(views: number) {
  if (views >= 20000) return `That is ${Math.floor(views / 20000).toLocaleString()} sold-out arena${views >= 40000 ? 's' : ''} of people.`
  if (views >= 500) return `That is ${Math.floor(views / 500).toLocaleString()} packed club${views >= 1000 ? 's' : ''} watching.`
  return 'Every one of them is a person who stopped scrolling.'
}

type Slide = { id: string; hue: number; body: React.ReactNode }

function buildSlides(r: Recap): Slide[] {
  const since = r.sinceSec ? new Date(r.sinceSec * 1000).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : null
  if (r.clips === 0)
    return [
      {
        id: 'empty',
        hue: 262,
        body: (
          <>
            <Kicker>Your recap</Kicker>
            <Big>Your story starts with one submission.</Big>
            <Sub>Pick a campaign you would actually make content for, post it, and come back. This page fills in as you earn.</Sub>
            <Cta href="/">Find a campaign</Cta>
          </>
        ),
      },
    ]
  const rate = r.clips ? Math.round((r.approved / r.clips) * 100) : 0
  const slides: Slide[] = [
    {
      id: 'intro',
      hue: 262,
      body: (
        <>
          <Kicker>Your recap</Kicker>
          <Big>{r.name}, here is your creator story.</Big>
          {since && <Sub>Since {since}</Sub>}
        </>
      ),
    },
    {
      id: 'earned',
      hue: 152,
      body: (
        <>
          <Kicker>You earned</Kicker>
          <Huge>
            <Num to={r.earnedCents} format={usd} />
          </Huge>
          <Sub>{r.earnedCents > 0 ? 'From posting other people’s music, streams and brands. That is the whole job.' : 'Approved submissions turn into earnings here.'}</Sub>
        </>
      ),
    },
    {
      id: 'views',
      hue: 205,
      body: (
        <>
          <Kicker>Your submissions were watched</Kicker>
          <Huge>
            <Num to={r.views} format={(n) => Math.round(n).toLocaleString()} />
          </Huge>
          <Sub>{comparison(r.views)}</Sub>
        </>
      ),
    },
    {
      id: 'clips',
      hue: 28,
      body: (
        <>
          <Kicker>You posted</Kicker>
          <Huge>
            <Num to={r.clips} format={(n) => String(Math.round(n))} />
          </Huge>
          <Sub>{r.clips === 1 ? 'submission' : 'submissions'}, and {r.approved} {r.approved === 1 ? 'was' : 'were'} approved.</Sub>
          <Ring pct={rate} />
        </>
      ),
    },
  ]
  if (r.top)
    slides.push({
      id: 'top',
      hue: 330,
      body: (
        <>
          <Kicker>Your biggest campaign</Kicker>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.top.cover} alt="" className="mx-auto mt-6 size-44 rounded-[calc(28px*var(--round,1))] border border-white/15 object-cover shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] md:size-56" />
          <Big small>{r.top.title}</Big>
          <Sub>
            {r.top.creator} · {usd(r.top.earnedCents)} earned · {r.top.views.toLocaleString()} views
          </Sub>
        </>
      ),
    })
  if (r.best)
    slides.push({
      id: 'best',
      hue: 46,
      body: (
        <>
          <Kicker>Your best submission</Kicker>
          <Huge>
            <Num to={r.best.views} format={(n) => Math.round(n).toLocaleString()} />
          </Huge>
          <Sub>views on {r.best.platform === 'youtube' ? 'YouTube' : r.best.platform === 'instagram' ? 'Instagram' : 'TikTok'}, for {r.best.title}.</Sub>
        </>
      ),
    })
  if (r.badgeCount > 0)
    slides.push({
      id: 'badges',
      hue: 282,
      body: (
        <>
          <Kicker>You unlocked</Kicker>
          <Huge>
            <Num to={r.badgeCount} format={(n) => String(Math.round(n))} />
          </Huge>
          <Sub>{r.badgeCount === 1 ? 'badge' : 'badges'} so far.</Sub>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            {r.badges.map((id) => BADGE_BY_ID[id] && <BadgeArt key={id} badge={BADGE_BY_ID[id]} size={72} />)}
          </div>
        </>
      ),
    })
  slides.push({
    id: 'outro',
    hue: 262,
    body: (
      <>
        <Kicker>That is the story so far</Kicker>
        <Big>Keep going.</Big>
        <Sub>The next campaign is already live.</Sub>
        <Cta href="/">Find a campaign</Cta>
        <a href="/dashboard" className="mt-3 block text-sm text-mute underline underline-offset-4 hover:text-paper">
          Back to my dashboard
        </a>
      </>
    ),
  })
  return slides
}

const Kicker = ({ children }: { children: React.ReactNode }) => <p className="text-xs text-mute">{children}</p>
const Big = ({ children, small }: { children: React.ReactNode; small?: boolean }) => <h1 className={cn('mx-auto mt-5 max-w-3xl font-display leading-[1] tracking-tight', small ? 'text-4xl md:text-6xl' : 'text-5xl md:text-7xl')}>{children}</h1>
const Huge = ({ children }: { children: React.ReactNode }) => <p className="mt-4 font-display text-[18vw] leading-[0.9] tracking-tight md:text-[10rem]">{children}</p>
const Sub = ({ children }: { children: React.ReactNode }) => <p className="mx-auto mt-5 max-w-md text-lg text-paper/65">{children}</p>
const Cta = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} className="group mt-9 inline-flex h-14 items-center gap-2 rounded-pill bg-paper px-8 text-base font-medium text-ink transition-colors hover:bg-paper/85">
    {children} <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
  </a>
)

function Ring({ pct }: { pct: number }) {
  const r = 44
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 110 110" className="mx-auto mt-8 size-32" aria-label={`${pct}% approved`} role="img">
      <circle cx="55" cy="55" r={r} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="8" />
      <motion.circle cx="55" cy="55" r={r} fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct / 100) }} transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.3 }} transform="rotate(-90 55 55)" />
      <text x="55" y="61" textAnchor="middle" className="fill-current font-display text-[22px]">{pct}%</text>
    </svg>
  )
}

/** A full-screen story of what the clipper has done, with a progress bar per slide. Tap, swipe or use the arrow keys. */
export function RecapStory({ recap }: { recap: Recap }) {
  const router = useRouter()
  const { reduced } = useMotionPrefs()
  const slides = useRef(buildSlides(recap)).current
  const [i, setI] = useState(0)
  const [held, setHeld] = useState(false)
  const bar = useRef<HTMLDivElement>(null)
  const last = i === slides.length - 1
  const close = useCallback(() => router.push('/dashboard'), [router])
  const go = useCallback((n: number) => setI((c) => Math.max(0, Math.min(slides.length - 1, n === c ? c : n))), [slides.length])

  // auto-advance, paused while the screen is held, and never on the last slide or with reduced motion
  useEffect(() => {
    if (reduced || last || held) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / SLIDE_MS)
      if (bar.current) bar.current.style.width = `${p * 100}%`
      if (p >= 1) return setI((c) => Math.min(slides.length - 1, c + 1))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [i, held, last, reduced, slides.length])
  useEffect(() => {
    if (bar.current) bar.current.style.width = reduced || last ? '100%' : '0%'
  }, [i, reduced, last])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') (e.preventDefault(), go(i + 1))
      else if (e.key === 'ArrowLeft') (e.preventDefault(), go(i - 1))
      else if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [i, go, close])

  const s = slides[i]
  return (
    <div className="fixed inset-0 z-[90] overflow-hidden bg-ink text-paper" role="dialog" aria-label="Your recap">
      <AnimatePresence mode="wait">
        <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }} className="absolute inset-0" style={{ background: `radial-gradient(120% 80% at 50% 0%, hsl(${s.hue} 70% 22% / 0.9), transparent 62%), radial-gradient(90% 60% at 50% 110%, hsl(${(s.hue + 50) % 360} 70% 18% / 0.7), transparent 60%)` }} />
      </AnimatePresence>
      {s.id === 'outro' && !reduced && <Confetti count={60} />}

      {/* tap zones */}
      <button type="button" aria-label="Previous" className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-w-resize" onClick={() => go(i - 1)} onPointerDown={() => setHeld(true)} onPointerUp={() => setHeld(false)} onPointerLeave={() => setHeld(false)} />
      <button type="button" aria-label="Next" className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-e-resize" onClick={() => go(i + 1)} onPointerDown={() => setHeld(true)} onPointerUp={() => setHeld(false)} onPointerLeave={() => setHeld(false)} />

      <AnimatePresence mode="wait">
        <motion.div key={s.id} initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.5, ease: EASE_OUT }} className="pointer-events-none absolute inset-0 z-20 grid place-items-center px-6 text-center">
          <div className="pointer-events-auto max-w-4xl [&_a]:pointer-events-auto">{s.body}</div>
        </motion.div>
      </AnimatePresence>

      {/* progress + close */}
      <div className="absolute inset-x-0 top-0 z-30 px-4 pt-4 md:px-8 md:pt-6">
        <div className="flex gap-1.5">
          {slides.map((x, n) => (
            <div key={x.id} className="h-1 flex-1 overflow-hidden rounded-pill bg-white/20">
              {/* distinct keys: the running bar's width is set by hand, so it must never be reused as a finished bar (it would keep a stale width) */}
              {n < i || (n === i && (reduced || last)) ? <div key="done" className="h-full w-full rounded-[inherit] bg-paper" /> : n === i ? <div key="now" ref={bar} className="h-full w-0 rounded-[inherit] bg-paper" /> : null}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-xs text-paper/60">logoless · recap</span>
          <button type="button" onClick={close} aria-label="Close recap" className="pointer-events-auto grid size-10 place-items-center rounded-pill bg-black/40 backdrop-blur hover:bg-black/60">
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
