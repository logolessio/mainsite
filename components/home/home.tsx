'use client'

import '@/components/editor/editor.css'
import { AnimatePresence, type MotionValue, motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, Check, Loader2, X } from 'lucide-react'
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { BioPage } from '@/components/bio/bio-page'
import { fontClass } from '@/components/bio/bits'
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
    <div className={cn('relative shrink-0 overflow-hidden rounded-[2.2rem] border border-white/20 bg-black shadow-[0_50px_140px_rgb(0_0_0/0.8)]', className)} style={{ width, height: 844 * k, ...style }}>
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: 390, height: 844, transform: `scale(${k})` }}>
        <BioPage mode="mini" data={data} />
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]" />
    </div>
  )
}

/* ------------------------------------------------------------------ claim a name */

type Avail = null | 'checking' | { ok: boolean; message: string }
export function ClaimBar({ big = false, autoFocus = false }: { big?: boolean; autoFocus?: boolean }) {
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
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        go()
      }}
      className="w-full"
    >
      <div className={cn('group flex w-full items-center rounded-full border border-white/20 bg-black/55 pl-5 backdrop-blur-xl transition-colors focus-within:border-white/60', big ? 'h-[4.4rem] pl-7' : 'h-14')}>
        <span className={cn('select-none text-white/45', big ? 'text-[1.25rem]' : 'text-[1rem]')}>logoless.io/</span>
        <input
          value={v}
          onChange={(e) => setV(e.target.value.toLowerCase().replace(/[^a-z0-9._\-~!$*+=]/g, '').slice(0, 30))}
          placeholder="yourname"
          autoFocus={autoFocus}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label="The name you want"
          className={cn('min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/25', big ? 'text-[1.25rem]' : 'text-[1rem]')}
        />
        <span className="mr-2 grid size-8 place-items-center" aria-live="polite">
          {avail === 'checking' ? <Loader2 className="size-4 animate-spin text-white/45" /> : avail ? avail.ok ? <Check className="size-[1.1rem] text-white" /> : <X className="size-[1.1rem] text-white/50" /> : null}
        </span>
        <button type="submit" className={cn('mr-1.5 inline-flex items-center gap-2 rounded-full bg-white font-medium text-black transition-transform hover:scale-[1.03] active:scale-95', big ? 'h-[3.3rem] px-8 text-[1rem]' : 'h-11 px-6 text-[0.9rem]')}>
          Claim it <ArrowRight className="size-4" />
        </button>
      </div>
      <p className="mt-3 h-5 pl-6 text-[0.82rem] text-white/45">{avail && avail !== 'checking' ? (avail.ok ? `logoless.io/${v.trim().toLowerCase()} is yours to take.` : avail.message) : 'Names start at one character. Punctuation goes anywhere.'}</p>
    </form>
  )
}

/* ------------------------------------------------------------------ nav */

function Nav() {
  const { scrollY } = useScroll()
  const [solid, setSolid] = useState(false)
  useMotionValueEvent(scrollY, 'change', (v) => setSolid(v > 40))
  return (
    <header className={cn('fixed inset-x-0 top-0 z-50 grid h-16 grid-cols-[1fr_auto_1fr] items-center px-5 transition-all duration-500 md:px-10', solid ? 'border-b border-white/10 bg-black/60 backdrop-blur-xl' : 'border-b border-transparent')}>
      <nav className="hidden items-center gap-8 text-[0.86rem] text-white/60 md:flex" aria-label="Sections">
        {[['Layouts', '#layouts'], ['Backgrounds', '#backgrounds'], ['Cursors', '#cursors'], ['Everything else', '#more']].map(([n, h]) => (
          <a key={h} href={h} className="transition-colors hover:text-white">
            {n}
          </a>
        ))}
      </nav>
      <div className="col-start-3 flex items-center justify-self-end gap-2">
        <a href="/login" className="inline-flex h-10 items-center rounded-full px-4 text-[0.86rem] text-white/75 transition-colors hover:text-white">
          Log in
        </a>
        <a href="/signup" className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-[0.86rem] font-medium text-black transition-transform hover:scale-[1.04] active:scale-95">
          Get started <ArrowRight className="size-3.5" />
        </a>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ hero */

function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { px, py } = usePointer(ref)
  const { reduced } = useMotionPrefs()
  const level = useQuiet()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const p = useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.4 })
  const bgY = useTransform(p, [0, 1], ['0%', '22%'])
  const h1Y = useTransform(p, [0, 1], ['0%', '-26%'])
  const fade = useTransform(p, [0, 0.8], [1, 0])
  const subY = useTransform(p, [0, 1], ['0%', '-12%'])
  const a = useTransform(p, [0, 1], ['0%', '-60%'])
  const b = useTransform(p, [0, 1], ['0%', '-38%'])
  const c = useTransform(p, [0, 1], ['0%', '-84%'])
  const lean = useTransform(px, (v) => v * 18)
  const lean2 = useTransform(px, (v) => v * -26)
  return (
    <section ref={ref} className="relative isolate min-h-[100svh] overflow-hidden">
      <motion.div aria-hidden="true" className="absolute inset-[-8%] -z-10" style={{ y: bgY }}>
        <ShaderRunner id="liquid" tone={1} intensity={78} speed={46} px={px} py={py} level={level} reduced={reduced} />
      </motion.div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[radial-gradient(90%_70%_at_30%_40%,transparent,rgb(0_0_0/0.75))]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-gradient-to-t from-black to-transparent" />

      <motion.div style={{ opacity: fade }} className="mx-auto grid min-h-[100svh] w-full max-w-[96rem] grid-cols-1 items-center gap-10 px-5 pt-28 pb-24 md:px-10 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE }} className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-4 py-1.5 text-[0.78rem] text-white/75 backdrop-blur-xl">
            <span className="size-1.5 rounded-full bg-white" /> The link in bio for editors
          </motion.p>
          <motion.h1 style={{ y: h1Y }} className="text-[clamp(3.8rem,10.4vw,10.5rem)] leading-[0.86] font-semibold tracking-[-0.065em] text-white">
            {['Link in bio', 'that moves.'].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.08em]">
                <motion.span className="block" initial={{ y: '112%', rotate: 2 }} animate={{ y: 0, rotate: 0 }} transition={{ duration: 1.2, delay: 0.12 + i * 0.12, ease: EASE }}>
                  {line}
                </motion.span>
              </span>
            ))}
          </motion.h1>
          <motion.div style={{ y: subY }} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.55, ease: EASE }} className="mt-9 max-w-[34rem]">
            <p className="text-[1.08rem] leading-relaxed text-white/60">A full-screen page for your best work: shaders, music, ten layouts and a cursor of your own. Claim logoless.io/you in a few seconds. Free.</p>
            <div className="mt-8">
              <ClaimBar />
            </div>
          </motion.div>
        </div>

        {/* a fan of real pages, each at its own depth */}
        <div className="relative hidden h-[40rem] lg:block" aria-hidden="true">
          <motion.div style={{ y: b, x: lean2, rotate: -9 }} className="absolute top-[6%] left-[-4%]">
            <Phone id="poster" width={200} className="opacity-90" />
          </motion.div>
          <motion.div style={{ y: c, x: lean, rotate: 8 }} className="absolute top-[14%] right-[-6%]">
            <Phone id="index" width={210} className="opacity-90" />
          </motion.div>
          <motion.div style={{ y: a, x: lean }} className="absolute top-[-2%] left-1/2 -translate-x-1/2">
            <Phone id="aura" width={290} />
          </motion.div>
        </div>
      </motion.div>

      <motion.div aria-hidden="true" style={{ opacity: fade }} className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[0.68rem] tracking-[0.3em] text-white/40 uppercase">
        scroll
        <motion.span animate={{ scaleY: [0.2, 1, 0.2], originY: 0 }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} className="block h-8 w-px bg-white/50" />
      </motion.div>
    </section>
  )
}

/* ------------------------------------------------------------------ marquee */

function Marquee() {
  const words = ['shaders', 'cursors', 'music', 'ten layouts', 'parallax', 'videos', 'analytics', 'enter screens', 'one character names']
  const row = (
    <span className="flex shrink-0 items-center gap-12 pr-12">
      {words.map((w) => (
        <span key={w} className="flex items-center gap-12 text-[clamp(2.6rem,7vw,6rem)] leading-none font-semibold tracking-[-0.05em]">
          <span className="text-transparent [-webkit-text-stroke:1.2px_rgb(255_255_255/0.5)]">{w}</span>
          <span className="size-3 rounded-full bg-white/60" />
        </span>
      ))}
    </span>
  )
  const { scrollY } = useScroll()
  const x = useTransform(scrollY, (v) => -(v * 0.35))
  return (
    <div className="relative overflow-hidden border-y border-white/10 py-8" aria-hidden="true">
      <motion.div style={{ x }} className="flex w-max">
        {row}
        {row}
        {row}
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ ten layouts, pinned */

function Layouts() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 })
  const [i, setI] = useState(0)
  useMotionValueEvent(p, 'change', (v) => setI(Math.max(0, Math.min(LAYOUTS.length - 1, Math.floor(v * LAYOUTS.length * 0.999)))))
  const id = LAYOUTS[i].id as SampleId
  const tilt = useTransform(p, [0, 1], [-5, 5])
  const lift = useTransform(p, [0, 1], [30, -30])
  const num = useTransform(p, [0, 1], ['10%', '-30%'])
  return (
    <section ref={ref} id="layouts" className="relative h-[780svh]">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <motion.span aria-hidden="true" style={{ x: num }} className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-[clamp(14rem,44vw,44rem)] leading-none font-semibold tracking-[-0.08em] text-transparent [-webkit-text-stroke:1.5px_rgb(255_255_255/0.1)]">
          10
        </motion.span>
        <div className="relative mx-auto grid w-full max-w-[90rem] items-center gap-10 px-5 md:px-10 lg:grid-cols-[1fr_auto]">
          <div>
            <h2 className="text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.9] font-semibold tracking-[-0.055em]">
              Ten layouts.
              <br />
              <span className="text-white/35">One page.</span>
            </h2>
            <p className="mt-6 max-w-[28rem] text-[1.02rem] leading-relaxed text-white/55">Same links, ten ways to show them. Some float, some pin, some run sideways. Every one of them moves as you scroll.</p>
            <ol className="mt-10 grid max-w-[30rem] grid-cols-2 gap-x-8 gap-y-1">
              {LAYOUTS.map((l, n) => (
                <li key={l.id} className={cn('flex items-baseline gap-3 py-1.5 text-[1.05rem] tracking-[-0.02em] transition-all duration-500', n === i ? 'translate-x-2 text-white' : 'text-white/30')}>
                  <span className="font-mono text-[0.7rem] tabular-nums">{String(n + 1).padStart(2, '0')}</span>
                  {l.name}
                </li>
              ))}
            </ol>
            <p className="mt-6 h-6 text-[0.86rem] text-white/45">{LAYOUTS[i].note}</p>
          </div>
          <motion.div style={{ rotate: tilt, y: lift }} className="mx-auto">
            <div className="relative h-[36rem] w-[320px] overflow-hidden rounded-[2.4rem] border border-white/25 bg-black shadow-[0_60px_160px_rgb(0_0_0/0.9)] md:h-[39.5rem] md:w-[352px]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div key={id} initial={{ opacity: 0, scale: 1.06, filter: 'blur(14px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, scale: 0.96, filter: 'blur(14px)' }} transition={{ duration: 0.6, ease: EASE }} className="absolute inset-0">
                  <div className="absolute top-0 left-0 origin-top-left scale-[0.82] md:scale-[0.9]" style={{ width: 390, height: 700 }}>
                    <BioPage mode="mini" data={SAMPLES[id]} />
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ shaders, pinned */

function Backgrounds() {
  const ref = useRef<HTMLElement>(null)
  const { px, py } = usePointer(ref)
  const { reduced } = useMotionPrefs()
  const level = useQuiet()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 })
  const [i, setI] = useState(0)
  useMotionValueEvent(p, 'change', (v) => setI(Math.max(0, Math.min(BIO_SHADERS.length - 1, Math.floor(v * BIO_SHADERS.length * 0.999)))))
  const s = BIO_SHADERS[i]
  const scale = useTransform(p, [0, 1], [1, 1.12])
  return (
    <section ref={ref} id="backgrounds" className="relative h-[560svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div className="absolute inset-0" style={{ scale }}>
          <ShaderRunner key={s.id} id={s.id as ShaderId} tone={2} intensity={86} speed={55} px={px} py={py} level={level} reduced={reduced} />
        </motion.div>
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_50%,transparent,rgb(0_0_0/0.7))]" />
        <div className="relative mx-auto flex h-full w-full max-w-[96rem] flex-col justify-between px-5 py-24 md:px-10">
          <div>
            <p className="mb-5 inline-flex rounded-full border border-white/25 bg-black/45 px-4 py-1.5 text-[0.78rem] text-white/75 backdrop-blur-xl">Backgrounds</p>
            <h2 className="max-w-[40rem] text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.9] font-semibold tracking-[-0.055em]">
              They do not sit there.
            </h2>
            <p className="mt-5 max-w-[26rem] text-[1.02rem] leading-relaxed text-white/60">Drawn live by the graphics card. They follow your pointer, listen to your music, and blur as far as you like.</p>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <AnimatePresence mode="wait">
              <motion.span key={s.id} initial={{ y: 40, opacity: 0, filter: 'blur(12px)' }} animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }} exit={{ y: -30, opacity: 0, filter: 'blur(12px)' }} transition={{ duration: 0.5, ease: EASE }} className="text-[clamp(4rem,14vw,13rem)] leading-[0.82] font-semibold tracking-[-0.07em]">
                {s.name}
              </motion.span>
            </AnimatePresence>
            <ul className="flex max-w-[22rem] flex-wrap justify-end gap-2" aria-label="Backgrounds">
              {BIO_SHADERS.map((b, n) => (
                <li key={b.id} className={cn('rounded-full border px-4 py-1.5 text-[0.82rem] backdrop-blur-xl transition-all duration-500', n === i ? 'border-white bg-white text-black' : 'border-white/25 bg-black/40 text-white/60')}>
                  {b.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ cursors */

function Cursors() {
  const [pick, setPick] = useState('arrow')
  const [ink, setInk] = useState<'white' | 'black'>('white')
  const css = cursorCss(pick, ink, 40)
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y1 = useTransform(scrollYProgress, [0, 1], ['10%', '-18%'])
  const y2 = useTransform(scrollYProgress, [0, 1], ['-4%', '14%'])
  return (
    <section ref={ref} id="cursors" className="relative overflow-hidden border-t border-white/10 py-32 md:py-44" style={{ cursor: css.arrow }}>
      <motion.span aria-hidden="true" style={{ y: y2 }} className="pointer-events-none absolute -right-[4%] -bottom-[8%] text-[clamp(10rem,34vw,34rem)] leading-none font-semibold tracking-[-0.08em] text-transparent [-webkit-text-stroke:1.5px_rgb(255_255_255/0.09)]">
        you
      </motion.span>
      <div className="relative mx-auto grid w-full max-w-[90rem] gap-14 px-5 md:px-10 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div style={{ y: y1 }}>
          <h2 className="text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.9] font-semibold tracking-[-0.055em]">
            Your cursor.
            <br />
            <span className="text-white/35">Move it.</span>
          </h2>
          <p className="mt-6 max-w-[28rem] text-[1.02rem] leading-relaxed text-white/55">Pick one of ours (this whole section is wearing it) or upload a picture or an SVG of your own. Each has a second shape that appears over your links. Add a trail if you like.</p>
          <div className="mt-8 inline-flex rounded-full border border-white/20 p-1 text-[0.82rem]">
            {(['white', 'black'] as const).map((c) => (
              <button key={c} type="button" onClick={() => setInk(c)} aria-pressed={ink === c} className={cn('h-9 rounded-full px-5 capitalize transition-colors', ink === c ? 'bg-white text-black' : 'text-white/55 hover:text-white')}>
                {c}
              </button>
            ))}
          </div>
        </motion.div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {CURSORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setPick(c.id)}
              aria-pressed={pick === c.id}
              aria-label={c.name}
              className={cn('group relative grid aspect-square place-items-center overflow-hidden rounded-2xl border transition-all duration-500', pick === c.id ? 'border-white' : 'border-white/15 hover:border-white/50')}
              style={{ background: ink === 'white' ? '#0e0e0e' : '#e8e8e8', cursor: cursorCss(c.id, ink, 40).link }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/svg+xml,${encodeURIComponent(cursorSvg(c.arrow, ink, 32))}`} alt="" width={36} height={36} className="transition-transform duration-500 group-hover:scale-125" />
              <span className={cn('absolute bottom-2 text-[0.62rem] tracking-wide opacity-0 transition-opacity group-hover:opacity-100', ink === 'white' ? 'text-white/60' : 'text-black/60')}>{c.name}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ everything else */

function Tile({ children, className, depth = 0 }: { children: ReactNode; className?: string; depth?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [depth * 80, depth * -80])
  return (
    <motion.div ref={ref} style={{ y }} initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: '-12%' }} transition={{ duration: 0.9, ease: EASE }} className={cn('relative overflow-hidden rounded-[1.8rem] border border-white/15 bg-white/[0.035] p-7 backdrop-blur-xl md:p-9', className)}>
      {children}
    </motion.div>
  )
}

function More() {
  const bars = [0.5, 0.9, 0.6, 1, 0.4, 0.8, 0.55, 0.95, 0.35, 0.7, 0.5, 0.85]
  const days = [3, 5, 4, 9, 7, 12, 10, 16, 14, 22, 19, 31, 27, 40]
  return (
    <section id="more" className="relative border-t border-white/10 py-32 md:py-44">
      <div className="mx-auto w-full max-w-[90rem] px-5 md:px-10">
        <h2 className="max-w-[48rem] text-[clamp(2.8rem,7vw,6.5rem)] leading-[0.9] font-semibold tracking-[-0.055em]">
          Everything a page needs.
          <span className="text-white/35"> And a few things it does not.</span>
        </h2>
        <div className="mt-16 grid gap-4 md:grid-cols-6">
          <Tile depth={0.2} className="min-h-[22rem] md:col-span-3">
            <p className="text-[0.78rem] text-white/45">Music</p>
            <p className="mt-2 max-w-[18rem] text-[1.9rem] leading-[1] font-medium tracking-[-0.04em]">The page moves with the sound.</p>
            <div className="absolute inset-x-8 bottom-8 flex h-24 items-end gap-1.5">
              {bars.map((b, i) => (
                <motion.span key={i} className="flex-1 origin-bottom rounded-full bg-white/80" animate={{ scaleY: [b * 0.4, b, b * 0.5, b * 0.9, b * 0.4] }} transition={{ duration: 1.8 + (i % 4) * 0.35, repeat: Infinity, ease: 'easeInOut' }} style={{ height: '100%' }} />
              ))}
            </div>
          </Tile>
          <Tile depth={-0.15} className="min-h-[22rem] md:col-span-3">
            <p className="text-[0.78rem] text-white/45">Names</p>
            <p className="mt-2 text-[1.9rem] leading-[1] font-medium tracking-[-0.04em]">From one character.</p>
            <p className="absolute right-6 bottom-2 text-[12rem] leading-none font-semibold tracking-[-0.08em] md:text-[15rem]">k</p>
            <p className="absolute bottom-8 left-8 text-[1.05rem] text-white/50">logoless.io/k</p>
          </Tile>
          <Tile depth={0.1} className="min-h-[18rem] md:col-span-2">
            <p className="text-[0.78rem] text-white/45">Videos</p>
            <p className="mt-2 text-[1.5rem] leading-[1.05] font-medium tracking-[-0.035em]">Your edits play right on the page.</p>
            <div className="absolute inset-x-7 bottom-7 grid aspect-video place-items-center rounded-xl border border-white/20 bg-black/50">
              <span className="grid size-12 place-items-center rounded-full bg-white text-black">
                <span className="ml-1 block size-0 border-y-[7px] border-l-[12px] border-y-transparent border-l-black" />
              </span>
            </div>
          </Tile>
          <Tile depth={-0.2} className="min-h-[18rem] md:col-span-2">
            <p className="text-[0.78rem] text-white/45">Insights</p>
            <p className="mt-2 text-[1.5rem] leading-[1.05] font-medium tracking-[-0.035em]">See who looks, and what they press.</p>
            <div className="absolute inset-x-7 bottom-7 flex h-24 items-end gap-1">
              {days.map((d, i) => (
                <motion.span key={i} initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.04, ease: EASE }} className="flex-1 origin-bottom rounded-sm bg-white/80" style={{ height: `${(d / 40) * 100}%` }} />
              ))}
            </div>
          </Tile>
          <Tile depth={0.15} className="min-h-[18rem] md:col-span-2">
            <p className="text-[0.78rem] text-white/45">Enter screens</p>
            <p className="mt-2 text-[1.5rem] leading-[1.05] font-medium tracking-[-0.035em]">Make them press first.</p>
            <p className="absolute bottom-8 left-7 text-[0.8rem] tracking-[0.34em] text-white/70 uppercase">
              click to enter
              <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                {' '}
                |
              </motion.span>
            </p>
          </Tile>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the end */

function Outro() {
  const ref = useRef<HTMLElement>(null)
  const { px, py } = usePointer(ref)
  const { reduced } = useMotionPrefs()
  const level = useQuiet()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] })
  const y = useTransform(scrollYProgress, [0, 1], ['-12%', '0%'])
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1])
  return (
    <section ref={ref} className="relative isolate overflow-hidden border-t border-white/10">
      <motion.div aria-hidden="true" className="absolute inset-[-6%] -z-10" style={{ y }}>
        <ShaderRunner id="mercury" tone={2} intensity={70} speed={50} px={px} py={py} level={level} reduced={reduced} />
      </motion.div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/45" />
      <motion.div style={{ scale }} className="mx-auto flex min-h-[100svh] w-full max-w-[72rem] flex-col items-center justify-center px-5 py-32 text-center">
        <h2 className="text-[clamp(3.6rem,12vw,11rem)] leading-[0.85] font-semibold tracking-[-0.07em]">Claim it.</h2>
        <p className="mt-6 max-w-[28rem] text-[1.05rem] text-white/60">It takes a few seconds, it is free, and the good names go fast.</p>
        <div className="mt-10 w-full max-w-[40rem]">
          <ClaimBar big />
        </div>
      </motion.div>
      <footer className="border-t border-white/10 bg-black px-5 py-10 md:px-10">
        <div className="mx-auto flex w-full max-w-[90rem] flex-wrap items-center justify-between gap-6 text-[0.82rem] text-white/45">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {[['Terms', '/legal/terms'], ['Privacy', '/legal/privacy'], ['Log in', '/login'], ['Get started', '/signup']].map(([n, h]) => (
              <li key={h}>
                <a href={h} className="transition-colors hover:text-white">
                  {n}
                </a>
              </li>
            ))}
          </ul>
          <span>© {new Date().getFullYear()} logoless</span>
        </div>
      </footer>
    </section>
  )
}

export function Home() {
  return (
    <div className={cn('ed relative min-h-dvh overflow-x-clip', fontClass('geist'))}>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Layouts />
        <Backgrounds />
        <Cursors />
        <More />
        <Outro />
      </main>
    </div>
  )
}
