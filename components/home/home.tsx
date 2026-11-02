'use client'

import '@/components/editor/editor.css'
import { AnimatePresence, type MotionValue, motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, Check, Loader2, X } from 'lucide-react'
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

/** A scroll-driven number that stays at its end value for people who asked for less motion. */
function useDepth<T extends number | string>(p: MotionValue<number>, from: T[], to: T[], input: number[], reduced: boolean) {
  return useTransform(p, input, reduced ? to : from)
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

/** Where we are on the page: the number, the Japanese word and the English one. */
const SECTIONS = [
  { id: 'top', jp: 'リンク', en: 'home' },
  { id: 'words', jp: '言葉', en: 'words' },
  { id: 'layouts', jp: '配置', en: 'layouts' },
  { id: 'backgrounds', jp: '背景', en: 'backgrounds' },
  { id: 'cursors', jp: 'カーソル', en: 'cursors' },
  { id: 'more', jp: '他にも', en: 'the rest' },
  { id: 'claim', jp: '名前', en: 'your name' },
] as const

/* ------------------------------------------------------------------ a page in a phone */

function Phone({ id, width = 260, className, style }: { id: SampleId; width?: number; className?: string; style?: CSSProperties }) {
  const data: BioPageData = SAMPLES[id]
  const k = width / 390
  return (
    <div className={cn('relative shrink-0 overflow-hidden rounded-[2.2rem] border border-white/25 bg-black shadow-[0_50px_140px_rgb(0_0_0/0.85)]', className)} style={{ width, height: 844 * k, ...style }}>
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: 390, height: 844, transform: `scale(${k})` }}>
        <BioPage mode="mini" data={data} />
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]" />
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
      <div className={cn('flex w-full items-center border border-white/35 bg-black/60 pl-4 backdrop-blur-md transition-colors focus-within:border-white', big ? 'h-[4.2rem] pl-6' : 'h-[3.2rem]')}>
        <span className={cn('select-none text-white/45', big ? 'text-[1.1rem]' : 'text-[0.88rem]')}>logoless.io/</span>
        <input
          value={v}
          onChange={(e) => setV(e.target.value.toLowerCase().replace(/[^a-z0-9._\-~!$*+=]/g, '').slice(0, 30))}
          placeholder="yourname"
          autoFocus={autoFocus}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label="the name you want"
          className={cn('min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-white/25', big ? 'text-[1.1rem]' : 'text-[0.88rem]')}
        />
        <span className="mr-2 grid size-7 place-items-center" aria-live="polite">
          {avail === 'checking' ? <Loader2 className="size-4 animate-spin text-white/45" /> : avail ? avail.ok ? <Check className="size-4 text-white" /> : <X className="size-4 text-white/50" /> : null}
        </span>
        <button type="submit" className={cn('btn btn-solid h-full border-0', big ? 'px-8' : 'px-5')}>
          claim <ArrowRight className="size-3.5" />
        </button>
      </div>
      <p className="mt-3 h-5 text-[0.74rem] text-white/45">{avail && avail !== 'checking' ? (avail.ok ? `logoless.io/${v.trim().toLowerCase()} is free. it's yours if you want it.` : avail.message.toLowerCase()) : 'one letter is fine. dots and dashes too.'}</p>
    </form>
  )
}

/* ------------------------------------------------------------------ the page's own furniture: a margin, a counter, a vertical caption */

function Nav() {
  const [at, setAt] = useState(0)
  useEffect(() => {
    let raf = 0
    const read = () => {
      raf = 0
      let n = 0
      SECTIONS.forEach((s, i) => {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.45) n = i
      })
      setAt(n)
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
  const s = SECTIONS[at]
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between px-5 md:px-8">
        <p className="cap flex items-center gap-3 text-white/70 mix-blend-difference" aria-live="polite">
          <span className="tabular-nums">{String(at + 1).padStart(2, '0')}</span>
          <span className="h-px w-6 bg-white/50" />
          <span className="jp tracking-normal normal-case">{s.jp}</span>
          <span className="hidden sm:inline">{s.en}</span>
        </p>
        <div className="flex items-center gap-1">
          <a href="/login" className="cap inline-flex h-10 items-center px-4 text-white/70 transition-colors hover:text-white">
            log in
          </a>
          <a href="/signup" className="btn">
            get started
          </a>
        </div>
      </header>
      {/* the margin of the page, the way a manga page has one */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-2 z-40 border border-white/[0.07] md:inset-3">
        {['top-0 left-0 border-t border-l', 'top-0 right-0 border-t border-r', 'bottom-0 left-0 border-b border-l', 'bottom-0 right-0 border-b border-r'].map((c) => (
          <span key={c} className={cn('absolute size-3 border-white/40', c)} />
        ))}
      </div>
      <p aria-hidden="true" className="jp vert pointer-events-none fixed top-1/2 right-4 z-40 hidden -translate-y-1/2 text-[0.7rem] tracking-[0.5em] text-white/30 md:block">
        動くリンクをつくろう
      </p>
    </>
  )
}

/** A sound effect, drawn big and hollow, drifting at its own speed behind the page. */
function Sfx({ text, p, from, to, className }: { text: string; p: MotionValue<number>; from: string; to: string; className?: string }) {
  const y = useTransform(p, [0, 1], [from, to])
  return (
    <motion.span aria-hidden="true" style={{ y }} className={cn('jp pointer-events-none absolute leading-none font-black text-transparent select-none [-webkit-text-stroke:1.2px_rgb(255_255_255/0.08)]', className)}>
      {text}
    </motion.span>
  )
}

/* ------------------------------------------------------------------ hero */

function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { px, py } = usePointer(ref)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 110, damping: 28, mass: 0.4 })
  const lean = useTransform(px, (v) => v * 14)

  const titleScale = useDepth(p, [1, 0.74], [0.74, 0.74], [0, 0.55], reduced)
  const titleY = useDepth(p, ['0vh', '-16vh'], ['-16vh', '-16vh'], [0, 0.55], reduced)
  const titleFade = useTransform(p, [0, 0.42], [1, 0])
  const claimFade = useTransform(p, [0, 0.22], [1, 0])
  const mainY = useDepth(p, ['78vh', '2vh'], ['2vh', '2vh'], [0, 0.72], reduced)
  const mainScale = useDepth(p, [0.86, 1.1], [1.1, 1.1], [0, 0.72], reduced)
  const leftY = useDepth(p, ['96vh', '12vh'], ['12vh', '12vh'], [0, 0.78], reduced)
  const rightY = useDepth(p, ['110vh', '18vh'], ['18vh', '18vh'], [0, 0.82], reduced)
  const leftX = useDepth(p, ['-8vw', '-30vw'], ['-30vw', '-30vw'], [0, 0.78], reduced)
  const rightX = useDepth(p, ['8vw', '30vw'], ['30vw', '30vw'], [0, 0.82], reduced)
  const rays = useDepth(p, [0, 38], [38, 38], [0, 1], reduced)
  const raysScale = useDepth(p, [0.9, 1.7], [1.7, 1.7], [0, 1], reduced)
  const raysFade = useTransform(p, [0, 0.12, 0.8, 1], [0.9, 1, 0.5, 0])
  const note = useTransform(p, [0.62, 0.78], [0, 1])

  return (
    <section ref={ref} id="top" className="relative h-[250svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div aria-hidden="true" style={{ rotate: rays, scale: raysScale, opacity: raysFade }} className="speed absolute top-[62%] left-1/2 aspect-square w-[130vmax] -translate-x-1/2 -translate-y-1/2" />
        <div aria-hidden="true" className="tone absolute inset-x-0 bottom-0 h-[46%]" />
        <Sfx text="ゴゴゴ" p={p} from="0vh" to="-30vh" className="top-[18%] -left-[2%] text-[clamp(8rem,22vw,22rem)]" />
        <Sfx text="ドン" p={p} from="0vh" to="-52vh" className="top-[46%] -right-[1%] text-[clamp(6rem,17vw,17rem)]" />

        <div className="relative mx-auto flex h-full w-full max-w-[96rem] flex-col items-center px-5 pt-[13vh] text-center md:px-10">
          <motion.p className="text-[0.78rem] text-white/60 italic" style={{ opacity: titleFade }}>
            a link in bio for people who make things move.
          </motion.p>
          <motion.h1 style={{ scale: titleScale, y: titleY, opacity: titleFade }} className="disp mt-5 text-[clamp(3.1rem,9.2vw,10rem)] text-white">
            {['link in bio,', 'but make it move.'].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-[0.06em]">
                <motion.span className="block" initial={{ y: '115%' }} animate={{ y: 0 }} transition={{ duration: 1.15, delay: 0.15 + i * 0.12, ease: EASE }}>
                  {line}
                </motion.span>
              </span>
            ))}
          </motion.h1>
          <motion.div style={{ opacity: claimFade }} initial={{ y: 18 }} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.6, ease: EASE }} className="mt-8 w-full max-w-[30rem]">
            <ClaimBar />
          </motion.div>
        </div>

        {/* three real pages, each at its own depth, rising from under the title */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 flex h-full justify-center">
          <motion.div style={{ y: leftY, x: leftX, rotate: -7 }} className="absolute top-[6vh] hidden md:block">
            <Phone id="poster" width={236} />
          </motion.div>
          <motion.div style={{ y: rightY, x: rightX, rotate: 7 }} className="absolute top-[6vh] hidden md:block">
            <Phone id="index" width={236} />
          </motion.div>
          <motion.div style={{ y: mainY, scale: mainScale }} className="absolute top-[6vh] origin-top">
            <motion.div style={{ x: lean }}>
              <Phone id="aura" width={300} />
            </motion.div>
          </motion.div>
        </div>

        <motion.p style={{ opacity: note }} aria-hidden="true" className="cap absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50">
          ten layouts · seven shaders · thirteen cursors
        </motion.p>
        <motion.div aria-hidden="true" style={{ opacity: claimFade }} className="cap absolute bottom-8 left-8 hidden flex-col items-start gap-2 text-white/40 md:flex">
          scroll
          <motion.span animate={{ scaleY: [0.2, 1, 0.2] }} style={{ originY: 0 }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }} className="block h-7 w-px bg-white/50" />
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ a few words, lit as you read them */

function Word({ w, p, a, b }: { w: string; p: MotionValue<number>; a: number; b: number }) {
  const o = useTransform(p, [a, b], [0.14, 1])
  return (
    <motion.span style={{ opacity: o }} className="inline-block pr-[0.32em]">
      {w}
    </motion.span>
  )
}

function Words() {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })
  const text = "a link in bio is the first thing people open after your edit. so it shouldn't feel like a list in a drawer. give it a shader to sit on, a song to move to, a cursor that's yours, and your best work out front. then send everyone there."
  const words = text.split(' ')
  return (
    <section ref={ref} id="words" className="relative h-[300svh]">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <Sfx text="シュッ" p={p} from="30vh" to="-40vh" className="-top-[2%] -right-[3%] text-[clamp(6rem,15vw,15rem)]" />
        <Sfx text="ピカッ" p={p} from="60vh" to="-30vh" className="-bottom-[3%] -left-[2%] text-[clamp(5rem,12vw,12rem)]" />
        <div className="relative mx-auto w-full max-w-[64rem] px-6 md:px-10">
          <p className="cap mb-8 flex items-center gap-3 text-white/45">
            <span className="h-px w-8 bg-white/40" /> 02 · <span className="jp tracking-normal normal-case">言葉</span> words
          </p>
          <p className="text-[clamp(1.45rem,3.6vw,3.1rem)] leading-[1.22] tracking-[-0.03em]">
            {words.map((w, i) => (
              <Word key={i} w={w} p={p} a={reduced ? 0 : (i / words.length) * 0.78 + 0.04} b={reduced ? 0 : (i / words.length) * 0.78 + 0.12} />
            ))}
          </p>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ ten layouts, pinned */

function Layouts() {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 })
  const [i, setI] = useState(0)
  useMotionValueEvent(p, 'change', (v) => setI(Math.max(0, Math.min(LAYOUTS.length - 1, Math.floor(v * LAYOUTS.length * 0.999)))))
  const id = LAYOUTS[i].id as SampleId
  const tilt = useDepth(p, [-4, 4], [0, 0], [0, 1], reduced)
  const lift = useDepth(p, [24, -24], [0, 0], [0, 1], reduced)
  const num = useDepth(p, ['8%', '-26%'], ['0%', '0%'], [0, 1], reduced)
  const rays = useDepth(p, [0, 90], [0, 0], [0, 1], reduced)
  return (
    <section ref={ref} id="layouts" className="relative h-[820svh]">
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <motion.span aria-hidden="true" style={{ x: num }} className="disp pointer-events-none absolute top-1/2 -translate-y-1/2 text-[clamp(14rem,46vw,46rem)] text-transparent [-webkit-text-stroke:1.2px_rgb(255_255_255/0.1)]">
          10
        </motion.span>
        <div className="relative mx-auto grid w-full max-w-[90rem] items-center gap-5 px-6 pt-16 md:px-10 lg:grid-cols-[1fr_auto] lg:gap-16 lg:pt-0">
          <div className="text-center lg:text-left">
            <p className="cap mb-5 flex items-center justify-center gap-3 text-white/45 lg:justify-start">
              <span className="h-px w-8 bg-white/40" /> 03 · <span className="jp tracking-normal normal-case">配置</span> layouts
            </p>
            <h2 className="disp text-[clamp(2.8rem,7.4vw,7rem)]">
              ten layouts.
              <br />
              <span className="text-white/30">one page.</span>
            </h2>
            <p className="mx-auto mt-6 hidden max-w-[27rem] text-[0.86rem] leading-relaxed text-white/55 sm:block lg:mx-0">same links, ten ways to show them. some float, some pin, some run sideways. all of them move when you scroll.</p>
            <ol className="mt-9 hidden max-w-[30rem] grid-cols-2 gap-x-8 gap-y-0.5 md:grid">
              {LAYOUTS.map((l, n) => (
                <li key={l.id} className={cn('flex items-baseline gap-3 border-t border-white/10 py-2 text-[0.9rem] transition-all duration-500', n === i ? 'translate-x-2 text-white' : 'text-white/28')}>
                  <span className="text-[0.64rem] tabular-nums">{String(n + 1).padStart(2, '0')}</span>
                  {l.name.toLowerCase()}
                </li>
              ))}
            </ol>
            <p className="mt-4 h-5 text-[0.78rem] text-white/45 lg:mt-7">{LAYOUTS[i].note}</p>
          </div>
          <motion.div style={{ rotate: tilt, y: lift }} className="relative mx-auto">
            <motion.div aria-hidden="true" key={`r${i}`} initial={{ opacity: 0.7, scale: 0.6 }} animate={{ opacity: 0, scale: 1.5 }} transition={{ duration: 0.7, ease: EASE }} style={{ rotate: rays }} className="speed pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2" />
            <div className="relative h-[24rem] w-[218px] overflow-hidden rounded-[2.2rem] border border-white/30 bg-black shadow-[0_60px_160px_rgb(0_0_0/0.9)] sm:h-[36rem] sm:w-[320px] md:h-[39.5rem] md:w-[352px]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div key={id} initial={{ opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.5, ease: EASE }} className="absolute inset-0">
                  <div className="absolute top-0 left-0 origin-top-left scale-[0.56] sm:scale-[0.82] md:scale-[0.9]" style={{ width: 390, height: 700 }}>
                    <BioPage mode="mini" data={SAMPLES[id]} />
                  </div>
                </motion.div>
              </AnimatePresence>
              {/* the cut: a white frame that fades, the way a scene changes in an anime */}
              <motion.span aria-hidden="true" key={`f${i}`} initial={{ opacity: i === 0 ? 0 : 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.38, ease: 'easeOut' }} className="pointer-events-none absolute inset-0 bg-white" />
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
  const scale = useDepth(p, [1, 1.12], [1, 1], [0, 1], reduced)
  return (
    <section ref={ref} id="backgrounds" className="relative h-[600svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div className="absolute inset-0" style={{ scale }}>
          <ShaderRunner key={s.id} id={s.id as ShaderId} tone={1} intensity={86} speed={55} px={px} py={py} level={level} reduced={reduced} />
        </motion.div>
        <div aria-hidden="true" className="absolute inset-0 bg-black/30" />
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_50%,transparent,rgb(0_0_0/0.8))]" />
        <div className="relative mx-auto flex h-full w-full max-w-[96rem] flex-col justify-between px-6 py-24 md:px-10">
          <div>
            <p className="cap mb-5 flex items-center gap-3 text-white/70">
              <span className="h-px w-8 bg-white/50" /> 04 · <span className="jp tracking-normal normal-case">背景</span> backgrounds
            </p>
            <h2 className="disp max-w-[46rem] text-[clamp(2.8rem,7.4vw,7rem)]">they don&apos;t just sit there.</h2>
            <p className="mt-5 max-w-[25rem] text-[0.86rem] leading-relaxed text-white/65">drawn live by the graphics card. they follow your pointer, move with your music, and blur as far as you want.</p>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <AnimatePresence mode="wait">
              <motion.span key={s.id} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} className="disp text-[clamp(4rem,15vw,14rem)]">
                {s.name.toLowerCase()}
              </motion.span>
            </AnimatePresence>
            <ul className="hidden max-w-[20rem] flex-col gap-0 text-[0.78rem] sm:flex" aria-label="backgrounds">
              {BIO_SHADERS.map((b, n) => (
                <li key={b.id} className={cn('flex items-baseline gap-4 border-t py-1.5 transition-all duration-500', n === i ? 'border-white text-white' : 'border-white/20 text-white/45')}>
                  <span className="text-[0.64rem] tabular-nums">{String(n + 1).padStart(2, '0')}</span>
                  {b.name.toLowerCase()}
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
  const { reduced } = useMotionPrefs()
  const css = cursorCss(pick, ink, 40)
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y1 = useDepth(scrollYProgress, ['10%', '-14%'], ['0%', '0%'], [0, 1], reduced)
  const y2 = useDepth(scrollYProgress, ['-6%', '16%'], ['0%', '0%'], [0, 1], reduced)
  return (
    <section ref={ref} id="cursors" className="relative overflow-hidden border-t border-white/10 py-32 md:py-44" style={{ cursor: css.arrow }}>
      <motion.span aria-hidden="true" style={{ y: y2 }} className="disp pointer-events-none absolute -right-[3%] -bottom-[8%] text-[clamp(10rem,36vw,36rem)] text-transparent [-webkit-text-stroke:1.2px_rgb(255_255_255/0.09)]">
        you
      </motion.span>
      <div className="relative mx-auto grid w-full max-w-[90rem] gap-14 px-6 md:px-10 lg:grid-cols-[0.9fr_1.1fr]">
        <motion.div style={{ y: y1 }}>
          <p className="cap mb-5 flex items-center gap-3 text-white/45">
            <span className="h-px w-8 bg-white/40" /> 05 · <span className="jp tracking-normal normal-case">カーソル</span> cursors
          </p>
          <h2 className="disp text-[clamp(2.8rem,7.4vw,7rem)]">
            your cursor.
            <br />
            <span className="text-white/30">move it.</span>
          </h2>
          <p className="mt-6 max-w-[27rem] text-[0.86rem] leading-relaxed text-white/55">pick one of ours (this whole section is wearing it) or upload a picture or an svg of your own. each one has a second shape that shows up over your links. add a trail if you feel like it.</p>
          <div className="mt-8 inline-flex border border-white/30 p-0.5 text-[0.7rem] tracking-[0.14em] uppercase">
            {(['white', 'black'] as const).map((c) => (
              <button key={c} type="button" onClick={() => setInk(c)} aria-pressed={ink === c} className={cn('h-9 px-5 transition-colors', ink === c ? 'bg-white text-black' : 'text-white/55 hover:text-white')}>
                {c}
              </button>
            ))}
          </div>
        </motion.div>
        <div className="grid grid-cols-3 border-t border-l border-white/15 sm:grid-cols-4">
          {CURSORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setPick(c.id)}
              aria-pressed={pick === c.id}
              aria-label={c.name}
              className={cn('group relative grid aspect-square place-items-center overflow-hidden border-r border-b border-white/15 transition-colors duration-500', pick === c.id && 'outline outline-1 -outline-offset-1 outline-white')}
              style={{ background: ink === 'white' ? '#0b0b0b' : '#e8e8e8', cursor: cursorCss(c.id, ink, 40).link }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/svg+xml,${encodeURIComponent(cursorSvg(c.arrow, ink, 32))}`} alt="" width={36} height={36} className="transition-transform duration-500 group-hover:scale-125" />
              <span className={cn('absolute bottom-2 text-[0.6rem] tracking-wide opacity-0 transition-opacity group-hover:opacity-100', ink === 'white' ? 'text-white/60' : 'text-black/60')}>{c.name.toLowerCase()}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the rest */

function Tile({ children, className, depth = 0 }: { children: ReactNode; className?: string; depth?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const y = useDepth(scrollYProgress, [depth * 70, depth * -70], [0, 0], [0, 1], reduced)
  return (
    <motion.div ref={ref} style={{ y }} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: '-10%' }} transition={{ duration: 0.9, ease: EASE }} className={cn('relative overflow-hidden border border-white/20 bg-black p-6 md:p-8', className)}>
      {children}
    </motion.div>
  )
}

function More() {
  const bars = [0.5, 0.9, 0.6, 1, 0.4, 0.8, 0.55, 0.95, 0.35, 0.7, 0.5, 0.85]
  const days = [3, 5, 4, 9, 7, 12, 10, 16, 14, 22, 19, 31, 27, 40]
  return (
    <section id="more" className="relative border-t border-white/10 py-32 md:py-44">
      <div className="mx-auto w-full max-w-[90rem] px-6 md:px-10">
        <p className="cap mb-5 flex items-center gap-3 text-white/45">
          <span className="h-px w-8 bg-white/40" /> 06 · <span className="jp tracking-normal normal-case">他にも</span> the rest
        </p>
        <h2 className="disp max-w-[52rem] text-[clamp(2.8rem,7.4vw,7rem)]">
          everything a page needs.
          <span className="text-white/30"> and a few things it doesn&apos;t.</span>
        </h2>
        <div className="mt-16 grid gap-3 md:grid-cols-6">
          <Tile depth={0.2} className="min-h-[22rem] md:col-span-3">
            <p className="cap text-white/45">music</p>
            <p className="mt-3 max-w-[20rem] text-[1.35rem] leading-[1.15] tracking-[-0.03em]">the page moves with the song.</p>
            <p className="mt-3 max-w-[20rem] text-[0.78rem] leading-relaxed text-white/45">upload a track. the shader and your picture pulse to it.</p>
            <div className="absolute inset-x-8 bottom-8 flex h-24 items-end gap-1.5">
              {bars.map((b, i) => (
                <motion.span key={i} className="flex-1 origin-bottom bg-white/85" animate={{ scaleY: [b * 0.4, b, b * 0.5, b * 0.9, b * 0.4] }} transition={{ duration: 1.8 + (i % 4) * 0.35, repeat: Infinity, ease: 'easeInOut' }} style={{ height: '100%' }} />
              ))}
            </div>
          </Tile>
          <Tile depth={-0.15} className="min-h-[22rem] md:col-span-3">
            <div aria-hidden="true" className="tone absolute inset-0 [--tone-mask:linear-gradient(to_top_left,#000,transparent_70%)]" />
            <p className="cap relative text-white/45">names</p>
            <p className="relative mt-3 text-[1.35rem] leading-[1.15] tracking-[-0.03em]">from one character.</p>
            <p className="disp absolute right-5 -bottom-6 text-[12rem] md:text-[16rem]">k</p>
            <p className="absolute bottom-8 left-8 text-[0.9rem] text-white/55">logoless.io/k</p>
          </Tile>
          <Tile depth={0.1} className="min-h-[18rem] md:col-span-2">
            <p className="cap text-white/45">videos</p>
            <p className="mt-3 text-[1.1rem] leading-[1.2] tracking-[-0.02em]">your edits play on the page, not behind a link.</p>
            <div className="absolute inset-x-6 bottom-6 grid aspect-video place-items-center border border-white/25 bg-black/50">
              <span className="grid size-11 place-items-center rounded-full bg-white text-black">
                <span className="ml-1 block size-0 border-y-[7px] border-l-[12px] border-y-transparent border-l-black" />
              </span>
            </div>
          </Tile>
          <Tile depth={-0.2} className="min-h-[18rem] md:col-span-2">
            <p className="cap text-white/45">insights</p>
            <p className="mt-3 text-[1.1rem] leading-[1.2] tracking-[-0.02em]">see who looked, and what they pressed.</p>
            <div className="absolute inset-x-6 bottom-6 flex h-24 items-end gap-1">
              {days.map((d, i) => (
                <motion.span key={i} initial={{ scaleY: 0 }} whileInView={{ scaleY: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.04, ease: EASE }} className="flex-1 origin-bottom bg-white/85" style={{ height: `${(d / 40) * 100}%` }} />
              ))}
            </div>
          </Tile>
          <Tile depth={0.15} className="min-h-[18rem] md:col-span-2">
            <p className="cap text-white/45">enter screens</p>
            <p className="mt-3 text-[1.1rem] leading-[1.2] tracking-[-0.02em]">make them press first.</p>
            <p className="cap absolute bottom-8 left-6 text-white/70">
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
  const y = useDepth(scrollYProgress, ['-12%', '0%'], ['0%', '0%'], [0, 1], reduced)
  const scale = useDepth(scrollYProgress, [0.86, 1], [1, 1], [0, 1], reduced)
  const rays = useDepth(scrollYProgress, [0, 50], [0, 0], [0, 1], reduced)
  return (
    <section ref={ref} id="claim" className="relative isolate overflow-hidden border-t border-white/10">
      <motion.div aria-hidden="true" className="absolute inset-[-6%] -z-10" style={{ y }}>
        <ShaderRunner id="mercury" tone={2} intensity={70} speed={50} px={px} py={py} level={level} reduced={reduced} />
      </motion.div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/55" />
      <motion.div aria-hidden="true" style={{ rotate: rays }} className="speed absolute top-1/2 left-1/2 -z-10 aspect-square w-[150vmax] -translate-x-1/2 -translate-y-1/2 opacity-60" />
      <div aria-hidden="true" className="tone absolute inset-x-0 bottom-0 -z-10 h-1/2" />
      <motion.div style={{ scale }} className="mx-auto flex min-h-[100svh] w-full max-w-[72rem] flex-col items-center justify-center px-6 py-32 text-center">
        <p className="cap mb-6 flex items-center gap-3 text-white/60">
          <span className="h-px w-8 bg-white/50" /> 07 · <span className="jp tracking-normal normal-case">名前</span> your name
        </p>
        <h2 className="disp text-[clamp(3.6rem,13vw,12rem)]">claim it.</h2>
        <p className="mt-6 max-w-[27rem] text-[0.86rem] leading-relaxed text-white/65">it takes a few seconds and it's free. the short names go fast.</p>
        <div className="mt-10 w-full max-w-[38rem]">
          <ClaimBar big />
        </div>
      </motion.div>
      <footer className="border-t border-white/10 bg-black px-6 py-8 md:px-10">
        <div className="cap mx-auto flex w-full max-w-[90rem] flex-wrap items-center justify-between gap-6 text-white/45">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {[['terms', '/legal/terms'], ['privacy', '/legal/privacy'], ['log in', '/login'], ['get started', '/signup']].map(([n, h]) => (
              <li key={h}>
                <a href={h} className="transition-colors hover:text-white">
                  {n}
                </a>
              </li>
            ))}
          </ul>
          <span>
            © {new Date().getFullYear()} logoless <span className="jp ml-2 tracking-normal normal-case">ありがとう</span>
          </span>
        </div>
      </footer>
    </section>
  )
}

export function Home() {
  return (
    <div className="ed relative min-h-dvh overflow-x-clip">
      <Nav />
      <main>
        <Hero />
        <Words />
        <Layouts />
        <Backgrounds />
        <Cursors />
        <More />
        <Outro />
      </main>
    </div>
  )
}
