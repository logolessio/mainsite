'use client'

import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { ArrowDown, ArrowRight, Loader2, Lock, UserRound } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Logo } from '@/components/logo'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { ArchWindow } from './arch'
import { STAGE_FONTS } from './fonts'
import { hueFor, MovingGradient, Orb, usePointer } from './stage'

type Props = {
  name: string
  slug: string
  /** signedOut: nobody is signed in. unclaimed: signed in, link not claimed yet. */
  state: 'signedOut' | 'unclaimed'
  email?: string
  lockedTo?: string | null
  admin?: boolean
}

// the four things the page has always said it was about
const POINTS = ['Your artist page', 'Launch a campaign', 'Fund and top up', 'Pay only for verified views']

/** Big words that rise out of a mask, one letter after another. */
function Letters({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span className="inline-flex flex-wrap justify-center" aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={i} aria-hidden="true" className="inline-block overflow-hidden pb-[0.06em]">
          <motion.span initial={{ y: '112%', rotate: 6 }} animate={{ y: 0, rotate: 0 }} transition={{ duration: 1.1, delay: delay + i * 0.055, ease: [0.22, 1, 0.36, 1] }} className="inline-block">
            {ch === ' ' ? ' ' : ch}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

/** Fades up out of a blur as it scrolls into view, once. */
function Reveal({ root, children, delay = 0, className }: { root: React.RefObject<HTMLElement | null>; children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 36, filter: 'blur(10px)' }} whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }} viewport={{ root: root as React.RefObject<Element>, once: true, margin: '0px 0px -10% 0px' }} transition={{ duration: 1, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  )
}

/** A block that drifts a little against the scroll, so the page has depth. */
function Drift({ root, by, children, className }: { root: React.RefObject<HTMLElement | null>; by: number; children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ container: root as React.RefObject<HTMLElement>, target: ref, offset: ['start end', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], [by, -by])
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  )
}

/** The first thing an invited artist sees: their name, huge, an arch with a sun in it, round buttons, and a page that moves as you scroll. */
export function InviteWelcome({ name, slug, state, email, lockedTo, admin }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const sections = useRef<HTMLDivElement>(null)
  const band = useRef<HTMLDivElement>(null)
  const hue = hueFor(slug)
  const pointer = usePointer()
  const { scrollY, scrollYProgress: pageProgress } = useScroll({ container: scroller })
  const smooth = useSpring(scrollY, { stiffness: 90, damping: 24, mass: 0.6 })
  const next = encodeURIComponent(`/${slug}`)
  const title = `Hey ${name}.`.toUpperCase()

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const claim = async () => {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/invite/${slug}/claim`, { method: 'POST' }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string }
    if (!res?.ok) {
      setBusy(false)
      return setError(j.error ?? 'Something went wrong. Please try again.')
    }
    router.refresh()
  }

  // the parts of the first screen each move at their own speed
  const titleY = useTransform(smooth, [0, 900], [0, 190])
  const titleScale = useTransform(smooth, [0, 900], [1, 1.07])
  const archY = useTransform(smooth, [0, 900], [0, 80])
  const leftY = useTransform(smooth, [0, 900], [0, -90])
  const rightY = useTransform(smooth, [0, 900], [0, 130])
  const heroFade = useTransform(smooth, [0, 520], [1, 0])
  const leftX = useTransform(pointer.x, (v) => v * -16)
  const rightX = useTransform(pointer.x, (v) => v * 20)
  const titleX = useTransform(pointer.x, (v) => v * -12)

  // the line that draws itself down the page as you scroll
  const { scrollYProgress: lineProgress } = useScroll({ container: scroller, target: sections, offset: ['start 85%', 'end 60%'] })
  const draw = useSpring(lineProgress, { stiffness: 80, damping: 22 })
  const arrow = useTransform(draw, [0.94, 1], [0, 1])
  const railDot = useSpring(pageProgress, { stiffness: 120, damping: 26 })
  const railY = useTransform(railDot, [0, 1], ['0%', '100%'])

  // two lines of big type that slide against each other
  const { scrollYProgress: bandProgress } = useScroll({ container: scroller, target: band, offset: ['start end', 'end start'] })
  const bandA = useTransform(bandProgress, [0, 1], ['4%', '-36%'])
  const bandB = useTransform(bandProgress, [0, 1], ['-44%', '2%'])

  const size = `min(15.5rem, calc(78vw / ${Math.max(3.6, title.length * 0.6)}))`

  const primary =
    state === 'signedOut' ? (
      <Orb filled size="lg" as="a" href={`/signup?next=${next}`}>
        Create my account <ArrowRight aria-hidden="true" className="mx-auto mt-1.5 size-4" />
      </Orb>
    ) : admin ? (
      <Orb filled size="lg" as="a" href={`/${slug}?preview=1`}>
        Try the set-up as {name}
      </Orb>
    ) : (
      <Orb filled size="lg" as="button" onClick={claim} disabled={busy}>
        {busy ? <Loader2 className="mx-auto mb-1.5 size-4 animate-spin" /> : null} Yes, this is me <ArrowRight aria-hidden="true" className="mx-auto mt-1.5 size-4" />
      </Orb>
    )

  const secondary =
    state === 'signedOut' ? (
      <Orb as="a" href={`/login?next=${next}`}>
        I already have an account
      </Orb>
    ) : admin ? (
      <Orb as="a" href="/admin/invites">
        Back to artist links
      </Orb>
    ) : (
      <Orb as="button" onClick={() => signOut({ callbackUrl: `/login?next=${next}` })}>
        Not you?
      </Orb>
    )

  const notes = (
    <>
      {state === 'unclaimed' && email && !admin && (
        <p className="stage-mono-body text-center text-[12px] leading-relaxed text-white/75">
          Signed in as <span className="text-paper">{email}</span>.
        </p>
      )}
      {lockedTo && (
        <p className="stage-mono-body inline-flex items-center justify-center gap-1.5 text-center text-[11px] text-white/65">
          <Lock className="size-3 shrink-0" /> Use the email this link was sent to ({lockedTo})
        </p>
      )}
      {error && (
        <p role="alert" className="stage-mono-body text-center text-[12px] text-red-300">
          {error}
        </p>
      )}
    </>
  )

  return (
    <div className={cn('stage-root fixed inset-0 z-[80] text-paper', STAGE_FONTS)} style={{ ['--stage-h' as string]: hue }}>
      <MovingGradient hue={hue} pointer={pointer} scroll={smooth} />

      {/* a thin line down the right edge with a dot that shows how far down you are */}
      <div aria-hidden="true" className="pointer-events-none fixed top-1/2 right-5 z-30 hidden h-40 w-px -translate-y-1/2 bg-white/25 lg:block xl:right-9">
        <motion.span style={{ top: railY }} className="absolute left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper" />
      </div>

      <div ref={scroller} className="relative h-full overflow-x-hidden overflow-y-auto overscroll-contain scroll-smooth">
        {/* top bar */}
        <header className="sticky top-0 z-40 flex items-start justify-between px-5 pt-5 md:px-10 md:pt-8">
          <motion.a href="/" aria-label="logoless" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3, ease: EASE_OUT }} className="grid h-11 place-items-center border border-white/55 bg-black/20 px-4 backdrop-blur-md transition-colors duration-500 hover:bg-white/10">
            <Logo className="h-4" />
          </motion.a>
          <motion.span initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.4, ease: EASE_OUT }} className="grid size-11 place-items-center rounded-full border border-white/55 bg-black/20 backdrop-blur-md" title={email}>
            {email ? <span className="stage-mono text-xs">{email[0]}</span> : <UserRound aria-hidden="true" className="size-4" />}
          </motion.span>
        </header>

        {/* ---------- the first screen ---------- */}
        <section className="relative -mt-[4.5rem] flex min-h-[100svh] flex-col items-center px-4 pt-28 pb-24 md:-mt-[5.5rem] md:pt-32">
          {admin && (
            <motion.p style={{ opacity: heroFade }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.8 }} className="stage-mono-body relative z-20 mb-4 inline-block border border-amber-200/40 bg-amber-200/10 px-4 py-2 text-[11px] text-amber-100">
              Admin preview: this is what {name} sees. Admins cannot claim a link.
            </motion.p>
          )}
          <motion.p style={{ opacity: heroFade }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 1.2 }} className="stage-mono relative z-20 text-[11px] normal-case tracking-[0.06em] text-white/80 italic">
            A private page, made for you
          </motion.p>

          <motion.h1 style={{ y: titleY, scale: titleScale, x: titleX, fontSize: size }} className="stage-grot relative z-10 mt-4 text-center text-paper will-change-transform">
            <Letters text={title} delay={0.45} />
          </motion.h1>

          <motion.div style={{ y: archY }} className="relative z-0 w-full">
            <ArchWindow pointer={pointer} scroll={smooth} className="-mt-5 sm:-mt-7 md:-mt-12" />
          </motion.div>

          {/* the round buttons sit either side of the arch on a wide screen, and below it on a phone */}
          <motion.div style={{ y: leftY, x: leftX }} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.3, delay: 1.6, ease: [0.22, 1, 0.36, 1] }} className="mt-10 md:absolute md:top-[46%] md:left-[5%] md:mt-0 xl:left-[8%]">
            {primary}
          </motion.div>
          <motion.div style={{ y: rightY, x: rightX }} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.3, delay: 1.8, ease: [0.22, 1, 0.36, 1] }} className="mt-6 md:absolute md:top-[52%] md:right-[6%] md:mt-0 xl:right-[10%]">
            {secondary}
          </motion.div>
          <div className="mt-8 grid max-w-xs gap-2">{notes}</div>

          <motion.span aria-hidden="true" style={{ opacity: heroFade }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.4, duration: 1 }} className="absolute bottom-7 left-1/2 -translate-x-1/2 text-white/70">
            <motion.span animate={{ y: [0, 8, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }} className="block">
              <ArrowDown className="size-5" />
            </motion.span>
          </motion.span>
        </section>

        {/* ---------- what it says ---------- */}
        <div ref={sections} className="relative">
          <svg viewBox="0 0 1000 1500" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            <motion.path d="M 500 0 V 90 C 500 190, 420 230, 330 230 H 250 C 150 230, 110 290, 110 390 V 640 C 110 740, 170 780, 280 780 H 600 C 720 780, 790 850, 790 950 V 1400" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" style={{ pathLength: draw }} />
            <motion.path d="M 770 1352 L 790 1400 L 810 1352" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" style={{ opacity: arrow }} />
          </svg>

          <section className="relative mx-auto grid max-w-[1180px] px-6 pt-40 pb-20 md:grid-cols-12 md:px-10 md:pt-56 md:pb-32">
            <Drift root={scroller} by={46} className="md:col-span-6 md:col-start-6">
              <Reveal root={scroller}>
                <p className="stage-mono-body text-[clamp(1.05rem,2.1vw,1.55rem)] leading-[1.75] text-paper">Set up your artist page, launch a campaign and let creators turn your music into views. It takes about five minutes.</p>
              </Reveal>
            </Drift>
          </section>

          <section className="relative mx-auto max-w-[1180px] px-6 pb-28 md:px-10 md:pb-44">
            <ul className="border-t border-white/25">
              {POINTS.map((t, i) => (
                <li key={t}>
                  <Reveal root={scroller} delay={i * 0.06}>
                    <div className="group relative flex items-center justify-between gap-6 border-b border-white/25 py-7 transition-all duration-700 hover:pl-5 md:py-10">
                      <span aria-hidden="true" className="absolute inset-x-0 bottom-[-1px] h-px origin-left scale-x-0 bg-paper transition-transform duration-700 ease-out group-hover:scale-x-100" />
                      <span className="stage-grot text-[clamp(1.9rem,5.6vw,4.6rem)]">{t}</span>
                      <ArrowRight aria-hidden="true" className="size-7 shrink-0 -translate-x-3 text-paper/0 transition-all duration-700 group-hover:translate-x-0 group-hover:text-paper md:size-9" />
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* ---------- big type that slides ---------- */}
        <div ref={band} aria-hidden="true" className="relative my-4 overflow-hidden py-6 select-none md:my-12">
          <motion.p style={{ x: bandA, WebkitTextStroke: '1px rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }} className="stage-grot text-[clamp(4rem,14vw,13rem)] text-transparent">
            {POINTS[0]} &nbsp;·&nbsp; {POINTS[1]} &nbsp;·&nbsp; {POINTS[0]}
          </motion.p>
          <motion.p style={{ x: bandB, whiteSpace: 'nowrap' }} className="stage-grot text-[clamp(4rem,14vw,13rem)] text-paper">
            {POINTS[2]} &nbsp;·&nbsp; {POINTS[3]} &nbsp;·&nbsp; {POINTS[2]} &nbsp;·&nbsp; {POINTS[3]}
          </motion.p>
        </div>

        {/* ---------- the same button again, at the end ---------- */}
        <section className="relative flex min-h-[80svh] flex-col items-center justify-center gap-8 px-6 pt-10 pb-24 text-center">
          <Reveal root={scroller} delay={0.05}>
            {primary}
          </Reveal>
          <Reveal root={scroller} delay={0.15}>
            {secondary}
          </Reveal>
          <Reveal root={scroller} delay={0.25} className="grid max-w-xs gap-2">
            {notes}
          </Reveal>
        </section>
      </div>
    </div>
  )
}
