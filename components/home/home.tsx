'use client'

import '@/components/editor/editor.css'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'framer-motion'
import { ArrowRight, Check, Loader2, Plus, X } from 'lucide-react'
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import { BioPage } from '@/components/bio/bio-page'
import { Glow, LOVABLE_GLOW } from '@/components/bio/glow'
import type { BioPageData } from '@/components/bio/context'
import { CardEffectLayer } from '@/components/profile/card-effect'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { LAYOUTS, OVERLAYS } from '@/lib/bio'
import { CURSORS, cursorCss, cursorSvg } from '@/lib/bio-cursors'
import { cn } from '@/lib/utils'
import { type SampleId, SAMPLES } from './samples'

/**
 * The home page. It says what logoless is in the first line and shows it at once (real pages, not pictures of them), puts the one thing to do in
 * reach (claim a name), and then answers the questions people have in the order they have them. Plex Mono for the words, Geist Light for the
 * titles, pills for anything you press and 28px panels, with the small, quick motion the reference sites use.
 */
const EASE = [0.2, 0.8, 0.2, 1] as const
const vars = (o: Record<string, string>) => o as CSSProperties

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

/** Rises a little and fades in, once, as it comes into view. */
function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const { reduced } = useMotionPrefs()
  return (
    <motion.div initial={reduced ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -8% 0px' }} transition={{ duration: 0.5, ease: 'easeOut', delay }} className={className}>
      {children}
    </motion.div>
  )
}

const H2 = 'disp text-[clamp(2rem,4.2vw,3.4rem)]'
const SUB = 'mx-auto mt-5 max-w-[34rem] text-[0.88rem] leading-[1.8] text-white/55'

/* ------------------------------------------------------------------ a page in a phone */

function Phone({ id, width = 260, className, still = false }: { id: SampleId; width?: number; className?: string; still?: boolean }) {
  const data: BioPageData = SAMPLES[id]
  const k = width / 390
  return (
    <div aria-hidden="true" className={cn('relative shrink-0 overflow-hidden rounded-[2rem] border border-white/12 bg-black shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)]', className)} style={{ width, height: 844 * k }}>
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: 390, height: 844, transform: `scale(${k})` }}>
        <BioPage mode="mini" data={data} still={still} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ claim a name */

type Avail = null | 'checking' | { ok: boolean; message: string }
export function ClaimBar({ big = false }: { big?: boolean }) {
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
  const note = avail && avail !== 'checking' ? (avail.ok ? `logoless.io/${v.trim().toLowerCase()} is free. It's yours if you want it.` : avail.message) : 'Free. Names can be a single character.'
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        go()
      }}
      className="w-full"
    >
      <div className={cn('flex w-full items-center rounded-full border border-white/20 bg-black/40 p-1.5 pl-6 shadow-[var(--ed-lift)] transition-colors focus-within:border-white/45', big ? 'h-[4.25rem]' : 'h-[3.5rem]')}>
        <span className="select-none text-[0.9rem] text-white/60">logoless.io/</span>
        <input
          value={v}
          onChange={(e) => setV(e.target.value.toLowerCase().replace(/[^a-z0-9._\-~!$*+=]/g, '').slice(0, 30))}
          placeholder="yourname"
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label="The name you want"
          className="min-w-0 flex-1 rounded-none bg-transparent text-[0.9rem] text-white outline-none placeholder:text-white/25"
        />
        <span className="mr-2 grid size-7 place-items-center" aria-live="polite">
          {avail === 'checking' ? <Loader2 className="size-4 animate-spin text-white/45" /> : avail ? avail.ok ? <Check className="size-4 text-white" /> : <X className="size-4 text-white/45" /> : null}
        </span>
        <button type="submit" className="inline-flex h-full items-center gap-2 rounded-full bg-[#ececec] px-6 text-[0.84rem] font-medium text-[#0a0a0a] transition-[transform,background] duration-200 [transition-timing-function:cubic-bezier(.22,1,.36,1)] hover:-translate-y-px hover:bg-white">
          Claim <ArrowRight className="size-3.5" />
        </button>
      </div>
      <p className="mt-3 h-5 text-center text-[0.76rem] text-white/70" aria-live="polite">
        {note}
      </p>
    </form>
  )
}

/* ------------------------------------------------------------------ the top bar: a floating pill */

function Nav() {
  return (
    <header className="drop fixed inset-x-0 top-4 z-50 px-4">
      <div className="mx-auto flex h-14 w-full max-w-[64rem] items-center justify-between rounded-full border border-white/10 bg-black/75 pr-2 pl-6 shadow-[var(--ed-lift)]">
        <a href="#top" className="disp text-[1.3rem]" aria-label="logoless, back to the top">
          logoless
        </a>
        <nav aria-label="Page" className="hidden items-center gap-1 text-[0.8rem] text-white/60 md:flex">
          {[['What you get', '#features'], ['Try it', '#try'], ['Questions', '#faq']].map(([n, h]) => (
            <a key={h} href={h} className="rounded-full px-4 py-2 transition-colors hover:bg-white/[0.07] hover:text-white">
              {n}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <a href="/login" className="hidden h-10 items-center rounded-full px-4 text-[0.8rem] text-white/70 transition-colors hover:bg-white/[0.07] hover:text-white sm:inline-flex">
            Log in
          </a>
          <a href="/signup" className="btn btn-solid btn-sm">
            Sign up free
          </a>
        </div>
      </div>
    </header>
  )
}

/* ------------------------------------------------------------------ the title: what it is, and real pages straight away */

function Hero() {
  return (
    <section id="top" className="relative overflow-hidden px-5 pt-36 text-center md:pt-44">
      <Glow colors={LOVABLE_GLOW} enter grain fade w="clamp(1500px, 190vw, 3200px)" top="250px" />
      <div className="relative z-10 mx-auto flex max-w-[56rem] flex-col items-center">
        <h1 className="disp rise text-[11.5vw] md:text-[clamp(3rem,6vw,5.4rem)]" style={vars({ '--d': '0.05s' })}>
          One link for <br className="md:hidden" />
          everything you make.
        </h1>
        <p className="rise mt-6 max-w-[34rem] text-[0.9rem] leading-[1.8] text-white/80" style={vars({ '--d': '0.15s' })}>
          logoless is a link in bio for editors. Put your links, socials, edits and music on one clean page, then share a single link.
        </p>
        <div className="rise mt-9 w-full max-w-[30rem]" style={vars({ '--d': '0.25s' })}>
          <ClaimBar />
        </div>
      </div>

      {/* real pages, floating at three depths */}
      <div aria-hidden="true" className="rise relative mx-auto mt-12 h-[19rem] w-full max-w-[44rem] md:mt-14 md:h-[32rem]" style={vars({ '--d': '0.4s' })}>
        <div className="absolute top-0 left-1/2 h-[640px] w-[640px] -translate-x-1/2 origin-top scale-[0.52] sm:scale-[0.7] md:scale-100">
          <div className="float absolute top-[110px] left-0" style={vars({ '--t': '8s', '--d': '0.6s' })}>
            <Phone id="side" width={190} still />
          </div>
          <div className="float absolute top-0 left-[195px]" style={vars({ '--t': '7s' })}>
            <Phone id="classic" width={250} />
          </div>
          <div className="float absolute top-[110px] left-[450px]" style={vars({ '--t': '9s', '--d': '1.2s' })}>
            <Phone id="card" width={190} still />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#080808]/90 to-transparent" />
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ what you get, as plain rows */

const PLAIN = [
  ['Your page', 'logoless.io/you, from one character up. Links, socials, videos and a song on one page.'],
  ['Your own files', 'Your picture, banner, background, GIF, video, cursor and song. Too big to upload? Paste a link to it instead.'],
  ['The card', 'It floats over your background and turns towards the pointer, with your picture, name and icons standing off it.'],
  ['Effects', 'Snow, rain, embers, smoke, petals, a storm and thirteen more, playing over the background.'],
  ['Layouts', 'Classic, a profile card, side by side, or a blank canvas where you drag everything where you want it.'],
  ['Numbers', 'Views, clicks and which link people press, for the last 30 days.'],
  ['Price', 'Free. Nothing in the editor is locked.'],
] as const

function Plain() {
  return (
    <section id="features" className="scroll-mt-24 px-5 py-20">
      <Reveal className="mx-auto max-w-[44rem]">
        <h2 className={cn(H2, 'text-left')}>What you get</h2>
        <dl className="mt-10 divide-y divide-white/10 border-y border-white/10 text-left">
          {PLAIN.map(([t, d]) => (
            <div key={t} className="grid gap-1 py-5 md:grid-cols-[10rem_1fr] md:gap-8">
              <dt className="text-[0.9rem] text-white">{t}</dt>
              <dd className="text-[0.86rem] leading-[1.8] text-white/55">{d}</dd>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  )
}

/* ------------------------------------------------------------------ try it: three things to change, live */

const TABS = [
  ['layouts', 'Layouts'],
  ['effects', 'Effects'],
  ['cursors', 'Cursors'],
] as const
type Tab = (typeof TABS)[number][0]

function Pill({ on, children, onClick }: { on: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className={cn('h-9 rounded-full border px-4 text-[0.78rem] transition-[background,color,border-color,transform] duration-200 hover:-translate-y-px', on ? 'border-transparent bg-[#ececec] text-[#0a0a0a]' : 'border-white/12 bg-white/[0.03] text-white/65 hover:border-white/25 hover:text-white')}>
      {children}
    </button>
  )
}

function LayoutsDemo() {
  const [i, setI] = useState(0)
  const l = LAYOUTS[i]
  return (
    <div className="grid items-center gap-8 md:grid-cols-[1fr_auto] md:gap-14">
      <div className="text-left">
        <h3 className="disp text-[1.8rem]">{l.name}</h3>
        <p className="mt-2 max-w-[24rem] text-[0.86rem] leading-[1.7] text-white/55">{l.note.replace(/(^|\. )([a-z])/g, (_m, pre: string, c: string) => pre + c.toUpperCase())}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {LAYOUTS.map((x, n) => (
            <Pill key={x.id} on={n === i} onClick={() => setI(n)}>
              {x.name}
            </Pill>
          ))}
        </div>
      </div>
      <div className="relative mx-auto h-[26rem] w-[226px] overflow-hidden rounded-[2rem] border border-white/12 bg-black shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={l.id} initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.4, ease: EASE }} className="absolute inset-0">
            <div className="absolute top-0 left-0 origin-top-left scale-[0.58]" style={{ width: 390, height: 720 }}>
              <BioPage mode="mini" data={SAMPLES[l.id as SampleId]} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function EffectsDemo() {
  const [i, setI] = useState(2)
  const list = OVERLAYS.filter((o) => o.id !== 'none')
  const e = list[i]
  return (
    <div className="text-left">
      <div className="relative h-[20rem] overflow-hidden rounded-[24px] border border-white/10 bg-[radial-gradient(120%_90%_at_50%_18%,#1a1a1d,#050505_72%)] md:h-[26rem]">
        <CardEffectLayer key={e.id} effect={e.id} intensity={70} speed={55} colors={['#ffffff', '#9a9a9a']} scope="card" />
        <p className="absolute bottom-5 left-6 text-[0.8rem] text-white/80">{e.name}</p>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {list.map((o, n) => (
          <Pill key={o.id} on={n === i} onClick={() => setI(n)}>
            {o.name}
          </Pill>
        ))}
      </div>
    </div>
  )
}

function CursorsDemo() {
  const [pick, setPick] = useState('arrow')
  const [ink, setInk] = useState<'white' | 'black'>('white')
  const css = cursorCss(pick, ink, 40)
  return (
    <div style={{ cursor: css.arrow }}>
      <div className="mx-auto inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
        {(['white', 'black'] as const).map((c) => (
          <button key={c} type="button" onClick={() => setInk(c)} aria-pressed={ink === c} className={cn('h-8 rounded-full px-5 text-[0.76rem] capitalize transition-colors', ink === c ? 'bg-[#ececec] text-[#0a0a0a]' : 'text-white/55 hover:text-white')}>
            {c}
          </button>
        ))}
      </div>
      <p className="mt-4 text-[0.78rem] text-white/45">This panel is wearing the cursor you pick.</p>
      <div className="mx-auto mt-6 grid max-w-[44rem] grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-7">
        {CURSORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setPick(c.id)}
            aria-pressed={pick === c.id}
            aria-label={c.name}
            className={cn('group relative grid aspect-square place-items-center overflow-hidden rounded-2xl border transition-[border-color,transform] duration-200 hover:-translate-y-0.5', pick === c.id ? 'border-white/70' : 'border-white/10 hover:border-white/25')}
            style={{ background: ink === 'white' ? '#0b0b0b' : '#e8e8e8', cursor: cursorCss(c.id, ink, 40).link }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:image/svg+xml,${encodeURIComponent(cursorSvg(c.arrow, ink, 32))}`} alt="" width={32} height={32} className="transition-transform duration-300 group-hover:scale-110" />
          </button>
        ))}
      </div>
      <p className="mt-5 text-[0.8rem] text-white/60">{CURSORS.find((c) => c.id === pick)?.name}</p>
    </div>
  )
}

function TryIt() {
  const [tab, setTab] = useState<Tab>('layouts')
  return (
    <section id="try" className="scroll-mt-24 px-5 py-20">
      <Reveal className="mx-auto max-w-[64rem] text-center">
        <h2 className={H2}>Try it right here</h2>
        <p className={SUB}>Change a layout, an effect or a cursor and see what your page would look like.</p>
        <div role="tablist" aria-label="What to try" className="mt-8 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
          {TABS.map(([id, name]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cn('h-10 rounded-full px-5 text-[0.8rem] transition-colors duration-200', tab === id ? 'bg-[#ececec] text-[#0a0a0a]' : 'text-white/60 hover:text-white')}>
              {name}
            </button>
          ))}
        </div>
      </Reveal>
      <Reveal className="mx-auto mt-8 max-w-[64rem] rounded-[32px] border border-white/10 bg-[#0b0b0b] p-5 text-center shadow-[var(--ed-lift)] md:p-9" delay={0.1}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }}>
            {tab === 'layouts' && <LayoutsDemo />}
            {tab === 'effects' && <EffectsDemo />}
            {tab === 'cursors' && <CursorsDemo />}
          </motion.div>
        </AnimatePresence>
      </Reveal>
    </section>
  )
}

/* ------------------------------------------------------------------ how it works */

/* ------------------------------------------------------------------ questions */

const TALK = [
  { q: 'What is a link in bio?', a: 'Instagram, TikTok and YouTube only let you put one link on your profile. logoless gives you a page to put there, with all your links, socials and edits on it.' },
  { q: 'Is it really free?', a: 'Claiming a name and building a page costs nothing, and nothing in the editor is locked behind anything.' },
  { q: 'Can I have a one letter name?', a: 'Names start at one character. Dots, dashes and a few symbols work anywhere in them. If someone already has it, they have it.' },
  { q: 'Does the music start by itself?', a: 'Browsers keep sound off until someone clicks. Turn on the enter screen and that click is what lets your song start.' },
  { q: 'Can people watch my edits on the page?', a: 'Paste a YouTube, Vimeo, TikTok or Spotify link and it plays right there. Anything else opens as a normal link.' },
  { q: 'Will it slow my page down?', a: 'The effects are drawn small and stop when they are off screen. Anyone who asked their device for less motion gets a still page.' },
] as const

function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="scroll-mt-24 px-5 py-20">
      <Reveal className="mx-auto max-w-[44rem] text-center">
        <h2 className={H2}>Questions</h2>
      </Reveal>
      <div className="mx-auto mt-10 grid max-w-[44rem] gap-3">
        {TALK.map((t, i) => (
          <Reveal key={t.q} delay={0.04 * i}>
            <div className={cn('overflow-hidden rounded-2xl border bg-[#0d0d0d] transition-colors duration-200', open === i ? 'border-white/16' : 'border-white/8 hover:border-white/14')}>
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 rounded-none px-6 py-5 text-left text-[0.92rem]">
                {t.q}
                <Plus className={cn('size-4 shrink-0 text-white/50 transition-transform duration-300', open === i && 'rotate-45')} />
              </button>
              <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out', open === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                <div className="overflow-hidden">
                  <p className="px-6 pb-6 text-[0.86rem] leading-[1.8] text-white/55">{t.a}</p>
                </div>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ the end: the same thing to do, once more */

function Cta() {
  return (
    <section id="claim" className="scroll-mt-24 px-5 py-20">
      <Reveal className="relative mx-auto max-w-[64rem] overflow-hidden rounded-[36px] border border-white/10 bg-[#0b0b0b] px-6 py-16 text-center shadow-[var(--ed-lift)] md:py-24">
        <Glow colors={LOVABLE_GLOW} grain w="clamp(820px, 92vw, 1400px)" top="90px" />
        <div className="relative z-10">
        <h2 className="disp text-[clamp(2.4rem,5vw,4.4rem)]">Claim your page.</h2>
        <p className={cn(SUB, '!text-white/85')}>It takes about a minute, and it&apos;s free. The short names go first.</p>
        <div className="mx-auto mt-9 w-full max-w-[32rem]">
          <ClaimBar big />
        </div>
        </div>
      </Reveal>
    </section>
  )
}

function Footer() {
  const cols: [string, [string, string][]][] = [
    ['Product', [['What you get', '#features'], ['Try it', '#try'], ['Questions', '#faq']]],
    ['Account', [['Log in', '/login'], ['Sign up free', '/signup']]],
    ['Legal', [['Terms', '/legal/terms'], ['Privacy', '/legal/privacy'], ['All policies', '/legal']]],
  ]
  return (
    <footer className="border-t border-white/8 px-5 pt-14 pb-12">
      <div className="mx-auto grid max-w-[64rem] gap-10 text-[0.82rem] md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <p className="disp text-[1.4rem]">logoless</p>
          <p className="mt-3 max-w-[16rem] leading-[1.7] text-white/45">A link in bio for editors.</p>
        </div>
        {cols.map(([h, links]) => (
          <div key={h}>
            <p className="text-white/40">{h}</p>
            <ul className="mt-4 space-y-2.5">
              {links.map(([n, href]) => (
                <li key={n}>
                  <a href={href} className="text-white/75 transition-colors hover:text-white">
                    {n}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mx-auto mt-12 max-w-[64rem] text-[0.76rem] text-white/35">{new Date().getFullYear()} logoless</p>
    </footer>
  )
}

export function Home() {
  return (
    <div className="ed relative min-h-dvh overflow-x-clip">
      <Nav />
      <main>
        <Hero />
        <Plain />
        <TryIt />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </div>
  )
}
