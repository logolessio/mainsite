'use client'

import '@/components/editor/editor.css'
import { AnimatePresence, type MotionValue, motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion'
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

/** The scenes the little contents list at the side points to. */
const TOC = [
  { id: 'top', name: 'overview' },
  { id: 'layouts', name: 'layouts' },
  { id: 'backgrounds', name: 'backgrounds' },
  { id: 'cursors', name: 'cursors' },
  { id: 'faq', name: 'questions' },
  { id: 'claim', name: 'claim' },
] as const

/* ------------------------------------------------------------------ a page in a phone */

function Phone({ id, width = 260, className, style }: { id: SampleId; width?: number; className?: string; style?: CSSProperties }) {
  const data: BioPageData = SAMPLES[id]
  const k = width / 390
  return (
    <div aria-hidden="true" className={cn('relative shrink-0 overflow-hidden rounded-[2.2rem] border border-white/25 bg-black shadow-[0_50px_140px_rgb(0_0_0/0.85)]', className)} style={{ width, height: 844 * k, ...style }}>
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: 390, height: 844, transform: `scale(${k})` }}>
        <BioPage mode="mini" data={data} />
      </div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]" />
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
      <div className={cn('flex w-full items-center border pl-4 transition-colors', light ? 'border-black/50 bg-transparent focus-within:border-black' : 'border-white/45 bg-black/60 backdrop-blur-sm focus-within:border-white', big ? 'h-[4rem] pl-5' : 'h-[3rem]')}>
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

/* ------------------------------------------------------------------ the page's furniture: a boxed menu, a small contents list */

function Chrome() {
  const [at, setAt] = useState(0)
  useEffect(() => {
    let raf = 0
    const read = () => {
      raf = 0
      let n = 0
      TOC.forEach((s, i) => {
        const el = document.getElementById(s.id)
        if (el && el.getBoundingClientRect().top <= window.innerHeight * 0.5) n = i
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
  return (
    <>
      <header className="fixed top-4 left-4 z-50 flex border border-white/35 bg-black/60 text-[0.76rem] tracking-[0.06em] uppercase backdrop-blur-sm mix-blend-normal md:top-5 md:left-5">
        <span className="hidden border-r border-white/35 px-3.5 py-2.5 tabular-nums text-white/55 sm:block">{String(at + 1).padStart(2, '0')}</span>
        {[['layouts', '#layouts'], ['backgrounds', '#backgrounds'], ['cursors', '#cursors']].map(([n, h], i, a) => (
          <a key={h} href={h} className={cn('px-3.5 py-2.5 text-white transition-colors hover:bg-white hover:text-black', i < a.length - 1 && 'border-r border-white/35', i === 2 && 'hidden sm:block')}>
            {n}
          </a>
        ))}
      </header>
      <a href="/login" aria-label="log in" className="fixed top-4 right-4 z-50 grid size-10 place-items-center rounded-full border border-white/70 bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-black md:top-5 md:right-5">
        <UserRound className="size-[1.1rem]" strokeWidth={1.6} />
      </a>
      <nav aria-label="on this page" className="fixed top-[36vh] right-5 z-40 hidden w-28 xl:block">
        <ul className="border-l border-white/20 text-[0.74rem] tracking-[0.04em]">
          {TOC.map((s, i) => (
            <li key={s.id} className={cn('relative -ml-px border-l py-1 pl-3 transition-colors', i === at ? 'border-white text-white' : 'border-transparent text-white/45 hover:text-white')}>
              <a href={`#${s.id}`}>{s.name}</a>
            </li>
          ))}
        </ul>
        <a href="#claim" className="btn mt-5 h-9 px-5 text-[0.7rem]">
          claim
        </a>
      </nav>
    </>
  )
}

/* ------------------------------------------------------------------ small pieces borrowed from the reference */

/** Three hairline arches round a window: the frame the title sits in front of. */
function ArchFrames({ opacity }: { opacity?: MotionValue<number> }) {
  return (
    <motion.div aria-hidden="true" style={{ opacity }} className="pointer-events-none absolute inset-0">
      {[0, 1, 2].map((i) => (
        <span key={i} className="absolute rounded-t-[999px] border border-white/55" style={{ inset: `${-9 - i * 8}px`, borderColor: `rgb(255 255 255 / ${0.6 - i * 0.14})` }} />
      ))}
    </motion.div>
  )
}

/** A round badge: solid and light, or only a line. */
function Badge({ solid = false, href, children, className, style }: { solid?: boolean; href: string; children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <motion.a href={href} style={style} whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className={cn('grid size-[6.6rem] place-items-center rounded-full text-center text-[0.8rem] leading-[1.45] tracking-[0.1em] uppercase md:size-[8rem] md:text-[0.9rem]', solid ? 'bg-[#ededed] text-black' : 'border border-white text-white', className)}>
      <span>{children}</span>
    </motion.a>
  )
}

/** A hairline that walks down the page, turns rounded corners and ends in an open arrow. It draws itself as you scroll. */
function HairPath({ p, pts, r = 30, className }: { p: MotionValue<number>; pts: [number, number][]; r?: number; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(1200)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth || 1200))
    ro.observe(el)
    setW(el.clientWidth || 1200)
    return () => ro.disconnect()
  }, [])
  const abs = pts.map(([x, y]) => [x * w, y] as [number, number])
  let d = `M ${abs[0][0]} ${abs[0][1]}`
  for (let i = 1; i < abs.length; i++) {
    const [x, y] = abs[i]
    const [px, py] = abs[i - 1]
    if (i === abs.length - 1) {
      d += ` L ${x} ${y}`
      break
    }
    const [nx, ny] = abs[i + 1]
    const a = Math.hypot(x - px, y - py)
    const b = Math.hypot(nx - x, ny - y)
    const k = Math.min(r, a / 2, b / 2)
    const sx = x - ((x - px) / a) * k
    const sy = y - ((y - py) / a) * k
    const ex = x + ((nx - x) / b) * k
    const ey = y + ((ny - y) / b) * k
    d += ` L ${sx} ${sy} Q ${x} ${y} ${ex} ${ey}`
  }
  const [lx, ly] = abs[abs.length - 1]
  const tip = useTransform(p, [0.9, 1], [0, 1])
  const height = Math.max(...abs.map((a) => a[1])) + 24
  return (
    <div ref={box} aria-hidden="true" className={cn('pointer-events-none absolute inset-x-0 top-0 hidden md:block', className)} style={{ height }}>
      <svg width={w} height={height} className="overflow-visible">
        <motion.path d={d} fill="none" stroke="#fff" strokeWidth={1} style={{ pathLength: p }} />
        <motion.path d={`M ${lx - 9} ${ly - 11} L ${lx} ${ly} L ${lx + 9} ${ly - 11}`} fill="none" stroke="#fff" strokeWidth={1} style={{ opacity: tip }} />
      </svg>
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

/* ------------------------------------------------------------------ the first scene */

function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { px, py } = usePointer(ref)
  const { reduced } = useMotionPrefs()
  const level = useQuiet()
  // read straight from the scroll (a spring here starts from the wrong end and the page would zoom out when it loads)
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  const zoom = useMap(p, [0, 0.1, 0.66], [1, 1, 9], reduced, 1)
  const frames = useMap(p, [0, 0.1, 0.3], [1, 1, 0], reduced, 1)
  const phoneY = useMap(p, [0, 0.3], ['0vh', '-16vh'], reduced, '0vh')
  const phoneO = useMap(p, [0, 0.12, 0.3], [1, 1, 0], reduced, 1)
  const titleS = useMap(p, [0, 0.34], [1, 1.22], reduced, 1)
  const titleO = useMap(p, [0, 0.08, 0.3], [1, 1, 0], reduced, 1)
  const sideO = useMap(p, [0, 0.14], [1, 0], reduced, 1)
  const leftX = useMap(p, [0, 0.2], ['0vw', '-14vw'], reduced, '0vw')
  const rightX = useMap(p, [0, 0.2], ['0vw', '14vw'], reduced, '0vw')
  const lineH = useMap(p, [0, 0.14], [1, 0], reduced, 1)
  const fadeBlack = useMap(p, [0.58, 0.92], [0, 1], reduced, 0)
  const lean = useTransform(px, (v) => v * 10)

  return (
    <section ref={ref} id="top" className="relative h-[270svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.p style={{ opacity: titleO }} className="absolute top-[9vh] left-0 w-full text-center text-[0.74rem] text-white/60 italic md:top-[8vh]">
          a link in bio, but make it move
        </motion.p>

        {/* the window in its arches; it is what the page zooms into */}
        <div className="absolute top-[19vh] left-1/2 h-[52vh] w-[min(62vw,24rem)] -translate-x-1/2 md:top-[17vh] md:h-[56vh] md:w-[min(34vw,27rem)]">
          <motion.div style={{ scale: zoom }} className="absolute inset-0 origin-center will-change-transform">
            <ArchFrames opacity={frames} />
            <div className="absolute inset-0 overflow-hidden rounded-t-[999px] bg-black">
              <ShaderRunner id="mercury" tone={1} intensity={80} speed={46} px={px} py={py} level={level} reduced={reduced} />
              <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_70%,transparent,rgb(0_0_0/0.55))]" />
            </div>
          </motion.div>
          <motion.div style={{ y: phoneY, opacity: phoneO }} className="pointer-events-none absolute bottom-[-6%] left-1/2 -translate-x-1/2">
            <motion.div style={{ x: lean }}>
              <Phone id="aura" width={190} className="md:hidden" />
              <Phone id="aura" width={236} className="hidden md:block" />
            </motion.div>
          </motion.div>
        </div>

        {/* the title sits in front of the arches */}
        <motion.h1 style={{ scale: titleS, opacity: titleO }} className="disp pointer-events-none absolute top-[13vh] left-0 w-full text-center text-[clamp(3.4rem,13.4vw,13.5rem)] text-[#ededed] md:top-[10vh]">
          link in bio
        </motion.h1>

        <motion.div style={{ opacity: sideO, x: leftX }} className="absolute top-[52vh] left-[5vw] hidden flex-col items-center md:flex xl:left-[9vw]">
          <Badge solid href="#claim">
            claim
            <br />a name
          </Badge>
          <a href="#layouts" className="btn mt-8 h-10 px-6">
            learn more
          </a>
          <motion.span style={{ scaleY: lineH }} className="mt-4 block h-[18vh] w-px origin-top bg-white" />
        </motion.div>
        <motion.div style={{ opacity: sideO, x: rightX }} className="absolute top-[36vh] right-[5vw] hidden md:block xl:right-[11vw]">
          <Badge href="#layouts">
            see it
            <br />
            move
          </Badge>
        </motion.div>

        <motion.div style={{ opacity: sideO }} className="absolute bottom-[4vh] left-1/2 w-full max-w-[28rem] -translate-x-1/2 px-5">
          <p className="mb-3 text-center text-[0.72rem] text-white/55">
            <span className="border-b border-dotted border-white/50 italic">:a few pages:</span>
          </p>
          <ClaimBar />
        </motion.div>

        <motion.div aria-hidden="true" style={{ opacity: fadeBlack }} className="pointer-events-none absolute inset-0 bg-black" />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ not a list */

function Intro() {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 80%', 'end 40%'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })
  const { scrollYProgress: s2 } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const yA = useMap(s2, [0, 1], ['6vh', '-8vh'], reduced, '0vh')
  const yB = useMap(s2, [0, 1], ['12vh', '-14vh'], reduced, '0vh')
  const yF = useMap(s2, [0, 1], ['10vh', '-10vh'], reduced, '0vh')
  return (
    <section ref={ref} className="relative mx-auto w-full max-w-[96rem] px-6 pt-[18vh] pb-[16vh] md:px-12">
      <HairPath p={p} pts={[[0.13, 0], [0.13, 250], [0.42, 250], [0.42, 640]]} />
      <motion.div style={{ y: yA }} className="relative md:ml-[50%]">
        <Block title="a link in bio is not a list" className="md:max-w-[22rem]">
          it&apos;s the first thing people open after your edit. so it shouldn&apos;t feel like a drawer full of white buttons. put a shader behind it, a song under it, your own cursor on it, and your best work out front.
        </Block>
      </motion.div>
      <motion.div style={{ y: yB }} className="relative mt-[22vh] md:ml-[8%] md:mt-[30vh]">
        <Block title={'it\'s a place,\nnot a menu'} className="whitespace-pre-line">
          full screen, and every scroll moves something. ten layouts, seven live backgrounds, thirteen cursors, music the page actually listens to. pick what fits and ignore the rest.
        </Block>
      </motion.div>
      <motion.figure style={{ y: yF }} className="relative mt-[16vh] md:ml-[8%] md:mr-[6%]">
        <div className="relative flex h-[22rem] items-end justify-center overflow-hidden border border-white/20 bg-[#0c0c0c] md:h-[30rem]">
          <div aria-hidden="true" className="stipple absolute inset-0 opacity-50" />
          <div className="relative flex items-end gap-5 md:gap-8">
            <Phone id="poster" width={170} className="hidden -rotate-3 translate-y-[18%] md:block" />
            <Phone id="aura" width={230} className="translate-y-[14%]" />
            <Phone id="index" width={170} className="hidden rotate-3 translate-y-[18%] md:block" />
          </div>
        </div>
        <figcaption className="mt-4 text-center text-[0.74rem] text-white/50 italic">a few pages, made here</figcaption>
      </motion.figure>
    </section>
  )
}

/* ------------------------------------------------------------------ a serious question */

function Question() {
  const ref = useRef<HTMLDivElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 75%', 'end 55%'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })
  const aO = useMap(p, [0.1, 0.35], [0, 1], reduced, 1)
  const bO = useMap(p, [0.5, 0.78], [0, 1], reduced, 1)
  const barA = useMap(p, [0.1, 0.45], [0, 1], reduced, 1)
  const barB = useMap(p, [0.5, 0.9], [0, 1], reduced, 1)
  const endO = useMap(p, [0.85, 1], [0, 1], reduced, 1)
  return (
    <Scene className="px-6 py-[16vh] md:px-12" innerClass="mx-auto w-full max-w-[72rem]">
      <div ref={ref}>
        <h2 className="disp text-center text-[clamp(2.6rem,9vw,8rem)]">serious question</h2>
        <div className="mt-[10vh] grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
          <div className="self-center">
            <span className="inline-block border border-white/25 bg-white/[0.07] px-2 py-0.5 text-[0.8rem] text-white/80 italic">*ping*</span>
            <p className="mt-6 max-w-[21rem] text-[0.84rem] leading-[1.75] text-white/85">you just posted the best edit of your month. someone in the comments asks where they can see more.</p>
            <p className="mt-5 max-w-[21rem] text-[0.84rem] leading-[1.75] text-white/85 italic">what do you put in your bio?</p>
          </div>
          <div className="grid gap-14">
            <motion.div style={{ opacity: aO }}>
              <h3 className="text-[1.15rem] tracking-[0.01em] italic">
                <span className="text-white/45">A)</span> a list of links
              </h3>
              <div className="relative mt-5 pl-5">
                <motion.span style={{ scaleY: barA }} className="absolute top-0 bottom-0 left-0 w-px origin-top bg-white/70" />
                <p className="max-w-[24rem] text-[0.8rem] leading-[1.75] text-white/65">the same row of white buttons everyone has. you hope they scroll past the third one.</p>
              </div>
            </motion.div>
            <motion.div style={{ opacity: bO }}>
              <h3 className="text-[1.15rem] tracking-[0.01em] italic">
                <span>B)</span> a page that&apos;s yours
              </h3>
              <div className="relative mt-5 pl-5">
                <motion.span style={{ scaleY: barB }} className="absolute top-0 bottom-0 left-0 w-px origin-top bg-white" />
                <p className="max-w-[24rem] text-[0.8rem] leading-[1.75] text-white/85">a shader behind it, your song, your cursor, the edit playing right there. they stay a while.</p>
              </div>
            </motion.div>
          </div>
        </div>
        <motion.p style={{ opacity: endO }} className="mt-[10vh] text-center text-[0.74rem] tracking-[0.12em] text-white/55 uppercase">
          ↓ good choice. keep scrolling ↓
        </motion.p>
      </div>
    </Scene>
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
      <div className="sticky top-0 h-[100svh] overflow-hidden border-y border-[#8a8a8a]/50">
        <div aria-hidden="true" className="stipple absolute inset-y-0 left-0 w-[4.4vw] min-w-6 border-r border-white/35" />
        <div aria-hidden="true" className="stipple absolute inset-y-0 right-0 w-[4.4vw] min-w-6 border-l border-white/35" />
        <div aria-hidden="true" className="absolute inset-y-0 left-[calc(4.4vw+7px)] hidden w-px bg-white/25 md:block" />
        <div aria-hidden="true" className="absolute inset-y-0 right-[calc(4.4vw+7px)] hidden w-px bg-white/25 md:block" />
        <div className="relative mx-auto flex h-full w-full max-w-[84rem] flex-col justify-center px-[8vw] pt-12 md:px-[9vw]">
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
              <div className="relative h-[21.5rem] w-[194px] overflow-hidden rounded-[2rem] border border-white/35 bg-black shadow-[0_50px_140px_rgb(0_0_0/0.9)] sm:h-[30rem] sm:w-[270px] md:h-[32rem] md:w-[286px]">
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

/* ------------------------------------------------------------------ shaders: a circle opens onto the next scene */

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
  const iris = useMap(p, [0, 0.13], [0, 150], reduced, 150)
  const clip = useTransform(iris, (v) => `circle(${v}% at 50% 50%)`)
  const scale = useMap(p, [0.1, 1], [1.12, 1], reduced, 1)
  return (
    <section ref={ref} id="backgrounds" className="relative h-[640svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div className="absolute inset-0" style={{ clipPath: clip, WebkitClipPath: clip }}>
          <motion.div className="absolute inset-0" style={{ scale }}>
            <ShaderRunner key={s.id} id={s.id as ShaderId} tone={1} intensity={86} speed={55} px={px} py={py} level={level} reduced={reduced} />
          </motion.div>
          <div aria-hidden="true" className="absolute inset-0 bg-black/35" />
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_50%,transparent,rgb(0_0_0/0.8))]" />
          <div className="relative mx-auto flex h-full w-full max-w-[96rem] flex-col justify-between px-6 pt-28 pb-16 md:px-16">
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
      <div className="bg-[#0d0d0d] px-6 py-14 md:px-16 md:py-20">
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
    <Scene id="cursors" className="px-6 py-[14vh] md:px-12" innerClass="mx-auto grid w-full max-w-[84rem] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
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

/* ------------------------------------------------------------------ common questions */

const FAQ = [
  { q: 'is it really free?', tag: 'yes', a: 'claiming a name and building a page costs nothing, and nothing in the editor is locked behind anything.' },
  { q: 'can i have a one letter name?', tag: 'if it\'s free', a: 'names start at one character. dots, dashes and a few symbols work anywhere in them. if someone already has it, they have it.' },
  { q: 'does the music start by itself?', tag: 'after a click', a: 'browsers keep sound off until someone clicks. turn on the enter screen and that click is what lets your song start.' },
  { q: 'can people watch my edits on the page?', tag: 'yes', a: 'paste a youtube, vimeo, tiktok or spotify link and it plays right there. anything else opens as a normal link.' },
  { q: 'will it slow my page down?', tag: 'not much', a: 'the backgrounds run on the graphics card and draw smaller on phones. anyone who asked their device for less motion gets a still page.' },
] as const

function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <Scene id="faq" className="px-6 py-[14vh] md:px-12" innerClass="mx-auto w-full max-w-[56rem]">
      <h2 className="disp text-[clamp(2.4rem,6vw,5.6rem)]">common questions</h2>
      <ul className="mt-14 border-t border-white/20">
        {FAQ.map((f, n) => (
          <li key={f.q} className="border-b border-white/20">
            <button type="button" onClick={() => setOpen(open === n ? -1 : n)} aria-expanded={open === n} className="flex w-full items-baseline justify-between gap-6 py-5 text-left">
              <span className={cn('text-[0.92rem] tracking-[0.03em] uppercase transition-colors', open === n ? 'text-white' : 'text-white/60')}>{f.q}</span>
              <span aria-hidden="true" className="text-[0.9rem] text-white/50">{open === n ? '−' : '+'}</span>
            </button>
            <AnimatePresence initial={false}>
              {open === n && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} className="overflow-hidden">
                  <div className="pb-7 pl-0 md:pl-8">
                    <p className="text-[0.88rem] text-white/50">↓</p>
                    <p className="mt-1 text-[1rem] tracking-[0.03em] uppercase">{f.tag}</p>
                    <p className="mt-4 max-w-[34rem] text-[0.8rem] leading-[1.8] text-white/70">{f.a}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        ))}
      </ul>
    </Scene>
  )
}

/* ------------------------------------------------------------------ the end: a light disc rises and the page turns over */

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
  const r = useMap(p, [0, 1], [0, 170], reduced, 170)
  const clip = useTransform(r, (v) => `circle(${v}% at 50% 0%)`)
  const rise = useMap(p, [0.3, 1], ['6vh', '0vh'], reduced, '0vh')
  return (
    <section ref={ref} id="claim" className="relative">
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
      <footer className="border-t border-white/15 px-6 py-14 md:px-12">
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
    <div className="ed relative min-h-dvh overflow-x-clip">
      <Chrome />
      <main>
        <Hero />
        <Intro />
        <Question />
        <Layouts />
        <Backgrounds />
        <Practices />
        <Cursors />
        <Faq />
        <Outro />
      </main>
    </div>
  )
}
