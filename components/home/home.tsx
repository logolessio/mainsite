'use client'

import '@/components/editor/editor.css'
import { AnimatePresence, type MotionValue, motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, Check, Loader2, X } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useMap } from '@/components/art/motion'
import { BioPage } from '@/components/bio/bio-page'
import type { BioPageData } from '@/components/bio/context'
import { ShaderRunner, type ShaderId } from '@/components/bio/gl'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { BIO_SHADERS, LAYOUTS } from '@/lib/bio'
import { CURSORS, cursorCss, cursorSvg } from '@/lib/bio-cursors'
import { cn } from '@/lib/utils'
import { type SampleId, SAMPLES } from './samples'

/**
 * The home page: black, white and grey, everything centred. Geist Light for the titles (the way the main header on veelscp.com is set) and Plex Mono for
 * the words. It tells one story, scroll by scroll, and shows real pages rather than pictures of them.
 */
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

/** Fades up once as it comes into view. */
function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { reduced } = useMotionPrefs()
  return (
    <motion.div initial={reduced ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -10% 0px' }} transition={{ duration: 0.8, ease: EASE, delay }} className={className}>
      {children}
    </motion.div>
  )
}

/* ------------------------------------------------------------------ a page in a phone */

function Phone({ id, width = 260, className }: { id: SampleId; width?: number; className?: string }) {
  const data: BioPageData = SAMPLES[id]
  const k = width / 390
  return (
    <div aria-hidden="true" className={cn('relative shrink-0 overflow-hidden border border-white/20 bg-black', className)} style={{ width, height: 844 * k }}>
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: 390, height: 844, transform: `scale(${k})` }}>
        <BioPage mode="mini" data={data} />
      </div>
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
      <div className={cn('flex w-full items-center border pl-4 transition-colors', light ? 'border-black/50 bg-transparent focus-within:border-black' : 'border-white/45 bg-black focus-within:border-white', big ? 'h-[4rem] pl-5' : 'h-[3rem]')}>
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
      <p className={cn('mt-3 h-5 text-center text-[0.74rem]', mute)}>{avail && avail !== 'checking' ? (avail.ok ? `logoless.io/${v.trim().toLowerCase()} is free. it's yours if you want it.` : avail.message.toLowerCase()) : 'one letter is fine. dots and dashes too.'}</p>
    </form>
  )
}

/* ------------------------------------------------------------------ the top bar */

function Nav() {
  const { scrollYProgress } = useScroll()
  const w = useTransform(scrollYProgress, (v) => `${Math.max(0, Math.min(1, v)) * 100}%`)
  return (
    <>
      <motion.span aria-hidden="true" style={{ width: w }} className="fixed top-0 left-0 z-[60] h-px bg-white" />
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/10 bg-black/70 px-5 backdrop-blur-md md:px-8">
        <a href="#top" className="disp text-[1.3rem]" aria-label="logoless, back to the top">
          logoless
        </a>
        <nav aria-label="page" className="hidden items-center gap-8 text-[0.74rem] text-white/55 md:flex">
          {[['how it works', '#how'], ['layouts', '#layouts'], ['backgrounds', '#backgrounds'], ['cursors', '#cursors']].map(([n, h]) => (
            <a key={h} href={h} className="transition-colors hover:text-white">
              {n}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1">
          <a href="/login" className="hidden h-9 items-center px-4 text-[0.74rem] text-white/70 transition-colors hover:text-white sm:inline-flex">
            log in
          </a>
          <a href="/signup" className="inline-flex h-9 items-center bg-white px-4 text-[0.74rem] text-black transition-opacity hover:opacity-85">
            get started
          </a>
        </div>
      </header>
    </>
  )
}

/* ------------------------------------------------------------------ the title: what it is, with real pages rising under it */

function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const textY = useMap(p, [0, 1], ['0vh', '-10vh'], reduced, '0vh')
  const textO = useMap(p, [0.15, 0.6], [1, 0], reduced, 1)
  const cY = useMap(p, [0, 1], ['0vh', '-14vh'], reduced, '0vh')
  const sY = useMap(p, [0, 1], ['0vh', '-26vh'], reduced, '0vh')
  const lX = useMap(p, [0, 1], ['0px', '-70px'], reduced, '0px')
  const rX = useMap(p, [0, 1], ['0px', '70px'], reduced, '0px')
  return (
    <section ref={ref} id="top" className="relative overflow-hidden">
      <div className="mx-auto flex w-full max-w-[72rem] flex-col items-center px-5 pt-[18vh] text-center">
        <motion.div style={{ y: textY, opacity: textO }} className="flex w-full flex-col items-center">
          <h1 className="disp text-[11vw] md:text-[clamp(3rem,6.2vw,6.2rem)]">
            your bio gets <br className="md:hidden" />
            one link.
            <br />
            make it a page.
          </h1>
          <p className="mt-7 max-w-[27rem] text-[0.84rem] leading-[1.8] text-white/55">logoless makes the page. put your edits, socials and music on it, pick how it looks, and paste logoless.io/yourname into your bio. it&apos;s free.</p>
          <div className="mt-9 w-full max-w-[27rem]">
            <ClaimBar />
          </div>
        </motion.div>

        {/* real pages, rising from the bottom edge at three depths */}
        <div aria-hidden="true" className="relative mt-14 h-[17rem] w-full md:mt-16 md:h-[30rem]">
          <div className="absolute top-0 left-1/2 h-[640px] w-[640px] -translate-x-1/2 origin-top scale-[0.52] sm:scale-[0.7] md:scale-100">
            <motion.div style={{ y: sY, x: lX }} className="absolute top-[110px] left-0">
              <Phone id="index" width={190} />
            </motion.div>
            <motion.div style={{ y: cY }} className="absolute top-0 left-[195px]">
              <Phone id="aura" width={250} />
            </motion.div>
            <motion.div style={{ y: sY, x: rX }} className="absolute top-[110px] left-[450px]">
              <Phone id="bento" width={190} />
            </motion.div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the story: it is all over the place, your bio fits one link, so make that link a page */

const PILE = [
  { t: 'showreel_v3_FINAL.mp4', x: 16, y: 46, d: 1.1, r: -3 },
  { t: 'youtube.com/@lunaray', x: 80, y: 44, d: 0.7, r: 2 },
  { t: 'tiktok.com/@lunaray', x: 84, y: 66, d: 1.3, r: -2 },
  { t: 'discord.gg/lunaray', x: 16, y: 74, d: 0.8, r: 1 },
  { t: 'my spotify playlist', x: 33, y: 85, d: 1.2, r: -2 },
  { t: 'instagram.com/lunaray', x: 67, y: 84, d: 0.9, r: 3 },
  { t: 'old portfolio (2023)', x: 26, y: 58, d: 0.6, r: 1 },
  { t: 'luna@lunaray.co', x: 90, y: 54, d: 1.0, r: -1 },
] as const
/** Where the one link sits on the stage, in vw and vh. */
const SLOT = { x: 50, y: 68 }

const CAPTIONS = ['you make things. all over the place.', 'your bio only fits one link.', 'so make that one link a page.', 'everything you make, behind one link.']
const BEATS = [0, 0.25, 0.5, 0.75, 1]

/** One of the things you make, scattered about, until the one link pulls it in. */
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
        <span className="block border border-white/30 bg-black px-3 py-1.5 text-[0.72rem] whitespace-nowrap text-white/80">{chip.t}</span>
      </motion.div>
    </div>
  )
}

/** A line of the story, in big letters; one at a time, in the middle. */
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
    <motion.h2 style={{ opacity, y }} className="disp absolute inset-x-0 top-0 text-[clamp(2rem,5vw,4.8rem)]">
      {children}
    </motion.h2>
  )
}

/** What your profile has on the apps: room for one link, and nothing more. */
function ProfileCard({ p }: { p: MotionValue<number> }) {
  const { reduced } = useMotionPrefs()
  const o = useMap(p, [0.2, 0.3, 0.7, 0.78], [0, 1, 1, 0], reduced, 1)
  const sc = useMap(p, [0.2, 0.3], [0.94, 1], reduced, 1)
  const y = useMap(p, [0.2, 0.3], ['5vh', '0vh'], reduced, '0vh')
  const bg = useMap(p, [0.6, 0.7], ['rgba(255,255,255,0)', 'rgba(255,255,255,1)'], reduced, 'rgba(255,255,255,1)')
  const wipe = useMap(p, [0.62, 0.72], [100, 0], reduced, 0)
  const clip = useTransform(wipe, (v) => `inset(0 ${v}% 0 0)`)
  return (
    <motion.div style={{ opacity: o, scale: sc, y }} className="absolute top-[60%] left-1/2 z-10 w-[min(84vw,22rem)] -translate-x-1/2 -translate-y-1/2 border border-white/40 bg-black p-5">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="size-12 shrink-0 bg-white/15" />
        <div className="min-w-0 text-left">
          <p className="text-[0.84rem]">lunaray</p>
          <p className="text-[0.7rem] text-white/50">editor. london.</p>
        </div>
      </div>
      <p className="mt-4 text-left text-[0.78rem] leading-[1.6] text-white/75">making things move. a new edit every week.</p>
      <p className="mt-5 text-left text-[0.68rem] text-white/40">your link (one is all it allows)</p>
      <motion.div style={{ background: bg }} className="relative mt-1.5 h-10 border border-dashed border-white/40">
        <motion.span style={{ clipPath: clip }} className="absolute inset-0 flex items-center px-3 text-[0.74rem] text-black">
          logoless.io/lunaray
        </motion.span>
      </motion.div>
    </motion.div>
  )
}

/** The page behind that one link, with what is on it pointed out. */
function PageFrame({ p, still = false }: { p: MotionValue<number> | null; still?: boolean }) {
  const { reduced } = useMotionPrefs()
  const fallback = useMotionValue(1)
  const q = p ?? fallback
  const off = reduced || still
  const o = useMap(q, [0.72, 0.8], [0, 1], off, 1)
  const y = useMap(q, [0.72, 0.8], ['8vh', '0vh'], off, '0vh')
  const co = useMap(q, [0.84, 0.92], [0, 1], off, 1)
  const cx = useMap(q, [0.84, 0.92], [18, 0], off, 0)
  const ncx = useTransform(cx, (v) => -v)
  const left: [string, string][] = [['your links', 'top-[44%]'], ['your socials', 'top-[62%]']]
  const right: [string, string][] = [['a layout you pick', 'top-[32%]'], ['a background that moves', 'top-[70%]']]
  return (
    <motion.div style={{ opacity: o, y }} className="relative">
      <p className="mb-3 text-center text-[0.76rem] text-white/60">logoless.io/luna</p>
      <div className="origin-top scale-[0.74] md:scale-100 [@media(max-height:820px)]:md:scale-[0.86]">
        <Phone id="aura" width={232} />
      </div>
      <motion.div style={{ opacity: co }} className="pointer-events-none absolute inset-0 hidden md:block">
        {left.map(([t, pos]) => (
          <motion.div key={t} style={{ x: cx }} className={cn('absolute right-full mr-9', pos)}>
            <span className="flex items-center gap-2 text-[0.8rem] whitespace-nowrap text-white/80">
              {t}
              <span aria-hidden="true" className="h-px w-8 bg-white/50" />
            </span>
          </motion.div>
        ))}
        {right.map(([t, pos]) => (
          <motion.div key={t} style={{ x: ncx }} className={cn('absolute left-full ml-9', pos)}>
            <span className="flex items-center gap-2 text-[0.8rem] whitespace-nowrap text-white/80">
              <span aria-hidden="true" className="h-px w-8 bg-white/50" />
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
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="absolute inset-x-[5vw] top-[15vh] mx-auto h-[22vh] max-w-[60rem] text-center">
          {CAPTIONS.map((t, i) => (
            <Caption key={t} p={p} i={i}>
              {t}
            </Caption>
          ))}
        </div>
        <ProfileCard p={p} />
        <div className="absolute top-[31vh] left-1/2 -translate-x-1/2">
          <PageFrame p={p} />
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
    <section id="story" className="mx-auto flex w-full max-w-[60rem] flex-col items-center gap-14 px-5 py-[16vh] text-center">
      <ol className="grid gap-8">
        {CAPTIONS.map((t) => (
          <li key={t}>
            <h2 className="disp text-[clamp(2rem,4.4vw,4rem)]">{t}</h2>
          </li>
        ))}
      </ol>
      <PageFrame p={null} still />
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
    <section id="how" className="px-5 py-[16vh] md:px-12">
      <Reveal className="mx-auto max-w-[72rem] text-center">
        <h2 className="disp text-[clamp(2.4rem,5.6vw,5rem)]">how it works</h2>
        <div className="mt-14 grid border-t border-white/15 md:mt-20 md:grid-cols-3">
          {HOW.map((h, i) => (
            <div key={h.t} className={cn('border-b border-white/15 px-2 py-9 md:border-b-0 md:px-8 md:py-10', i > 0 && 'md:border-l md:border-white/15')}>
              <h3 className="text-[0.95rem] text-white">{h.t}</h3>
              <p className="mx-auto mt-3 max-w-[22rem] text-[0.8rem] leading-[1.8] text-white/55">{h.d}</p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

/* ------------------------------------------------------------------ the answer: it does not have to be a list */

function Impact() {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.35 })
  const flash = useMap(p, [0.08, 0.13, 0.26, 0.36], [0, 1, 1, 0], reduced, 0)
  const x1 = useMap(p, [0.34, 0.5], ['-40vw', '0vw'], reduced, '0vw')
  const x2 = useMap(p, [0.4, 0.56], ['40vw', '0vw'], reduced, '0vw')
  const x3 = useMap(p, [0.46, 0.62], ['-40vw', '0vw'], reduced, '0vw')
  const o1 = useMap(p, [0.34, 0.44], [0, 1], reduced, 1)
  const o2 = useMap(p, [0.4, 0.5], [0, 1], reduced, 1)
  const o3 = useMap(p, [0.46, 0.56], [0, 1], reduced, 1)
  const narrO = useMap(p, [0.64, 0.72, 0.94, 1], [0, 1, 1, 0], reduced, 1)
  const narrY = useMap(p, [0.64, 0.72], ['4vh', '0vh'], reduced, '0vh')
  return (
    <section ref={ref} className="relative h-[360svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-[72rem] flex-col items-center justify-center px-5 text-center">
          <h2 className="disp text-[clamp(2.8rem,9vw,8.6rem)]">
            <motion.span style={{ x: x1, opacity: o1 }} className="block">
              it doesn&apos;t
            </motion.span>
            <motion.span style={{ x: x2, opacity: o2 }} className="block">
              have to be
            </motion.span>
            <motion.span style={{ x: x3, opacity: o3 }} className="block">
              a list.
            </motion.span>
          </h2>
          <motion.p style={{ opacity: narrO, y: narrY }} className="mt-10 max-w-[28rem] text-[0.84rem] leading-[1.8] text-white/55">
            full screen, a live background, your song under it, a cursor that is yours. every scroll moves something.
          </motion.p>
        </div>
        <motion.div aria-hidden="true" style={{ opacity: flash }} className="pointer-events-none absolute inset-0 bg-white" />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ ten layouts, one phone */

function Layouts() {
  const ref = useRef<HTMLElement>(null)
  const { reduced } = useMotionPrefs()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 })
  const [i, setI] = useState(0)
  useMotionValueEvent(p, 'change', (v) => setI(Math.max(0, Math.min(LAYOUTS.length - 1, Math.floor(v * LAYOUTS.length * 0.999)))))
  const id = LAYOUTS[i].id as SampleId
  const lift = useMap(p, [0, 1], [14, -14], reduced, 0)
  const rail = useMap(p, [0, 1], ['0%', '100%'], reduced, '100%')
  return (
    <section ref={ref} id="layouts" className="relative h-[760svh]">
      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center overflow-hidden px-5 pt-14 text-center">
        <h2 className="disp text-[clamp(2.2rem,5vw,4.6rem)]">ten layouts</h2>
        <p className="mt-3 max-w-[24rem] text-[0.8rem] leading-[1.7] text-white/55">same links, ten ways to show them. keep scrolling to try each one.</p>
        <motion.div style={{ y: lift }} className="relative mt-8">
          <div className="relative h-[20rem] w-[176px] overflow-hidden border border-white/20 bg-black sm:h-[26rem] sm:w-[226px]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={id} initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.5, ease: EASE }} className="absolute inset-0">
                <div className="absolute top-0 left-0 origin-top-left scale-[0.451] sm:scale-[0.58]" style={{ width: 390, height: 720 }}>
                  <BioPage mode="mini" data={SAMPLES[id]} />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
        <p className="mt-7 text-[1rem]">{LAYOUTS[i].name.toLowerCase()}</p>
        <p className="mt-1 max-w-[22rem] text-[0.76rem] leading-[1.7] text-white/50">{LAYOUTS[i].note}</p>
        <ul className="mt-6 hidden max-w-[40rem] flex-wrap justify-center gap-x-5 gap-y-1 text-[0.72rem] md:flex" aria-label="layouts">
          {LAYOUTS.map((l, n) => (
            <li key={l.id} className={cn('transition-colors duration-500', n === i ? 'text-white' : 'text-white/30')}>
              {l.name.toLowerCase()}
            </li>
          ))}
        </ul>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-white/10">
          <motion.span style={{ width: rail }} className="block h-px bg-white" />
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ backgrounds: a square opens onto a live one */

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
  // the opening: a square grows from the middle while the scene is still arriving, then the scene stays put
  const iris = useMap(p, [0, 0.13], [0, 100], reduced, 100)
  const clip = useTransform(iris, (v) => `inset(${(100 - v) / 2}%)`)
  const scale = useMap(p, [0.1, 1], [1.12, 1], reduced, 1)
  return (
    <section ref={ref} id="backgrounds" className="relative h-[620svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        <motion.div className="absolute inset-0" style={{ clipPath: clip, WebkitClipPath: clip }}>
          <motion.div className="absolute inset-0" style={{ scale }}>
            <ShaderRunner key={s.id} id={s.id as ShaderId} tone={2} intensity={86} speed={55} px={px} py={py} level={level} reduced={reduced} />
          </motion.div>
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_50%,transparent,rgb(0_0_0/0.8))]" />
          <div className="relative mx-auto flex h-full w-full max-w-[72rem] flex-col items-center justify-between px-6 pt-28 pb-20 text-center">
            <div>
              <h2 className="disp text-[clamp(2.4rem,6vw,5.6rem)]">seven live backgrounds</h2>
              <p className="mx-auto mt-5 max-w-[26rem] text-[0.8rem] leading-[1.8] text-white/70">drawn live by the graphics card. they follow your pointer, move with your music, and blur as far as you want.</p>
            </div>
            <div>
              <AnimatePresence mode="wait">
                <motion.p key={s.id} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -30, opacity: 0 }} transition={{ duration: 0.45, ease: EASE }} className="disp text-[clamp(3rem,10vw,9rem)]">
                  {s.name.toLowerCase()}
                </motion.p>
              </AnimatePresence>
              <div aria-hidden="true" className="mt-6 flex justify-center gap-2">
                {BIO_SHADERS.map((b, n) => (
                  <span key={b.id} className={cn('block h-px w-8 transition-colors duration-500', n === i ? 'bg-white' : 'bg-white/25')} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ what it is and is not */

function Practices() {
  const yes = ['a full-screen page at logoless.io/you, from one character up', 'ten layouts, seven live backgrounds, thirteen cursors you can draw or upload', 'music, video and an enter screen, and the page moves with all of it', 'numbers on who looked and what they pressed']
  const no = ['a website builder with a thousand knobs', 'a feed, a follower count or an algorithm', 'a shop (not yet)', 'slow']
  return (
    <section className="px-5 py-[16vh] md:px-12">
      <Reveal className="mx-auto max-w-[56rem] text-center">
        <h2 className="disp text-[clamp(2.4rem,5.6vw,5rem)]">a page, not a website builder</h2>
        <p className="mx-auto mt-6 max-w-[28rem] text-[0.84rem] leading-[1.8] text-white/55">made for editors who got tired of sending people to a list of white buttons. a name, a page, a few good choices. then it gets out of the way.</p>
        <div className="mt-14 grid gap-12 border-t border-white/15 pt-12 text-center md:grid-cols-2 md:gap-16">
          <div>
            <h3 className="text-[0.95rem]">what it is</h3>
            <ul className="mt-6 space-y-4 text-[0.8rem] leading-[1.7] text-white/75">
              {yes.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-[0.95rem]">what it is not</h3>
            <ul className="mt-6 space-y-4 text-[0.8rem] leading-[1.7] text-white/40">
              {no.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ------------------------------------------------------------------ cursors */

function Cursors() {
  const [pick, setPick] = useState('arrow')
  const [ink, setInk] = useState<'white' | 'black'>('white')
  const css = cursorCss(pick, ink, 40)
  return (
    <section id="cursors" className="px-5 py-[16vh] md:px-12" style={{ cursor: css.arrow }}>
      <Reveal className="mx-auto max-w-[56rem] text-center">
        <h2 className="disp text-[clamp(2.4rem,5.6vw,5rem)]">your own cursor</h2>
        <p className="mx-auto mt-6 max-w-[28rem] text-[0.84rem] leading-[1.8] text-white/55">pick one of ours (this whole section is wearing it) or upload a picture or an svg of your own. each one has a second shape that shows up over your links. add a trail if you feel like it.</p>
        <div className="mt-8 inline-flex border border-white/25 p-0.5 text-[0.72rem]">
          {(['white', 'black'] as const).map((c) => (
            <button key={c} type="button" onClick={() => setInk(c)} aria-pressed={ink === c} className={cn('h-9 px-5 transition-colors', ink === c ? 'bg-white text-black' : 'text-white/55 hover:text-white')}>
              {c}
            </button>
          ))}
        </div>
        <div className="mt-12 grid grid-cols-3 border-t border-l border-white/15 sm:grid-cols-4" style={{ cursor: css.arrow }}>
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
              <span className={cn('absolute bottom-2 text-[0.62rem] opacity-0 transition-opacity group-hover:opacity-100', ink === 'white' ? 'text-white/60' : 'text-black/60')}>{c.name.toLowerCase()}</span>
            </button>
          ))}
        </div>
      </Reveal>
    </section>
  )
}

/* ------------------------------------------------------------------ common questions */

const TALK = [
  { q: 'what is a link in bio?', a: 'instagram, tiktok and youtube only let you put one link on your profile. logoless gives you a page to put there, with all your links, socials and edits on it.' },
  { q: 'is it really free?', a: 'claiming a name and building a page costs nothing, and nothing in the editor is locked behind anything.' },
  { q: 'can i have a one letter name?', a: 'names start at one character. dots, dashes and a few symbols work anywhere in them. if someone already has it, they have it.' },
  { q: 'does the music start by itself?', a: 'browsers keep sound off until someone clicks. turn on the enter screen and that click is what lets your song start.' },
  { q: 'can people watch my edits on the page?', a: 'paste a youtube, vimeo, tiktok or spotify link and it plays right there. anything else opens as a normal link.' },
  { q: 'will it slow my page down?', a: 'the backgrounds run on the graphics card and draw smaller on phones. anyone who asked their device for less motion gets a still page.' },
] as const

function Faq() {
  return (
    <section id="faq" className="px-5 py-[16vh] md:px-12">
      <Reveal className="mx-auto max-w-[44rem] text-center">
        <h2 className="disp text-[clamp(2.4rem,5.6vw,5rem)]">questions</h2>
      </Reveal>
      <div className="mx-auto mt-14 max-w-[44rem] border-t border-white/15">
        {TALK.map((t) => (
          <Reveal key={t.q} className="border-b border-white/15 py-8 text-center">
            <h3 className="text-[0.95rem] text-white">{t.q}</h3>
            <p className="mx-auto mt-3 max-w-[34rem] text-[0.8rem] leading-[1.8] text-white/55">{t.a}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the end: a white block rises and the page turns over */

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
      <motion.div style={{ clipPath: clip, WebkitClipPath: clip }} className="bg-[#ededed] text-black">
        <motion.div style={{ y: rise }} className="mx-auto flex w-full max-w-[72rem] flex-col items-center px-6 pt-[18vh] pb-[12vh] text-center md:px-12">
          <h2 className="disp text-[clamp(3.6rem,13vw,12rem)] !text-black">claim it.</h2>
          <p className="mt-6 max-w-[27rem] text-[0.84rem] leading-[1.8] text-black/65">it takes a few seconds and it&apos;s free. the short names go fast.</p>
          <div className="mt-10 w-full max-w-[38rem]">
            <ClaimBar big light />
          </div>
          <dl className="mt-[12vh] w-full max-w-[44rem] border-t border-black/25 text-left text-[0.78rem]">
            {SPECS.map(([k, v]) => (
              <div key={k} className="grid gap-1 border-b border-black/15 py-3.5 md:grid-cols-[11rem_1fr] md:gap-8">
                <dt className="text-black/50">{k}</dt>
                <dd className="text-black/80">{v}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </motion.div>
      <footer className="border-t border-white/15 px-6 py-14 text-center text-[0.76rem] md:px-12">
        <p className="disp text-[1.4rem]">logoless</p>
        <ul className="mt-6 flex flex-wrap justify-center gap-x-8 gap-y-2 text-white/60">
          {[['layouts', '#layouts'], ['backgrounds', '#backgrounds'], ['cursors', '#cursors'], ['log in', '/login'], ['get started', '/signup'], ['terms', '/legal/terms'], ['privacy', '/legal/privacy']].map(([n, href]) => (
            <li key={n}>
              <a href={href} className="transition-colors hover:text-white">
                {n}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-white/35">{new Date().getFullYear()} logoless</p>
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
        <Story />
        <Steps />
        <Impact />
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
