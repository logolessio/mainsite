'use client'

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { Check, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { CountUp } from '@/components/app/count-up'
import { Parallax } from '@/components/motion/parallax'
import { Reveal } from '@/components/motion/reveal'
import { Tilt3D } from '@/components/motion/tilt'
import { Words } from '@/components/motion/words'
import { T } from '@/components/shell/copy-provider'
import { CONTAINER, EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

const OUTLINE = { WebkitTextStroke: '1px rgb(243 242 238 / 0.28)' } as const

/** A beat of the story: a giant number on one side, the words on the other. `flip` swaps the sides. */
export function SplitBeat({ n, label, title, children, list, flip }: { n: string; label: string; title: string; children: React.ReactNode; list?: string[]; flip?: boolean }) {
  return (
    <section className={cn(CONTAINER, 'border-t border-line py-20 md:py-32')}>
      <div className="grid items-center gap-10 md:grid-cols-12 md:gap-16">
        <Tilt3D max={5} glare={false} className={cn('md:col-span-5', flip && 'md:order-2')}>
          <Parallax distance={26}>
            <p aria-hidden="true" style={OUTLINE} className="select-none font-display font-display-thin text-[34vw] leading-[0.8] text-transparent md:text-[15rem]">
              {n}
            </p>
          </Parallax>
        </Tilt3D>
        <div className={cn('md:col-span-7', flip && 'md:order-1')}>
          <Reveal y={10}>
            <p className="font-mono text-xs tracking-widest text-mute uppercase"><T>{label}</T></p>
          </Reveal>
          <Words as="h3" text={title} className="mt-5 justify-start text-left font-display text-5xl leading-[0.98] md:text-7xl" />
          <Reveal delay={0.2} className="mt-8 max-w-xl text-pretty text-lg leading-snug text-mute md:text-xl">
            {children}
          </Reveal>
          {list && (
            <ul className="mt-8 grid max-w-xl gap-3">
              {list.map((l, i) => (
                <Reveal key={l} delay={0.3 + i * 0.07} y={12} blur={false}>
                  <li className="flex items-center gap-3 border-t border-line pt-3 text-paper/85">
                    <Check aria-hidden="true" className="size-4 shrink-0 text-signal" />
                    <T>{l}</T>
                  </li>
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}

/** Big numbers on hairlines. Each one counts up when it scrolls into view. */
export function StatRow({ stats }: { stats: { value: string; label: string; note?: string }[] }) {
  return (
    <section className={cn(CONTAINER, 'py-16 md:py-28')}>
      <ul className={cn('grid gap-px overflow-hidden rounded-3xl bg-line', stats.length === 4 ? 'md:grid-cols-4' : stats.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3')}>
        {stats.map((s, i) => (
          <motion.li key={s.label} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -10% 0px' }} transition={{ duration: 0.8, delay: i * 0.1, ease: EASE_OUT }} className="group bg-ink px-6 py-14 text-center transition-colors hover:bg-surface md:py-20">
            <Tilt3D max={5} className="flex flex-col items-center">
              <p className="font-display text-7xl leading-none md:text-[8rem]"><CountUp value={s.value} /></p>
              <p className="mt-5 font-mono text-xs tracking-widest text-mute uppercase"><T>{s.label}</T></p>
              {s.note && <p className="mt-3 max-w-[22ch] text-sm leading-snug text-mute/80"><T>{s.note}</T></p>}
            </Tilt3D>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}

/** Two ribbons of words, drifting in opposite directions. */
export function Ticker({ words }: { words: string[] }) {
  const row = (reverse: boolean, outline: boolean) => (
    <div className="flex overflow-hidden" aria-hidden="true">
      {[0, 1].map((k) => (
        <div key={k} style={{ animationDirection: reverse ? 'reverse' : 'normal', animationDuration: '46s' }} className="animate-marquee flex shrink-0 items-center gap-10 pr-10">
          {words.map((w) => (
            <span key={w} className="flex items-center gap-10">
              <span style={outline ? OUTLINE : undefined} className={cn('font-display whitespace-nowrap text-6xl leading-none md:text-8xl', outline ? 'text-transparent' : 'text-paper')}>
                {w}
              </span>
              <span className="size-2.5 shrink-0 bg-signal" />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
  return (
    <div className="space-y-3 border-y border-line py-10 md:py-14">
      {row(false, false)}
      {row(true, true)}
    </div>
  )
}

export type RailStep = { title: string; body: string; detail?: string[] }

/** A story that scrolls sideways while the page stays put. */
export function HorizontalStory({ eyebrow, title, steps }: { eyebrow: string; title: string; steps: RailStep[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const [max, setMax] = useState(0)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 110, damping: 26, mass: 0.4 })
  const x = useTransform(p, [0, 1], [0, -max])
  const bar = useTransform(p, [0, 1], ['0%', '100%'])

  useEffect(() => {
    const measure = () => setMax(Math.max(0, (track.current?.scrollWidth ?? 0) - window.innerWidth))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [steps.length])

  if (reduced) {
    return (
      <div className={cn(CONTAINER, 'py-20')}>
        <ol className="grid gap-6 md:grid-cols-2">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-3xl border border-line p-8">
              <p className="font-mono text-xs text-mute">{String(i + 1).padStart(2, '0')}</p>
              <h3 className="mt-3 font-display text-3xl"><T>{s.title}</T></h3>
              <p className="mt-3 text-mute"><T>{s.body}</T></p>
            </li>
          ))}
        </ol>
      </div>
    )
  }
  return (
    <div ref={ref} style={{ height: `${steps.length * 62 + 38}vh` }} className="relative">
      <div className="sticky top-0 flex h-dvh flex-col justify-center overflow-hidden pt-16 pb-14">
        <div className={cn(CONTAINER, 'mb-6 flex items-end justify-between gap-6 md:mb-10')}>
          <div>
            <p className="font-mono text-xs tracking-widest text-mute uppercase"><T>{eyebrow}</T></p>
            <p className="mt-3 font-display text-4xl leading-none md:text-7xl"><T>{title}</T></p>
          </div>
          <p className="hidden font-mono text-xs text-mute md:block">Keep scrolling →</p>
        </div>
        <motion.div ref={track} style={{ x }} className="flex w-max gap-5 px-5 will-change-transform md:gap-8 md:px-10">
          {steps.map((s, i) => (
            <Tilt3D key={s.title} max={3} glare={false} className="w-[82vw] shrink-0 md:w-[40vw] lg:w-[34vw]">
              <article className="flex h-[48vh] min-h-[19rem] max-h-[30rem] flex-col justify-between rounded-3xl border border-line bg-surface p-8 md:p-10">
                <p aria-hidden="true" style={OUTLINE} className="font-display font-display-thin text-[7rem] leading-none text-transparent md:text-[10rem]">
                  {String(i + 1).padStart(2, '0')}
                </p>
                <div>
                  <h3 className="font-display text-3xl leading-[1] md:text-5xl"><T>{s.title}</T></h3>
                  <p className="mt-4 max-w-sm text-pretty leading-snug text-mute"><T>{s.body}</T></p>
                  {s.detail && (
                    <ul className="mt-5 grid gap-1.5 text-sm text-paper/80">
                      {s.detail.map((d) => (
                        <li key={d} className="flex items-center gap-2.5">
                          <span aria-hidden="true" className="size-1 shrink-0 bg-signal" />
                          <T>{d}</T>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            </Tilt3D>
          ))}
        </motion.div>
        <div className={cn(CONTAINER, 'pointer-events-none absolute inset-x-0 bottom-6 md:bottom-9')}>
          <div className="h-px w-full bg-line">
            <motion.div style={{ width: bar }} className="h-px bg-paper" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Two columns set side by side: who gets what. */
export function Compare({ left, right }: { left: { title: string; items: string[] }; right: { title: string; items: string[] } }) {
  return (
    <section className={cn(CONTAINER, 'py-16 md:py-28')}>
      <div className="grid gap-px overflow-hidden rounded-3xl bg-line md:grid-cols-2">
        {[left, right].map((c, k) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '0px 0px -10% 0px' }} transition={{ duration: 0.8, delay: k * 0.12, ease: EASE_OUT }} className="bg-ink p-8 md:p-14">
            <p className="font-display text-5xl leading-none md:text-7xl"><T>{c.title}</T></p>
            <ul className="mt-10 grid">
              {c.items.map((it, i) => (
                <motion.li key={it} initial={{ opacity: 0, x: k ? 18 : -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 + i * 0.07, ease: EASE_OUT }} className="flex items-start gap-4 border-t border-line py-4 text-lg text-paper/85 transition-colors hover:text-paper">
                  <span className="mt-2 size-1.5 shrink-0 bg-signal" aria-hidden="true" />
                  <T>{it}</T>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/** Big lines of text. On a desktop the short explanation opens when you point at one. */
export function Principles({ eyebrow, title, items }: { eyebrow: string; title: string; items: { title: string; body: string }[] }) {
  return (
    <section className={cn(CONTAINER, 'py-20 md:py-32')}>
      <div className="mb-14 flex flex-col items-center text-center md:mb-20">
        <Reveal y={10}>
          <p className="font-mono text-xs tracking-widest text-mute uppercase"><T>{eyebrow}</T></p>
        </Reveal>
        <Words text={title} className="mt-6 max-w-[14ch] font-display text-5xl leading-[0.98] md:text-8xl" />
      </div>
      <ul className="mx-auto max-w-4xl border-t border-line">
        {items.map((it, i) => (
          <Reveal key={it.title} y={16} delay={i * 0.04} blur={false}>
            <li tabIndex={0} className="group border-b border-line outline-none">
              <div className="flex items-baseline gap-5 py-7 md:gap-8 md:py-9">
                <span className="font-mono text-xs text-mute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1 font-display text-3xl leading-tight transition-transform duration-500 group-hover:translate-x-2 group-focus-visible:translate-x-2 md:text-6xl"><T>{it.title}</T></span>
                <Plus aria-hidden="true" className="size-5 shrink-0 self-center text-mute transition-transform duration-500 group-hover:rotate-45 group-focus-visible:rotate-45" />
              </div>
              <div className="grid grid-rows-[1fr] transition-[grid-template-rows] duration-500 ease-out md:grid-rows-[0fr] md:group-hover:grid-rows-[1fr] md:group-focus-visible:grid-rows-[1fr]">
                <div className="overflow-hidden">
                  <p className="max-w-2xl pb-8 pl-[3.2rem] text-lg leading-snug text-mute md:pl-[4.6rem]"><T>{it.body}</T></p>
                </div>
              </div>
            </li>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

/** A vertical path that draws itself as you scroll, with the stops on alternating sides. */
export function Timeline({ eyebrow, title, items }: { eyebrow: string; title: string; items: { title: string; body: string; tag?: string }[] }) {
  const ref = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.7', 'end 0.6'] })
  const draw = useSpring(scrollYProgress, { stiffness: 90, damping: 24 })
  return (
    <section className={cn(CONTAINER, 'py-20 md:py-32')}>
      <div className="mb-16 flex flex-col items-center text-center md:mb-24">
        <Reveal y={10}>
          <p className="font-mono text-xs tracking-widest text-mute uppercase"><T>{eyebrow}</T></p>
        </Reveal>
        <Words text={title} className="mt-6 max-w-[14ch] font-display text-5xl leading-[0.98] md:text-8xl" />
      </div>
      <ol ref={ref} className="relative mx-auto max-w-5xl">
        <span aria-hidden="true" className="absolute top-0 bottom-0 left-[11px] w-px bg-line md:left-1/2" />
        <motion.span aria-hidden="true" style={{ scaleY: draw }} className="absolute top-0 bottom-0 left-[11px] w-px origin-top bg-paper md:left-1/2" />
        {items.map((it, i) => {
          const left = i % 2 === 0
          return (
            <li key={it.title} className="relative grid pb-16 pl-12 last:pb-0 md:grid-cols-2 md:pb-24 md:pl-0">
              <span aria-hidden="true" className="absolute top-2 left-0 grid size-6 place-items-center rounded-full border border-line-strong bg-ink md:left-1/2 md:-translate-x-1/2">
                <span className="size-2 rounded-full bg-signal" />
              </span>
              <motion.div initial={{ opacity: 0, x: left ? -34 : 34, y: 14 }} whileInView={{ opacity: 1, x: 0, y: 0 }} viewport={{ once: true, margin: '0px 0px -15% 0px' }} transition={{ duration: 0.9, ease: EASE_OUT }} className={cn(left ? 'md:col-start-1 md:pr-20 md:text-right' : 'md:col-start-2 md:pl-20')}>
                {it.tag && <p className="font-mono text-xs tracking-widest text-mute uppercase"><T>{it.tag}</T></p>}
                <h3 className="mt-2 font-display text-4xl leading-none md:text-6xl"><T>{it.title}</T></h3>
                <p className={cn('mt-4 max-w-md text-pretty leading-snug text-mute md:text-lg', left && 'md:ml-auto')}><T>{it.body}</T></p>
              </motion.div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
