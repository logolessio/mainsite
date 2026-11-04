'use client'

import '@/components/editor/editor.css'
import { AnimatePresence, type MotionValue, motion, useMotionTemplate, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, Check, Loader2, UserRound, X } from 'lucide-react'
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
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

/** A scroll-driven value. People who asked for less motion get `rest` instead, and nothing moves. */
function useMap<T extends number | string>(p: MotionValue<number>, input: number[], output: T[], reduced: boolean, rest: T): MotionValue<T extends number ? number : string> {
  return useTransform(p, input, reduced ? input.map(() => rest) : output) as unknown as MotionValue<T extends number ? number : string>
}

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

const INK = '#0c1544' // the deep blue the boxes are filled with
const CREAM = '#f4ead6'

/** Small pictures drawn one square at a time. `X` is filled, `o` is the eye, anything else is empty. */
function Pixels({ rows, fill = 'currentColor', eye = INK, className }: { rows: string[]; fill?: string; eye?: string; className?: string }) {
  return (
    <svg viewBox={`0 0 ${rows[0].length} ${rows.length}`} shapeRendering="crispEdges" aria-hidden="true" className={className}>
      {rows.flatMap((r, y) => [...r].map((c, x) => (c === 'X' || c === 'o' ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={c === 'o' ? eye : fill} /> : null)))}
    </svg>
  )
}
const JACKAL = ['..XX....XX..', '..XXX..XXX..', '..XXX..XXX..', '..XXXXXXXX..', '.XXXXXXXXXX.', '.XXoXXXXoXX.', '.XXXXXXXXXX.', '..XXXXXXXX..', '...XXXXXX...', '...XXXXXX...', '....XXXX....', '.....XX.....']
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']
const PLAY = ['XX.....', 'XXXX...', 'XXXXXX.', 'XXXXXXX', 'XXXXXX.', 'XXXX...', 'XX.....']
const ARROW = ['X.........', 'XX........', 'XXX.......', 'XXXX......', 'XXXXX.....', 'XXXXXX....', 'XXXXXXX...', 'XXXXX.....', 'XX.XXX....', 'X..XXX....', '....XXX...', '....XXX...']

/** Soft blobs of teal, blue, salmon and red that drift as the page scrolls, with fine speckle over them. */
function FixedMesh() {
  const { scrollYProgress } = useScroll()
  const { reduced } = useMotionPrefs()
  const pos = (a: string[], b: string[]) => [useMap(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], a, reduced, a[0]), useMap(scrollYProgress, [0, 0.25, 0.5, 0.75, 1], b, reduced, b[0])] as const
  const [ax, ay] = pos(['14%', '70%', '88%', '30%', '60%'], ['18%', '22%', '70%', '80%', '30%'])
  const [bx, by] = pos(['86%', '20%', '14%', '82%', '30%'], ['26%', '70%', '24%', '30%', '78%'])
  const [cx, cy] = pos(['16%', '84%', '62%', '14%', '84%'], ['82%', '70%', '86%', '22%', '66%'])
  const [dx, dy] = pos(['78%', '40%', '30%', '66%', '14%'], ['84%', '30%', '24%', '76%', '24%'])
  const bg = useMotionTemplate`radial-gradient(55% 52% at ${ax} ${ay}, #5fd1b6, transparent 72%), radial-gradient(52% 56% at ${bx} ${by}, #2b4fa3, transparent 74%), radial-gradient(52% 52% at ${cx} ${cy}, #f19b78, transparent 72%), radial-gradient(56% 56% at ${dx} ${dy}, #ec5a4f, transparent 74%), #22377f`
  return (
    <>
      <motion.div aria-hidden="true" style={{ background: bg }} className="fixed inset-0 z-0" />
      <div aria-hidden="true" className="speckle pointer-events-none fixed inset-0 z-0 opacity-25" />
    </>
  )
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
        {[['layouts', '#layouts'], ['backgrounds', '#backgrounds'], ['cursors', '#cursors']].map(([n, h], i, a) => (
          <a key={h} href={h} className={cn('pix px-3.5 py-2.5 text-white transition-colors hover:bg-white hover:text-[#0c1544]', i < a.length - 1 && 'border-r border-white/80', i === 2 && 'hidden sm:block')}>
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
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3 md:top-5 md:right-5">
        <div aria-hidden="true" className="pointer-events-none hidden gap-1 sm:flex">
          {Array.from({ length: 5 }, (_, i) => (
            <Pixels key={i} rows={HEART} fill={i < hearts ? '#fff' : `${INK}`} className={cn('size-[1.1rem]', i < hearts ? 'text-white' : 'opacity-70')} />
          ))}
        </div>
        <a href="/login" aria-label="log in" className="grid size-10 place-items-center border border-white/80 text-white transition-colors hover:bg-white hover:text-[#0c1544]" style={{ background: `${INK}b3` }}>
          <UserRound className="size-[1.1rem]" strokeWidth={1.6} />
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

/** A small window: a deep blue title bar with three square lights, a cream body and a hard square shadow. */
function Win({ title, children, className, bodyClass }: { title: string; children: ReactNode; className?: string; bodyClass?: string }) {
  return (
    <div className={cn('border border-[#0c1544] bg-[#f3f1ec] text-[#0c1544] shadow-[7px_7px_0_#0c1544]', className)}>
      <div className="flex h-7 items-center gap-1.5 px-2.5" style={{ background: INK }}>
        {['#ec5a4f', '#f1b84f', '#5fd1b6'].map((c) => (
          <span key={c} className="size-[7px]" style={{ background: c }} />
        ))}
        <span className="pix ml-2 truncate text-[0.62rem] tracking-[0.1em] uppercase" style={{ color: CREAM }}>
          {title}
        </span>
      </div>
      <div className={bodyClass}>{children}</div>
    </div>
  )
}

/** The player bar at the foot of a window: a red line with a blue square on it, and four pixel controls. */
function PlayerBar({ at }: { at: MotionValue<number> }) {
  const w = useTransform(at, (v) => `${Math.max(0, Math.min(1, v)) * 100}%`)
  return (
    <div className="px-3 pt-3 pb-2.5">
      <div className="relative h-[3px] bg-[#0c1544]/20">
        <motion.span style={{ width: w }} className="absolute inset-y-0 left-0 block bg-[#ec5a4f]" />
        <motion.span style={{ left: w }} className="absolute top-1/2 block size-2.5 -translate-x-1/2 -translate-y-1/2 bg-[#2b4fa3]" />
      </div>
      <div className="pix mt-2.5 flex items-center gap-3 text-[0.62rem] text-[#2b4fa3]">
        <span>▶</span>
        <span>»</span>
        <span>‖</span>
        <span>■</span>
      </div>
    </div>
  )
}

/** Three ranges of mountains drawn in flat shapes with speckle, each sliding at its own speed. */
function Mountains({ p, className }: { p: MotionValue<number>; className?: string }) {
  const { reduced } = useMotionPrefs()
  const far = useMap(p, [0, 1], ['4vh', '-8vh'], reduced, '0vh')
  const mid = useMap(p, [0, 1], ['10vh', '-16vh'], reduced, '0vh')
  const near = useMap(p, [0, 1], ['18vh', '-26vh'], reduced, '0vh')
  const box = 'absolute inset-x-0 bottom-0 h-full w-full'
  return (
    <div aria-hidden="true" className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-[48vh] overflow-hidden', className)}>
      <motion.svg style={{ y: far }} viewBox="0 0 1200 400" preserveAspectRatio="none" className={box}>
        <polygon filter="url(#speck)" fill="#2a4aa0" points="0,400 0,250 90,200 180,240 300,150 380,210 470,120 560,200 680,170 780,230 900,160 1010,220 1100,190 1200,230 1200,400" />
      </motion.svg>
      <motion.svg style={{ y: mid }} viewBox="0 0 1200 400" preserveAspectRatio="none" className={box}>
        <polygon filter="url(#speck)" fill="#f19b78" points="250,400 520,60 590,210 560,400" />
        <polygon filter="url(#speck)" fill="#14226b" points="520,60 700,120 960,400 560,400 590,210" />
        <polygon fill="#f4ead6" fillOpacity=".85" points="520,60 540,90 528,96 514,84" />
      </motion.svg>
      <motion.svg style={{ y: near }} viewBox="0 0 1200 400" preserveAspectRatio="none" className={box}>
        <polygon filter="url(#speck)" fill="#2fae96" points="0,400 0,330 140,290 260,330 420,300 560,340 700,310 860,350 1000,310 1200,350 1200,400" />
      </motion.svg>
    </div>
  )
}

/** A line of dialogue in a square box with the speaker on a small tab. `solid` is the light one. */
function Say({ who, children, solid = false, className, style }: { who?: string; children: ReactNode; solid?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <div style={{ background: solid ? CREAM : INK, color: solid ? INK : CREAM, ...style }} className={cn('relative border px-5 pt-7 pb-4 text-[0.82rem] leading-[1.65]', solid ? 'border-[#f4ead6]' : 'border-white/85', className)}>
      {who && (
        <span className="pix absolute top-0 left-0 border-r border-b px-2.5 py-1 text-[0.58rem] tracking-[0.18em] uppercase" style={{ borderColor: solid ? `${INK}66` : 'rgb(255 255 255 / 0.85)', opacity: 0.8 }}>
          {who}
        </span>
      )}
      {children}
    </div>
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

/* ------------------------------------------------------------------ level 0: the title screen */

const HARD = { textShadow: '0.04em 0.04em 0 #0c1544' } as const

function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotionPrefs()
  // read straight from the scroll (a spring here starts from the wrong end and the page would jump when it loads)
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const winY = useMap(p, [0, 0.55], ['0vh', '-16vh'], reduced, '0vh')
  const winS = useMap(p, [0, 0.55], [1, 1.1], reduced, 1)
  const winO = useMap(p, [0.34, 0.66], [1, 0], reduced, 1)
  const titleY = useMap(p, [0, 0.55], ['0vh', '-14vh'], reduced, '0vh')
  const titleO = useMap(p, [0.22, 0.58], [1, 0], reduced, 1)
  const claimO = useMap(p, [0, 0.3], [1, 0], reduced, 1)
  const play = useMap(p, [0, 0.9], [0.04, 0.96], reduced, 0.4)
  return (
    <section ref={ref} id="top" className="relative h-[240svh]">
      <i aria-hidden="true" data-say="press start. pick a name below." className="absolute top-0 left-0 block h-px w-px" />
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <Mountains p={p} />
        <motion.div style={{ opacity: titleO, y: titleY }} className="absolute inset-x-0 top-[9vh] px-4 text-center md:top-[7vh]">
          <p className="pix text-[0.7rem] tracking-[0.14em] uppercase" style={{ color: CREAM }}>
            <span className="mr-2 tracking-normal normal-case italic">from →</span>
            <span className="border border-white/85 px-2 py-1" style={{ background: INK }}>
              logoless
            </span>
          </p>
          <h1 className="disp mt-4 text-[clamp(3.2rem,12.6vw,12rem)]" style={{ color: CREAM, ...HARD }}>
            link in bio
          </h1>
          <p className="mt-3 text-[0.78rem] text-white italic">a link in bio for people who make things move</p>
        </motion.div>
        <motion.div style={{ y: winY, scale: winS, opacity: winO }} className="absolute top-[33vh] left-1/2 w-[min(86vw,23rem)] -translate-x-1/2 md:top-[34vh]">
          <Win title="your-page.exe">
            <div className="relative h-[9.5rem] overflow-hidden md:h-[11rem]" style={{ background: INK }}>
              <div className="absolute top-0 left-1/2 -translate-x-1/2">
                <Phone id="aura" width={250} className="!border-0 !shadow-none" />
              </div>
            </div>
            <PlayerBar at={play} />
          </Win>
        </motion.div>
        <motion.div style={{ opacity: claimO }} className="absolute inset-x-0 bottom-[21vh] mx-auto w-full max-w-[28rem] px-5">
          <ClaimBar />
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ levels 1 to 4: the story, as windows opening on a desktop */

/** A window that opens (a little scale, a rise, a fade) over a stretch of a scene's progress. */
function usePop(p: MotionValue<number>, a: number, b: number) {
  const { reduced } = useMotionPrefs()
  return {
    opacity: useMap(p, [a, b], [0, 1], reduced, 1),
    scale: useMap(p, [a, b], [0.9, 1], reduced, 1),
    y: useMap(p, [a, b], ['6vh', '0vh'], reduced, '0vh'),
  }
}

function Levels() {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.35 })
  const out = useMap(p, [0.9, 1], [1, 0], reduced, 1)
  const play = useMap(p, [0.04, 0.3], [0.04, 0.72], reduced, 0.72)
  const curX = useMap(p, [0.72, 0.88], ['0%', '135%'], reduced, '135%')
  const curY = useMap(p, [0.72, 0.88], ['0%', '55%'], reduced, '55%')
  const strike = useMap(p, [0.52, 0.64], [0, 1], reduced, 1)
  const b1 = useMap(p, [0.46, 0.52], [0, 1], reduced, 1)
  const b2 = useMap(p, [0.48, 0.54], [0, 1], reduced, 1)
  const b3 = useMap(p, [0.5, 0.56], [0, 1], reduced, 1)
  const drift1 = useMap(p, [0, 1], ['3vh', '-4vh'], reduced, '0vh')
  const drift2 = useMap(p, [0, 1], ['6vh', '-9vh'], reduced, '0vh')
  const drift3 = useMap(p, [0, 1], ['9vh', '-14vh'], reduced, '0vh')
  const w1 = usePop(p, 0.02, 0.12)
  const w2 = usePop(p, 0.22, 0.32)
  const w3 = usePop(p, 0.42, 0.52)
  const w4 = usePop(p, 0.64, 0.74)
  const say = [
    ['2%', 'you just posted the best edit of your month.'],
    ['22%', 'someone in the comments asks where they can see more.'],
    ['42%', 'so you point them at your bio. a list of links.'],
    ['64%', 'what do you put in your bio?'],
  ]
  return (
    <section ref={ref} id="story" className="relative h-[540svh]">
      {say.map(([t, s]) => (
        <i key={t} aria-hidden="true" data-say={s} style={{ top: t }} className="absolute left-0 block h-px w-px" />
      ))}
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div style={{ opacity: out }} className="absolute inset-0">
          {/* 1: the edit */}
          <motion.div style={{ ...w1 }} className="absolute top-[13vh] left-[4vw] w-[88vw] md:top-[14vh] md:left-[8vw] md:w-[26rem]">
            <motion.div style={{ y: drift1 }}>
              <Win title="best-edit-of-the-month.mp4">
                <div className="relative grid h-40 place-items-center overflow-hidden md:h-48" style={{ background: 'linear-gradient(135deg,#2b4fa3,#5fd1b6 60%,#f19b78)' }}>
                  <div aria-hidden="true" className="speckle absolute inset-0 opacity-50" />
                  <Pixels rows={PLAY} fill={CREAM} className="relative size-14" />
                  <span className="pix absolute bottom-2 left-2 px-1.5 py-0.5 text-[0.56rem] tracking-[0.1em] uppercase" style={{ background: INK, color: CREAM }}>
                    00:42
                  </span>
                </div>
                <PlayerBar at={play} />
              </Win>
            </motion.div>
          </motion.div>
          {/* 2: the question */}
          <motion.div style={{ ...w2 }} className="absolute top-[36vh] right-[4vw] w-[78vw] md:top-[20vh] md:right-[9vw] md:w-[22rem]">
            <motion.div style={{ y: drift2 }}>
              <Win title="comments (1)">
                <div className="p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="pix text-[0.7rem] tracking-[0.08em] uppercase">@someone</span>
                    <span className="text-[0.64rem] opacity-55 italic">2 min ago</span>
                  </div>
                  <p className="mt-3 text-[0.86rem] leading-[1.6]">wait. where can i see more??</p>
                  <div className="mt-4 flex items-center gap-2 text-[#ec5a4f]">
                    <Pixels rows={HEART} fill="#ec5a4f" className="size-4" />
                    <span className="pix text-[0.66rem] text-[#0c1544]">3</span>
                  </div>
                </div>
              </Win>
            </motion.div>
          </motion.div>
          {/* 3: the list */}
          <motion.div style={{ ...w3 }} className="absolute top-[55vh] left-[4vw] w-[78vw] md:top-[50vh] md:left-[16vw] md:w-[23rem]">
            <motion.div style={{ y: drift3 }}>
              <Win title="link-in-bio.txt">
                <div className="relative grid gap-3 p-5">
                  {[b1, b2, b3].map((b, i) => (
                    <motion.span key={i} style={{ scaleX: b }} className="block h-4 origin-left bg-[#0c1544]/85" />
                  ))}
                  <motion.span aria-hidden="true" style={{ scaleX: strike }} className="absolute top-1/2 right-2 left-2 block h-[3px] origin-left -rotate-2 bg-[#ec5a4f]" />
                </div>
                <p className="pix border-t border-[#0c1544]/20 px-5 py-2.5 text-[0.62rem] tracking-[0.1em] uppercase opacity-70">a row of white buttons</p>
              </Win>
            </motion.div>
          </motion.div>
          {/* 4: the choice */}
          <motion.div style={{ ...w4 }} className="absolute top-[71vh] right-[4vw] w-[84vw] md:top-[56vh] md:right-[8vw] md:w-[22rem]">
            <Win title="decision.exe">
              <div className="p-5">
                <p className="text-[0.9rem] leading-[1.5] italic">what do you put in your bio?</p>
                <div className="relative mt-4 grid gap-2">
                  <span className="pix border border-[#0c1544]/50 px-3 py-2 text-[0.7rem] tracking-[0.08em] uppercase opacity-60">
                    <b className="mr-2">A)</b>a list of links
                  </span>
                  <span className="pix border border-[#0c1544] px-3 py-2 text-[0.7rem] tracking-[0.08em] uppercase" style={{ background: '#5fd1b6' }}>
                    <b className="mr-2">B)</b>a page that&apos;s yours
                  </span>
                  <motion.span aria-hidden="true" style={{ x: curX, y: curY }} className="pointer-events-none absolute top-[10%] left-[18%]">
                    <Pixels rows={ARROW} fill="#fff" className="size-7 drop-shadow-[1.5px_1.5px_0_#0c1544]" />
                  </motion.span>
                </div>
              </div>
            </Win>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the answer: the screen flashes, then it comes in over the mountains */

function Impact() {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.35 })
  const flash = useMap(p, [0.08, 0.13, 0.26, 0.36], [0, 1, 1, 0], reduced, 0)
  const echoY = useMap(p, [0.3, 1], ['30vh', '-34vh'], reduced, '0vh')
  const echo2Y = useMap(p, [0.3, 1], ['12vh', '-16vh'], reduced, '0vh')
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
      <i aria-hidden="true" data-say="good choice. it doesn't have to be a list." className="absolute top-[8%] left-0 block h-px w-px" />
      <i aria-hidden="true" data-say="make it a place. a few things it can do:" className="absolute top-[64%] left-0 block h-px w-px" />
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <Mountains p={p} className="opacity-90" />
        <motion.span aria-hidden="true" style={{ y: echoY }} className="disp absolute top-[34%] -left-[2%] text-[clamp(9rem,30vw,28rem)] text-transparent [-webkit-text-stroke:1.4px_rgb(244_234_214/0.28)]">
          place
        </motion.span>
        <motion.span aria-hidden="true" style={{ y: echo2Y }} className="disp absolute top-[8%] right-[-2%] text-[clamp(5rem,16vw,15rem)] text-transparent [-webkit-text-stroke:1.4px_rgb(244_234_214/0.22)]">
          moves
        </motion.span>
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
      <i aria-hidden="true" data-say="ten ways to lay a page out. keep scrolling to try them." className="absolute top-0 left-0 block h-px w-px" />
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
                    <span className="text-[0.66rem] tabular-nums">{String(n + 1).padStart(2, '0')}</span>
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
              <span className="tabular-nums text-white/45">{String(i + 1).padStart(2, '0')}</span> {LAYOUTS[i].name.toLowerCase()}: {LAYOUTS[i].note}
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
      <i aria-hidden="true" data-say="seven backgrounds, drawn live by your graphics card." className="absolute top-0 left-0 block h-px w-px" />
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
                    <span className="text-[0.62rem] tabular-nums">{String(n + 1).padStart(2, '0')}</span>
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
        <i aria-hidden="true" data-say="keep it simple. that is the whole idea." className="absolute top-0 left-0 block h-px w-px" />
        <h2 className="disp text-[clamp(2.4rem,7vw,6.4rem)]">simple on purpose</h2>
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
        <Say who={`question ${String(index + 1).padStart(2, '0')}`}>
          <span className="text-[0.88rem] tracking-[0.04em] uppercase">{q}</span>
        </Say>
      </motion.div>
      <motion.div style={{ x: ax, opacity: ao, rotate: ar }} className="max-w-[34rem] justify-self-end">
        <Say who="answer" solid>
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
      <i aria-hidden="true" data-say="questions? asked a lot, answered short." className="absolute top-0 left-0 block h-px w-px" />
      <h2 className="disp text-[clamp(2.6rem,7vw,6.4rem)]" style={{ color: CREAM, ...HARD }}>common questions</h2>
      <p className="mt-5 text-[0.74rem] text-white italic">asked a lot, answered short</p>
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
      <i aria-hidden="true" data-say="last choice. pick your name." className="absolute top-0 left-0 block h-px w-px" />
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
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <defs>
          <filter id="speck" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n" />
            <feColorMatrix in="n" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 9 -6" result="dots" />
            <feComposite in="dots" in2="SourceAlpha" operator="in" result="d" />
            <feBlend in="SourceGraphic" in2="d" mode="screen" />
          </filter>
        </defs>
      </svg>
      <FixedMesh />
      <Hud />
      <main className="relative z-10">
        <Hero />
        <Levels />
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
