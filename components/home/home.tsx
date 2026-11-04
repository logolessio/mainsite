'use client'

import '@/components/editor/editor.css'
import { AnimatePresence, type MotionValue, motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, Check, Loader2, X } from 'lucide-react'
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { CREAM, HARD, HEART, INK, JACKAL, MeshField, Mountains, Pixels, Say, SpeckFilter, Win, useMap } from '@/components/art/game'
import { BioPage } from '@/components/bio/bio-page'
import type { BioPageData } from '@/components/bio/context'
import { ShaderRunner, type ShaderId } from '@/components/bio/gl'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { BIO_SHADERS, LAYOUTS } from '@/lib/bio'
import { CURSORS, cursorCss, cursorSvg } from '@/lib/bio-cursors'
import { cn } from '@/lib/utils'
import { type SampleId, SAMPLES } from './samples'

const EASE = [0.2, 0.8, 0.2, 1] as const
/** A value that never moves (the music level of a page that has none). */
const useQuiet = () => useMotionValue(0)

/** The pointer over a box, -1 to 1 from its middle, smoothed. */
function usePointer(ref: React.RefObject<HTMLElement | null>) {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const px = useSpring(mx, { stiffness: 70, damping: 20, mass: 0.7 })
  const py = useSpring(my, { stiffness: 70, damping: 20, mass: 0.7 })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = el.getBoundingClientRect()
      mx.set(((e.clientX - r.left) / r.width - 0.5) * 2)
      my.set(((e.clientY - r.top) / r.height - 0.5) * 2)
    }
    el.addEventListener('pointermove', move)
    return () => el.removeEventListener('pointermove', move)
  }, [ref, mx, my])
  return { px, py }
}

/* ------------------------------------------------------------------ a page in a phone */

function Phone({ id, width = 260, className, style }: { id: SampleId; width?: number; className?: string; style?: CSSProperties }) {
  const data: BioPageData = SAMPLES[id]
  const k = width / 390
  return (
    <div aria-hidden="true" className={cn('relative shrink-0 overflow-hidden border border-white/30 bg-black shadow-[0_50px_140px_rgb(0_0_0/0.85)]', className)} style={{ width, height: 844 * k, ...style }}>
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: 390, height: 844, transform: `scale(${k})` }}>
        <BioPage mode="mini" data={data} />
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]" />
    </div>
  )
}

/* ------------------------------------------------------------------ claim a name */

type Avail = null | 'checking' | { ok: boolean; message: string }
export function ClaimBar({ big = false, light = false }: { big?: boolean; light?: boolean }) {
  const [v, setV] = useState('')
  const [avail, setAvail] = useState<Avail>(null)
  useEffect(() => {
    const h = v.trim().toLowerCase()
    if (!h) return setAvail(null)
    setAvail('checking')
    const ctl = new AbortController()
    const t = window.setTimeout(() => {
      fetch(`/api/bio/check?h=${encodeURIComponent(h)}`, { signal: ctl.signal, cache: 'no-store' })
        .then((r) => r.json())
        .then((j: { available?: boolean; message?: string }) => setAvail({ ok: j.available === true, message: j.message ?? '' }))
        .catch(() => undefined)
    }, 280)
    return () => {
      ctl.abort()
      window.clearTimeout(t)
    }
  }, [v])
  const go = () => {
    const h = v.trim().toLowerCase().replace(/^@/, '')
    window.location.href = `/signup${h ? `?claim=${encodeURIComponent(h)}` : ''}`
  }
  const ink = light ? 'text-black' : 'text-white'
  const mute = light ? 'text-black/45' : 'text-white/45'
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        go()
      }}
      className="w-full"
    >
      <div className={cn('flex w-full items-center border pl-4 transition-colors', light ? 'border-black/50 bg-transparent focus-within:border-black' : 'border-white/85 bg-[#0c1544] focus-within:border-white', big ? 'h-[4rem] pl-5' : 'h-[3rem]')}>
        <span className={cn('select-none', mute, big ? 'text-[1.05rem]' : 'text-[0.86rem]')}>logoless.io/</span>
        <input
          value={v}
          onChange={(e) => setV(e.target.value.toLowerCase().replace(/[^a-z0-9._\-~!$*+=]/g, '').slice(0, 30))}
          placeholder="yourname"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label="the name you want"
          className={cn('min-w-0 flex-1 bg-transparent outline-none', ink, light ? 'placeholder:text-black/25' : 'placeholder:text-white/25', big ? 'text-[1.05rem]' : 'text-[0.86rem]')}
        />
        <span className="mr-2 grid size-7 place-items-center" aria-live="polite">
          {avail === 'checking' ? <Loader2 className={cn('size-4 animate-spin', mute)} /> : avail ? avail.ok ? <Check className={cn('size-4', ink)} /> : <X className={cn('size-4', mute)} /> : null}
        </span>
        <button type="submit" className={cn('btn h-full border-0 px-5', light ? 'bg-black text-white hover:bg-transparent hover:text-black' : 'btn-solid')}>
          claim <ArrowRight className="size-3.5" />
        </button>
      </div>
      <p className={cn('mt-3 h-5 text-[0.74rem]', mute)}>{avail && avail !== 'checking' ? (avail.ok ? `logoless.io/${v.trim().toLowerCase()} is free. it's yours if you want it.` : avail.message.toLowerCase()) : 'one letter is fine. dots and dashes too.'}</p>
    </form>
  )
}

/* ------------------------------------------------------------------ the look: soft colour fields with speckle, a pixel game HUD, retro windows */

/** The colour fields, drifting as the page scrolls. */
function FixedMesh() {
  const { scrollYProgress } = useScroll()
  return <MeshField at={scrollYProgress} />
}

/** The game screen laid over the page: a health bar for how far you are, hearts, rails down the sides, a dialogue line at the bottom and two buttons. */
function Hud() {
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll()
  const [pct, setPct] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (v) => setPct(Math.max(0, Math.min(1, v))))
  const [line, setLine] = useState('')
  const [shown, setShown] = useState('')
  const [scenes, setScenes] = useState({ at: 0, of: 0 })
  useEffect(() => {
    let raf = 0
    const read = () => {
      raf = 0
      const els = [...document.querySelectorAll<HTMLElement>('[data-say]')]
      let k = 0
      els.forEach((el, i) => {
        if (el.getBoundingClientRect().top <= window.innerHeight * 0.55) k = i
      })
      setLine(els[k]?.dataset.say ?? '')
      setScenes({ at: k + 1, of: els.length })
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(read)
    }
    read()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])
  useEffect(() => {
    if (reduced) return setShown(line)
    setShown('')
    let i = 0
    const id = window.setInterval(() => {
      i++
      setShown(line.slice(0, i))
      if (i >= line.length) window.clearInterval(id)
    }, 22)
    return () => window.clearInterval(id)
  }, [line, reduced])
  const hearts = Math.max(1, Math.ceil(pct * 5))
  return (
    <>
      <header className="fixed top-4 left-4 z-50 flex border border-white/80 text-[0.7rem] tracking-[0.08em] uppercase md:top-5 md:left-5" style={{ background: `${INK}d9` }}>
        {[['how it works', '#story'], ['layouts', '#layouts'], ['backgrounds', '#backgrounds'], ['cursors', '#cursors']].map(([n, h], i, a) => (
          <a key={h} href={h} className={cn('pix px-3.5 py-2.5 text-white transition-colors hover:bg-white hover:text-[#0c1544]', i < a.length - 1 && 'border-r border-white/80', i >= 2 && 'hidden sm:block', i === 3 && 'hidden md:block')}>
            {n}
          </a>
        ))}
      </header>
      <div aria-hidden="true" className="pix pointer-events-none fixed top-[4.2rem] left-4 z-40 md:top-[4.7rem] md:left-5">
        <div className="h-2.5 w-24 border border-white/85 md:w-32" style={{ background: `${INK}b3` }}>
          <div className="h-full bg-white" style={{ width: `${pct * 100}%` }} />
        </div>
        <p className="mt-1.5 flex items-center gap-2 text-[0.6rem] tracking-[0.1em] text-white/90 uppercase">
          <span className="grid size-3 place-items-center border border-white/85 text-[0.5rem] leading-none">+</span>
          level {String(scenes.at).padStart(2, '0')}/{String(scenes.of).padStart(2, '0')}
        </p>
      </div>
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 md:top-5 md:right-5">
        <div aria-hidden="true" className="pointer-events-none mr-1 hidden gap-1 xl:flex">
          {Array.from({ length: 5 }, (_, i) => (
            <Pixels key={i} rows={HEART} fill={i < hearts ? '#fff' : `${INK}`} className={cn('size-[1.1rem]', i < hearts ? 'text-white' : 'opacity-70')} />
          ))}
        </div>
        <a href="/login" className="pix hidden h-10 items-center border border-white/80 px-4 text-[0.7rem] tracking-[0.08em] text-white uppercase transition-colors hover:bg-white hover:text-[#0c1544] sm:inline-flex" style={{ background: `${INK}b3` }}>
          log in
        </a>
        <a href="/signup" className="pix inline-flex h-10 items-center border border-[#f4ead6] bg-[#f4ead6] px-4 text-[0.7rem] tracking-[0.08em] text-[#0c1544] uppercase transition-colors hover:bg-white">
          get started
        </a>
      </div>
      <div aria-hidden="true" className="pointer-events-none fixed inset-y-[18vh] left-[2.6vw] z-30 hidden w-px bg-white/60 md:block">
        <span className="absolute -top-2 -left-[3px] size-[7px] rotate-45 border-t border-l border-white/80" />
        <span className="absolute -bottom-2 -left-[3px] size-[7px] rotate-45 border-r border-b border-white/80" />
      </div>
      <div aria-hidden="true" className="pointer-events-none fixed inset-y-[18vh] right-[2.6vw] z-30 hidden w-px bg-white/60 md:block">
        <span className="absolute -top-2 -left-[3px] size-[7px] rotate-45 border-t border-l border-white/80" />
        <span className="absolute -bottom-2 -left-[3px] size-[7px] rotate-45 border-r border-b border-white/80" />
      </div>
      <div className="pointer-events-none fixed inset-x-3 bottom-3 z-40 flex items-end gap-2 md:inset-x-[6vw] md:bottom-5">
        <div className="hidden size-[4.6rem] shrink-0 flex-col items-center justify-center gap-1 border border-white/85 sm:flex" style={{ background: INK }}>
          <Pixels rows={JACKAL} fill={CREAM} className="size-9" />
          <span className="pix text-[0.5rem] tracking-[0.14em] text-white/70 uppercase">the guide</span>
        </div>
        <p className="pix min-h-[3.4rem] flex-1 border border-white/85 px-4 py-3 text-[0.74rem] leading-[1.5] tracking-[0.06em] uppercase md:text-[0.86rem]" style={{ background: INK, color: CREAM }} aria-live="polite">
          {shown}
          <span aria-hidden="true" className="ml-0.5 inline-block w-[0.5em]" style={{ animation: 'hud-blink 1s steps(1) infinite' }}>▌</span>
        </p>
        <div className="pointer-events-auto flex shrink-0 gap-1.5">
          {[['A', '#claim', '#5fd1b6', 'claim a name'], ['B', '#layouts', '#ec5a4f', 'see the layouts']].map(([l, h, c, t]) => (
            <a key={l} href={h} aria-label={t} title={t} className="pix grid size-11 place-items-center border border-white/85 text-[1rem] font-bold text-[#0c1544] transition-transform hover:-translate-y-0.5 md:size-12" style={{ background: c }}>
              {l}
            </a>
          ))}
        </div>
      </div>
    </>
  )
}

/** One scene of the page. It rises in out of the dark as it arrives and sinks back a little as the next one comes, so the page moves from scene to scene instead of just scrolling. */
function Scene({ id, children, className, innerClass }: { id?: string; children: ReactNode; className?: string; innerClass?: string }) {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.35 })
  const scale = useMap(p, [0, 0.22, 0.8, 1], [0.93, 1, 1, 0.95], reduced, 1)
  const opacity = useMap(p, [0, 0.2, 0.78, 1], [0, 1, 1, 0.15], reduced, 1)
  const y = useMap(p, [0, 0.22, 1], ['9vh', '0vh', '-5vh'], reduced, '0vh')
  return (
    <section ref={ref} id={id} className={cn('relative', className)}>
      <motion.div style={{ scale, opacity, y }} className={cn('will-change-transform', innerClass)}>
        {children}
      </motion.div>
    </section>
  )
}

/** A mono capital heading and a short paragraph under it, set in a narrow column. */
function Block({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('max-w-[19rem]', className)}>
      <h2 className="text-[0.95rem] leading-[1.35] tracking-[0.02em] text-white uppercase md:text-[1.05rem]">{title}</h2>
      <p className="mt-5 text-[0.8rem] leading-[1.75] text-white/75">{children}</p>
    </div>
  )
}

/* ------------------------------------------------------------------ the title screen: what it is, shown with real pages */

/** Follows the pointer by up to `amt` pixels each way (still for people who asked for less motion). */
function useDrift(p: MotionValue<number>, amt: number, reduced: boolean) {
  return useTransform(p, [-1, 1], reduced ? [0, 0] : [-amt, amt])
}

function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotionPrefs()
  const { px, py } = usePointer(ref)
  // read straight from the scroll (a spring here starts from the wrong end and the page would jump when it loads)
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const textY = useMap(p, [0, 1], ['0vh', '-14vh'], reduced, '0vh')
  const textO = useMap(p, [0.1, 0.65], [1, 0], reduced, 1)
  const backY = useMap(p, [0, 1], ['0vh', '-34vh'], reduced, '0vh')
  const midY = useMap(p, [0, 1], ['0vh', '-22vh'], reduced, '0vh')
  const frontY = useMap(p, [0, 1], ['0vh', '-10vh'], reduced, '0vh')
  const bx = useDrift(px, 30, reduced)
  const by = useDrift(py, 18, reduced)
  const mx = useDrift(px, 18, reduced)
  const my = useDrift(py, 11, reduced)
  const fx = useDrift(px, 8, reduced)
  const fy = useDrift(py, 5, reduced)
  return (
    <section ref={ref} id="top" className="relative overflow-hidden">
      <i aria-hidden="true" data-say="this is logoless. your bio gets one link, so make it a page." className="absolute top-0 left-0 block h-px w-px" />
      <Mountains p={p} className="h-[40vh]" />
      <div className="relative z-10 mx-auto grid w-full max-w-[96rem] grid-cols-[minmax(0,1fr)] items-center gap-2 px-5 pt-[7rem] pb-[22vh] md:min-h-[100svh] md:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] md:gap-6 md:px-[5vw] md:pt-24 md:pb-[16vh]">
        <motion.div style={{ y: textY, opacity: textO }} className="relative z-20 min-w-0">
          <h1 className="disp text-[9.8vw] md:text-[clamp(2.4rem,5.1vw,6rem)]" style={{ color: CREAM, ...HARD }}>
            your bio gets
            <br />
            one link.
            <br />
            make it a page.
          </h1>
          <p className="mt-6 max-w-[30rem] text-[0.84rem] leading-[1.75] text-white/85">logoless makes the page. put your edits, socials and music on it, pick how it looks, and paste logoless.io/yourname into your bio. it&apos;s free.</p>
          <div className="mt-7 max-w-[30rem]">
            <ClaimBar />
          </div>
          <p className="mt-1 max-w-[30rem] text-[0.7rem] leading-[1.7] text-white/70">works anywhere you can paste a link: instagram, tiktok, youtube, discord, x.</p>
        </motion.div>

        {/* real pages, at three depths */}
        <div aria-hidden="true" className="relative mx-auto h-[27rem] w-full max-w-[34rem] sm:h-[34rem] md:h-[44rem]">
          <div className="absolute top-0 left-1/2 h-[700px] w-[600px] origin-top -translate-x-1/2 scale-[0.6] sm:scale-[0.78] md:scale-100">
            <motion.div style={{ y: backY }} className="absolute top-[200px] left-0">
              <motion.div style={{ x: bx, y: by }}>
                <Phone id="index" width={190} />
              </motion.div>
            </motion.div>
            <motion.div style={{ y: midY }} className="absolute top-[70px] left-[390px]">
              <motion.div style={{ x: mx, y: my }}>
                <Phone id="bento" width={215} />
              </motion.div>
            </motion.div>
            <motion.div style={{ y: frontY }} className="absolute top-[20px] left-[160px]">
              <motion.div style={{ x: fx, y: fy }}>
                <Phone id="aura" width={260} />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the story: it is all over the place, your bio fits one link, so make that link a page */

const PILE = [
  { t: 'showreel_v3_FINAL.mp4', x: 14, y: 44, d: 1.1, r: -3 },
  { t: 'youtube.com/@lunaray', x: 78, y: 40, d: 0.7, r: 2 },
  { t: 'tiktok.com/@lunaray', x: 85, y: 63, d: 1.3, r: -2 },
  { t: 'discord.gg/lunaray', x: 15, y: 68, d: 0.8, r: 1 },
  { t: 'my spotify playlist', x: 33, y: 78, d: 1.2, r: -2 },
  { t: 'instagram.com/lunaray', x: 68, y: 77, d: 0.9, r: 3 },
  { t: 'old portfolio (2023)', x: 27, y: 55, d: 0.6, r: 1 },
  { t: 'luna@lunaray.co', x: 90, y: 50, d: 1.0, r: -1 },
] as const
/** Where the one link sits on the stage, in vw and vh. */
const SLOT = { x: 50, y: 62 }

const CAPTIONS = ['you make things. all over the place.', 'your bio only fits one link.', 'so make that one link a page.', 'everything you make, behind one link.']
const BEATS = [0, 0.25, 0.5, 0.75, 1]
const SAYS: [string, string][] = [
  ['0%', 'you make things in a lot of places.'],
  ['31%', 'but your bio only fits one link.'],
  ['51%', 'so make that one link a page.'],
  ['71%', 'now everything you make is behind one link.'],
]

/** One of the things you make, floating about, until the one link pulls it in. */
function Chip({ p, chip, i }: { p: MotionValue<number>; chip: (typeof PILE)[number]; i: number }) {
  const { reduced } = useMotionPrefs()
  const s = i * 0.012
  const x = useMap(p, [0, 0.5 + s, 0.66 + s], ['0vw', '0vw', `${SLOT.x - chip.x}vw`], reduced, '0vw')
  const y = useMap(p, [0, 0.5 + s, 0.66 + s], [`${4 * chip.d}vh`, `${-8 * chip.d}vh`, `${SLOT.y - chip.y}vh`], reduced, '0vh')
  const scale = useMap(p, [0.5 + s, 0.66 + s], [1, 0.2], reduced, 1)
  const opacity = useMap(p, [0, 0.08, 0.62 + s, 0.68 + s], [0, 1, 1, 0], reduced, 1)
  return (
    <div className={cn('absolute z-20 -translate-x-1/2 -translate-y-1/2', i > 5 && 'hidden sm:block')} style={{ left: `${chip.x}%`, top: `${chip.y}%` }}>
      <motion.div style={{ x, y, scale, opacity, rotate: chip.r }}>
        <span className="block border border-[#0c1544]/40 bg-[#f4ead6] px-3 py-1.5 text-[0.72rem] whitespace-nowrap text-[#0c1544] shadow-[2px_2px_0_#0c1544]">{chip.t}</span>
      </motion.div>
    </div>
  )
}

/** A line of the story, in big letters; one at a time. */
function Caption({ p, i, children }: { p: MotionValue<number>; i: number; children: string }) {
  const { reduced } = useMotionPrefs()
  const a = BEATS[i]
  const b = BEATS[i + 1]
  const first = i === 0
  const last = i === CAPTIONS.length - 1
  const inp = first ? [0, b - 0.04, b] : last ? [a, a + 0.04, 1] : [a, a + 0.04, b - 0.04, b]
  const o = first ? [1, 1, 0] : last ? [0, 1, 1] : [0, 1, 1, 0]
  const yy = first ? ['0vh', '0vh', '-4vh'] : last ? ['4vh', '0vh', '0vh'] : ['4vh', '0vh', '0vh', '-4vh']
  const opacity = useMap(p, inp, o, reduced, 1)
  const y = useMap(p, inp, yy, reduced, '0vh')
  return (
    <motion.h2 style={{ opacity, y, color: CREAM, ...HARD }} className="disp absolute inset-x-0 top-0 text-[clamp(1.9rem,4.8vw,4.8rem)] leading-[0.92]">
      {children}
    </motion.h2>
  )
}

/** What your profile looks like on the apps: room for one link, and nothing more. */
function ProfileWin({ p }: { p: MotionValue<number> }) {
  const { reduced } = useMotionPrefs()
  const o = useMap(p, [0.2, 0.3, 0.7, 0.78], [0, 1, 1, 0], reduced, 1)
  const sc = useMap(p, [0.2, 0.3], [0.9, 1], reduced, 1)
  const y = useMap(p, [0.2, 0.3], ['6vh', '0vh'], reduced, '0vh')
  const bg = useMap(p, [0.6, 0.7], ['rgba(95,209,182,0)', 'rgba(95,209,182,1)'], reduced, 'rgba(95,209,182,1)')
  const wipe = useMap(p, [0.62, 0.72], [100, 0], reduced, 0)
  const clip = useTransform(wipe, (v) => `inset(0 ${v}% 0 0)`)
  return (
    <motion.div style={{ opacity: o, scale: sc, y }} className="absolute top-[52%] left-1/2 z-10 w-[min(84vw,22rem)] -translate-x-1/2 -translate-y-1/2">
      <Win title="your profile">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="size-12 shrink-0" style={{ background: 'linear-gradient(135deg,#2b4fa3,#5fd1b6 60%,#f19b78)' }} />
            <div className="min-w-0">
              <p className="pix text-[0.8rem] tracking-[0.08em] uppercase">lunaray</p>
              <p className="text-[0.7rem] italic opacity-60">editor. london.</p>
            </div>
          </div>
          <p className="mt-3 text-[0.78rem] leading-[1.6]">making things move. a new edit every week.</p>
          <div className="mt-4 border-t border-[#0c1544]/20 pt-3">
            <p className="pix text-[0.58rem] tracking-[0.14em] uppercase opacity-55">link · 1 of 1 allowed</p>
            <motion.div style={{ background: bg }} className="relative mt-1.5 h-9 border border-dashed border-[#0c1544]/60">
              <motion.span style={{ clipPath: clip }} className="pix absolute inset-0 flex items-center px-3 text-[0.72rem]">
                logoless.io/lunaray
              </motion.span>
            </motion.div>
          </div>
        </div>
      </Win>
    </motion.div>
  )
}

/** The page behind that one link, in a window with its address on top and what is on it pointed out. */
function PageWin({ p, still = false }: { p: MotionValue<number> | null; still?: boolean }) {
  const { reduced } = useMotionPrefs()
  const fallback = useMotionValue(1)
  const q = p ?? fallback
  const o = useMap(q, [0.72, 0.8], [0, 1], reduced || still, 1)
  const y = useMap(q, [0.72, 0.8], ['8vh', '0vh'], reduced || still, '0vh')
  const co = useMap(q, [0.84, 0.92], [0, 1], reduced || still, 1)
  const cx = useMap(q, [0.84, 0.92], [18, 0], reduced || still, 0)
  const ncx = useTransform(cx, (v) => -v)
  const left: [string, string][] = [['your links', 'top-[46%]'], ['your socials', 'top-[63%]']]
  const right: [string, string][] = [['a layout you pick', 'top-[34%]'], ['a background that moves', 'top-[70%]']]
  return (
    <motion.div style={{ opacity: o, y }} className="relative">
      <div className="origin-top scale-[0.74] md:scale-100">
        <Win title="logoless.io/luna" className="w-[242px]">
          <div style={{ background: INK }}>
            <Phone id="aura" width={240} className="!border-0 !shadow-none" />
          </div>
        </Win>
      </div>
      <motion.div style={{ opacity: co }} className="pointer-events-none absolute inset-0 hidden md:block">
        {left.map(([t, pos]) => (
          <motion.div key={t} style={{ x: cx }} className={cn('absolute right-full mr-9', pos)}>
            <span className="flex items-center gap-2 text-[0.8rem] whitespace-nowrap text-white [text-shadow:0_1px_0_#0c1544]">
              {t}
              <span aria-hidden="true" className="h-px w-8 bg-white/80" />
            </span>
          </motion.div>
        ))}
        {right.map(([t, pos]) => (
          <motion.div key={t} style={{ x: ncx }} className={cn('absolute left-full ml-9', pos)}>
            <span className="flex items-center gap-2 text-[0.8rem] whitespace-nowrap text-white [text-shadow:0_1px_0_#0c1544]">
              <span aria-hidden="true" className="h-px w-8 bg-white/80" />
              {t}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}

function StoryPinned() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.35 })
  return (
    <section ref={ref} id="story" className="relative h-[520svh]">
      {SAYS.map(([t, s]) => (
        <i key={t} aria-hidden="true" data-say={s} style={{ top: t }} className="absolute left-0 block h-px w-px" />
      ))}
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="absolute inset-x-[5vw] top-[16vh] h-[30vh] md:top-[11vh] md:right-[38vw]">
          {CAPTIONS.map((t, i) => (
            <Caption key={t} p={p} i={i}>
              {t}
            </Caption>
          ))}
        </div>
        <ProfileWin p={p} />
        <div className="absolute top-[32vh] left-1/2 -translate-x-1/2 md:top-[11vh] md:left-[66%]">
          <PageWin p={p} />
        </div>
        {PILE.map((c, i) => (
          <Chip key={c.t} p={p} chip={c} i={i} />
        ))}
      </div>
    </section>
  )
}

/** The same story for people who asked for less motion: four lines and the page, standing still. */
function StoryStatic() {
  return (
    <section id="story" className="relative mx-auto grid w-full max-w-[72rem] gap-12 px-5 py-[14vh] md:grid-cols-[1fr_auto] md:px-12">
      <i aria-hidden="true" data-say="you make things in a lot of places. your bio fits one link. so make that link a page." className="absolute top-0 left-0 block h-px w-px" />
      <ol className="grid content-start gap-8">
        {CAPTIONS.map((t) => (
          <li key={t} className="flex gap-5">
            <h2 className="disp text-[clamp(1.9rem,4vw,3.6rem)] leading-[0.95]" style={{ color: CREAM, ...HARD }}>
              {t}
            </h2>
          </li>
        ))}
      </ol>
      <div className="mx-auto">
        <PageWin p={null} still />
      </div>
    </section>
  )
}

function Story() {
  const { reduced } = useMotionPrefs()
  return reduced ? <StoryStatic /> : <StoryPinned />
}

/* ------------------------------------------------------------------ how it works */

const HOW = [
  { t: 'pick your name', d: 'sign in with google, discord or email and take the name you want. one letter is fine. if someone already has it, they have it.' },
  { t: 'put your stuff on it', d: 'links, your socials, videos that play on the page, a song. then choose a layout, a background and a cursor. it changes in front of you as you go.' },
  { t: 'paste the link in your bio', d: 'logoless.io/yourname goes wherever your bio lets you put a link: instagram, tiktok, youtube, discord. every click lands on your page.' },
] as const

function Steps() {
  return (
    <Scene id="how" className="px-5 py-[14vh] md:px-12" innerClass="mx-auto w-full max-w-[72rem]">
      <i aria-hidden="true" data-say="how it works." className="absolute top-0 left-0 block h-px w-px" />
      <div className="grid gap-10 md:grid-cols-[1fr_1.35fr] md:gap-16">
        <h2 className="disp text-[clamp(2.4rem,5.6vw,5.2rem)]" style={{ color: CREAM, ...HARD }}>
          how it works
        </h2>
        <ol className="border-t border-white/40">
          {HOW.map((h) => (
            <li key={h.t} className="grid gap-2 border-b border-white/25 py-6 md:grid-cols-[12.5rem_1fr] md:gap-8">
              <h3 className="text-[0.95rem] text-white">{h.t}</h3>
              <p className="text-[0.8rem] leading-[1.75] text-white/75">{h.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </Scene>
  )
}

/* ------------------------------------------------------------------ the answer: the screen flashes, then it comes in over the mountains */

function Impact() {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.35 })
  const flash = useMap(p, [0.08, 0.13, 0.26, 0.36], [0, 1, 1, 0], reduced, 0)
  const x1 = useMap(p, [0.34, 0.5], ['-70vw', '0vw'], reduced, '0vw')
  const x2 = useMap(p, [0.4, 0.56], ['70vw', '0vw'], reduced, '0vw')
  const x3 = useMap(p, [0.46, 0.62], ['-70vw', '0vw'], reduced, '0vw')
  const o1 = useMap(p, [0.34, 0.44], [0, 1], reduced, 1)
  const o2 = useMap(p, [0.4, 0.5], [0, 1], reduced, 1)
  const o3 = useMap(p, [0.46, 0.56], [0, 1], reduced, 1)
  const narrO = useMap(p, [0.64, 0.72, 0.94, 1], [0, 1, 1, 0], reduced, 1)
  const narrY = useMap(p, [0.64, 0.72], ['4vh', '0vh'], reduced, '0vh')
  return (
    <section ref={ref} className="relative h-[420svh]">
      <i aria-hidden="true" data-say="most link in bios are a list of buttons." className="absolute top-[8%] left-0 block h-px w-px" />
      <i aria-hidden="true" data-say="yours can be a whole screen." className="absolute top-[64%] left-0 block h-px w-px" />
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <Mountains p={p} className="opacity-90" />
        <div className="relative mx-auto flex h-full w-full max-w-[96rem] flex-col justify-center px-5 pb-24 md:px-14">
          <h2 className="disp text-[clamp(3rem,11.4vw,11rem)]" style={{ color: CREAM, ...HARD }}>
            <motion.span style={{ x: x1, opacity: o1 }} className="block">
              it doesn&apos;t
            </motion.span>
            <motion.span style={{ x: x2, opacity: o2 }} className="block md:ml-[8vw]">
              have to be
            </motion.span>
            <motion.span style={{ x: x3, opacity: o3 }} className="block md:ml-[3vw]">
              a list.
            </motion.span>
          </h2>
          <motion.div style={{ opacity: narrO, y: narrY }} className="mt-8 max-w-[30rem] md:mt-10 md:ml-[44vw]">
            <p className="pix border border-white/85 px-4 py-3 text-[0.74rem] leading-[1.7] tracking-[0.06em] uppercase" style={{ background: INK, color: CREAM }}>
              full screen. a shader behind it. your song under it. a cursor that&apos;s yours, and every scroll moves something.
            </p>
          </motion.div>
        </div>
        <motion.div aria-hidden="true" style={{ opacity: flash, backgroundColor: CREAM }} className="pointer-events-none absolute inset-0" />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ ten layouts, in a stippled frame, pinned */

function Layouts() {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 })
  const [i, setI] = useState(0)
  useMotionValueEvent(p, 'change', (v) => setI(Math.max(0, Math.min(LAYOUTS.length - 1, Math.floor(v * LAYOUTS.length * 0.999)))))
  const id = LAYOUTS[i].id as SampleId
  const tilt = useMap(p, [0, 1], [-3, 3], reduced, 0)
  const lift = useMap(p, [0, 1], [18, -18], reduced, 0)
  const rail = useMap(p, [0, 1], ['0%', '100%'], reduced, '100%')
  return (
    <section ref={ref} id="layouts" className="relative h-[820svh]">
      <i aria-hidden="true" data-say="ten ways to lay your page out. keep scrolling to try them." className="absolute top-0 left-0 block h-px w-px" />
      <div className="sticky top-0 h-[100svh] overflow-hidden border-y border-white/40 bg-[#0c1544]">
        <div aria-hidden="true" className="stipple absolute inset-y-0 left-0 w-[4.4vw] min-w-6 border-r border-white/35" />
        <div aria-hidden="true" className="stipple absolute inset-y-0 right-0 w-[4.4vw] min-w-6 border-l border-white/35" />
        <div aria-hidden="true" className="absolute inset-y-0 left-[calc(4.4vw+7px)] hidden w-px bg-white/25 md:block" />
        <div aria-hidden="true" className="absolute inset-y-0 right-[calc(4.4vw+7px)] hidden w-px bg-white/25 md:block" />
        <div className="relative mx-auto flex h-full w-full max-w-[84rem] flex-col justify-center px-[8vw] pt-24 pb-28 md:px-[9vw]">
          <h2 className="disp text-[clamp(2rem,5.4vw,5rem)]">ten ways to lay it out</h2>
          <p className="mt-4 max-w-[26rem] text-[0.8rem] leading-[1.7] text-white/65">same links, ten ways to show them. some float, some pin, some run sideways. all of them move when you scroll.</p>
          <div className="mt-8 grid items-center gap-8 md:mt-10 md:grid-cols-[1fr_auto] md:gap-14">
            <ol className="hidden md:block">
              {LAYOUTS.map((l, n) => (
                <li key={l.id} className="border-b border-white/15 first:border-t">
                  <div className={cn('flex items-baseline gap-4 py-2.5 transition-colors duration-500', n === i ? 'text-white' : 'text-white/35')}>
                    <span className="text-[0.95rem] tracking-[0.03em] uppercase">{l.name}</span>
                  </div>
                  <AnimatePresence initial={false}>
                    {n === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} className="overflow-hidden">
                        <p className="pb-3 pl-9 text-[0.78rem] text-white/60">{l.note}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              ))}
            </ol>
            <p className="text-center text-[0.84rem] text-white/70 md:hidden">
              {LAYOUTS[i].name.toLowerCase()}: {LAYOUTS[i].note}
            </p>
            <motion.div style={{ rotate: tilt, y: lift }} className="relative mx-auto">
              <div className="relative h-[21.5rem] w-[194px] overflow-hidden border border-white/35 bg-black shadow-[0_50px_140px_rgb(0_0_0/0.9)] sm:h-[30rem] sm:w-[270px] md:h-[32rem] md:w-[286px]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div key={id} initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.5, ease: EASE }} className="absolute inset-0">
                    <div className="absolute top-0 left-0 origin-top-left scale-[0.5] sm:scale-[0.69] md:scale-[0.733]" style={{ width: 390, height: 700 }}>
                      <BioPage mode="mini" data={SAMPLES[id]} />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-white/15">
          <motion.span style={{ width: rail }} className="block h-px bg-white" />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ shaders: a square opens onto the next scene */

function Backgrounds() {
  const ref = useRef<HTMLElement>(null)
  const { px, py } = usePointer(ref)
  const { reduced } = useMotionPrefs()
  const level = useQuiet()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 })
  const [i, setI] = useState(0)
  useMotionValueEvent(p, 'change', (v) => setI(Math.max(0, Math.min(BIO_SHADERS.length - 1, Math.floor(((v - 0.14) / 0.86) * BIO_SHADERS.length * 0.999)))))
  const s = BIO_SHADERS[i]
  // the opening: a circle grows from the middle while the scene is still arriving, then the scene stays put
  const iris = useMap(p, [0, 0.13], [0, 100], reduced, 100)
  const clip = useTransform(iris, (v) => `inset(${(100 - v) / 2}%)`)
  const scale = useMap(p, [0.1, 1], [1.12, 1], reduced, 1)
  return (
    <section ref={ref} id="backgrounds" className="relative h-[640svh]">
      <i aria-hidden="true" data-say="seven live backgrounds behind your page." className="absolute top-0 left-0 block h-px w-px" />
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div className="absolute inset-0" style={{ clipPath: clip, WebkitClipPath: clip }}>
          <motion.div className="absolute inset-0" style={{ scale }}>
            <ShaderRunner key={s.id} id={s.id as ShaderId} tone={2} intensity={86} speed={55} px={px} py={py} level={level} reduced={reduced} />
          </motion.div>
          <div aria-hidden="true" className="absolute inset-0" style={{ mixBlendMode: 'color', background: 'radial-gradient(60% 60% at 12% 18%, #5fd1b6, transparent 72%), radial-gradient(60% 60% at 88% 26%, #2b4fa3, transparent 74%), radial-gradient(60% 60% at 22% 88%, #f19b78, transparent 72%), radial-gradient(60% 60% at 86% 88%, #ec5a4f, transparent 74%), #2b4fa3' }} />
          <div aria-hidden="true" className="absolute inset-0 bg-[#0c1544]/25" />
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_50%,transparent,rgb(0_0_0/0.8))]" />
          <div className="relative mx-auto flex h-full w-full max-w-[96rem] flex-col justify-between px-6 pt-28 pb-28 md:px-16">
            <div>
              <h2 className="disp max-w-[46rem] text-[clamp(2.4rem,6.6vw,6.4rem)]">seven live backgrounds</h2>
              <p className="mt-5 max-w-[24rem] text-[0.8rem] leading-[1.75] text-white/75">drawn live by the graphics card. they follow your pointer, move with your music, and blur as far as you want.</p>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-6 sm:flex-nowrap">
              <AnimatePresence mode="wait">
                <motion.span key={s.id} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} className="disp text-[clamp(3.4rem,11vw,10rem)]">
                  {s.name.toLowerCase()}
                </motion.span>
              </AnimatePresence>
              <ul className="hidden w-52 text-[0.74rem] sm:block" aria-label="backgrounds">
                {BIO_SHADERS.map((b, n) => (
                  <li key={b.id} className={cn('flex items-baseline gap-4 border-t py-1.5 transition-colors duration-500', n === i ? 'border-white text-white' : 'border-white/25 text-white/45')}>
                    {b.name.toLowerCase()}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ simple on purpose */

function Practices() {
  const yes = ['a full-screen page at logoless.io/you, from one character up', 'ten layouts, seven live backgrounds, thirteen cursors you can draw or upload', 'music, video and an enter screen, and the page moves with all of it', 'numbers on who looked and what they pressed']
  const no = ['a website builder with a thousand knobs', 'a feed, a follower count or an algorithm', 'a shop (not yet)', 'slow']
  return (
    <Scene className="px-4 py-[14vh] md:px-12" innerClass="mx-auto w-full max-w-[64rem]">
      <div className="relative border border-white/40 bg-[#0c1544] px-6 py-14 md:px-16 md:py-20">
        <i aria-hidden="true" data-say="a page, not a website builder." className="absolute top-0 left-0 block h-px w-px" />
        <h2 className="disp text-[clamp(2.4rem,7vw,6.4rem)]">a page, not a website builder</h2>
        <span className="mt-6 block h-px w-14 bg-white/70" />
        <p className="mt-8 max-w-[28rem] text-[0.84rem] leading-[1.8] text-white/75">made for editors who got tired of sending people to a list of white buttons. a name, a page, a few good choices. then it gets out of the way.</p>
        <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <h3 className="text-[0.95rem] tracking-[0.03em] uppercase">what is it?</h3>
            <ul className="mt-6 space-y-4 text-[0.8rem] leading-[1.7] text-white/80">
              {yes.map((t) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden="true" className="mt-[0.7em] block h-px w-3 shrink-0 bg-white" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[0.95rem] tracking-[0.03em] uppercase">what it&apos;s not?</h3>
            <ul className="mt-6 space-y-4 text-[0.8rem] leading-[1.7] text-white/55">
              {no.map((t) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden="true" className="mt-[0.7em] block h-px w-3 shrink-0 bg-white/40" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Scene>
  )
}

/* ------------------------------------------------------------------ cursors */

function Cursors() {
  const [pick, setPick] = useState('arrow')
  const [ink, setInk] = useState<'white' | 'black'>('white')
  const css = cursorCss(pick, ink, 40)
  return (
    <Scene id="cursors" className="bg-[#0c1544] px-6 py-[14vh] md:px-12" innerClass="mx-auto grid w-full max-w-[84rem] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
      <i aria-hidden="true" data-say="pick a cursor. this whole area is wearing it." className="absolute top-0 left-0 block h-px w-px" />
      <div style={{ cursor: css.arrow }} className="contents">
        <div>
          <h2 className="disp text-[clamp(2.4rem,6vw,5.6rem)]">your cursor</h2>
          <Block title="move it" className="mt-8">
            pick one of ours (this whole scene is wearing it) or upload a picture or an svg of your own. each one has a second shape that shows up over your links. add a trail if you feel like it.
          </Block>
          <div className="mt-8 inline-flex border border-white/35 p-0.5 text-[0.7rem] tracking-[0.14em] uppercase">
            {(['white', 'black'] as const).map((c) => (
              <button key={c} type="button" onClick={() => setInk(c)} aria-pressed={ink === c} className={cn('h-9 px-5 transition-colors', ink === c ? 'bg-white text-black' : 'text-white/55 hover:text-white')}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-l border-white/20 sm:grid-cols-4" style={{ cursor: css.arrow }}>
          {CURSORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setPick(c.id)}
              aria-pressed={pick === c.id}
              aria-label={c.name}
              className={cn('group relative grid aspect-square place-items-center overflow-hidden border-r border-b border-white/20 transition-colors duration-500', pick === c.id && 'outline outline-1 -outline-offset-1 outline-white')}
              style={{ background: ink === 'white' ? '#0b0b0b' : '#e8e8e8', cursor: cursorCss(c.id, ink, 40).link }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/svg+xml,${encodeURIComponent(cursorSvg(c.arrow, ink, 32))}`} alt="" width={36} height={36} className="transition-transform duration-500 group-hover:scale-125" />
              <span className={cn('absolute bottom-2 text-[0.6rem] tracking-wide opacity-0 transition-opacity group-hover:opacity-100', ink === 'white' ? 'text-white/60' : 'text-black/60')}>{c.name.toLowerCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </Scene>
  )
}

/* ------------------------------------------------------------------ common questions, as a conversation */

const TALK = [
  { q: 'what is a link in bio?', tag: 'one link, many things', a: 'instagram, tiktok and youtube only let you put one link on your profile. logoless gives you a page to put there, with all your links, socials and edits on it.' },
  { q: 'is it really free?', tag: 'yes', a: 'claiming a name and building a page costs nothing, and nothing in the editor is locked behind anything.' },
  { q: 'can i have a one letter name?', tag: "if it's free", a: 'names start at one character. dots, dashes and a few symbols work anywhere in them. if someone already has it, they have it.' },
  { q: 'does the music start by itself?', tag: 'after a click', a: 'browsers keep sound off until someone clicks. turn on the enter screen and that click is what lets your song start.' },
  { q: 'can people watch my edits on the page?', tag: 'yes', a: 'paste a youtube, vimeo, tiktok or spotify link and it plays right there. anything else opens as a normal link.' },
  { q: 'will it slow my page down?', tag: 'not much', a: 'the backgrounds run on the graphics card and draw smaller on phones. anyone who asked their device for less motion gets a still page.' },
] as const

function Exchange({ q, tag, a, index }: { q: string; tag: string; a: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 92%', 'start 48%'] })
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.35 })
  const qx = useMap(p, [0, 0.5], ['-16vw', '0vw'], reduced, '0vw')
  const qo = useMap(p, [0, 0.4], [0, 1], reduced, 1)
  const ax = useMap(p, [0.35, 1], ['16vw', '0vw'], reduced, '0vw')
  const ao = useMap(p, [0.35, 0.85], [0, 1], reduced, 1)
  const ar = useMap(p, [0.35, 1], [2.2, 0], reduced, 0)
  return (
    <div ref={ref} className="grid gap-6 md:gap-8">
      <motion.div style={{ x: qx, opacity: qo }} className="max-w-[30rem]">
        <Say who="you">
          <span className="text-[0.88rem] tracking-[0.04em] uppercase">{q}</span>
        </Say>
      </motion.div>
      <motion.div style={{ x: ax, opacity: ao, rotate: ar }} className="max-w-[34rem] justify-self-end">
        <Say who="us" solid>
          <span className="block text-[0.7rem] tracking-[0.16em] uppercase">↓ {tag}</span>
          <span className="mt-2 block text-[0.8rem] leading-[1.75] text-black/80">{a}</span>
        </Say>
      </motion.div>
    </div>
  )
}

function Dialogue() {
  return (
    <section id="faq" className="relative mx-auto w-full max-w-[56rem] px-5 py-[16vh] md:px-12">
      <i aria-hidden="true" data-say="questions? answered short." className="absolute top-0 left-0 block h-px w-px" />
      <h2 className="disp text-[clamp(2.6rem,7vw,6.4rem)]" style={{ color: CREAM, ...HARD }}>questions</h2>
            <div className="mt-[10vh] grid gap-[14vh]">
        {TALK.map((t, i) => (
          <Exchange key={t.q} index={i} {...t} />
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the end: a light block rises and the page turns over */

const SPECS: [string, string][] = [
  ['price', 'nothing'],
  ['names', '1 to 30 characters. letters, numbers and . _ - ~ ! $ * + = anywhere'],
  ['layouts', 'ten'],
  ['backgrounds', 'seven live shaders'],
  ['cursors', 'thirteen, or your own picture or svg'],
  ['music and video', 'music up to 1 MB, a short looping video background'],
  ['sign in', 'google, discord or email'],
]

function Outro() {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'start 15%'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })
  const r = useMap(p, [0, 1], [0, 100], reduced, 100)
  const clip = useTransform(r, (v) => `inset(${(100 - v) / 2}% ${(100 - v) / 2}% 0% ${(100 - v) / 2}%)`)
  const rise = useMap(p, [0.3, 1], ['6vh', '0vh'], reduced, '0vh')
  return (
    <section ref={ref} id="claim" className="relative">
      <i aria-hidden="true" data-say="last step. pick your name." className="absolute top-0 left-0 block h-px w-px" />
      <motion.div style={{ clipPath: clip, WebkitClipPath: clip }} className="bg-[#ededed] text-black">
        <motion.div style={{ y: rise }} className="mx-auto w-full max-w-[72rem] px-6 pt-[18vh] pb-[12vh] md:px-12">
          <h2 className="disp text-[clamp(3.6rem,14vw,13rem)] !text-black">claim it.</h2>
          <p className="mt-6 max-w-[27rem] text-[0.84rem] leading-[1.75] text-black/70">it takes a few seconds and it&apos;s free. the short names go fast.</p>
          <div className="mt-10 max-w-[38rem]">
            <ClaimBar big light />
          </div>
          <dl className="mt-[14vh] border-t border-black/25 text-[0.78rem]">
            {SPECS.map(([k, v]) => (
              <div key={k} className="grid gap-1 border-b border-black/15 py-3.5 md:grid-cols-[12rem_1fr] md:gap-8">
                <dt className="tracking-[0.1em] uppercase">{k}</dt>
                <dd className="text-black/70">{v}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </motion.div>
      <footer className="border-t border-white/30 bg-[#0c1544] px-6 pt-14 pb-32 md:px-12">
        <div className="mx-auto grid w-full max-w-[72rem] gap-10 text-[0.78rem] md:grid-cols-4">
          {[
            ['page', [['layouts', '#layouts'], ['backgrounds', '#backgrounds'], ['cursors', '#cursors']]],
            ['account', [['log in', '/login'], ['get started', '/signup']]],
            ['legal', [['terms', '/legal/terms'], ['privacy', '/legal/privacy'], ['all policies', '/legal']]],
          ].map(([h, links]) => (
            <div key={h as string}>
              <p className="mb-4 text-[0.7rem] tracking-[0.16em] text-white/45 uppercase">{h as string}</p>
              <ul className="space-y-2">
                {(links as string[][]).map(([n, href]) => (
                  <li key={n}>
                    <a href={href} className="text-white/80 transition-colors hover:text-white">
                      {n}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="text-white/45 md:text-right">{new Date().getFullYear()} logoless</p>
        </div>
      </footer>
    </section>
  )
}

export function Home() {
  return (
    <div className="ed relative min-h-dvh overflow-x-clip !bg-transparent">
      <SpeckFilter />
      <FixedMesh />
      <Hud />
      <main className="relative z-10">
        <Hero />
        <Story />
        <Steps />
        <Impact />
        <Layouts />
        <Backgrounds />
        <Practices />
        <Cursors />
        <Dialogue />
        <Outro />
      </main>
    </div>
  )
}
