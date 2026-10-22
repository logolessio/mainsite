'use client'

import { useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useSignupSwap } from '@/components/motion/cta'
import { Reveal } from '@/components/motion/reveal'
import { Words } from '@/components/motion/words'
import { T } from '@/components/shell/copy-provider'
import { TransitionLink } from '@/components/shell/transition-link'
import { CONTAINER } from '@/lib/layout'
import { cn } from '@/lib/utils'

/*
 * The Anubis page's own pieces, for the text pages: two round badges beside the title, one hairline that leaves the hero and turns a corner into an arrow,
 * an arched frame round a picture, a small contents list with a red mark on the part you are reading, and a box closed in by red stipple.
 */

export type HeroBadgeProps = {
  /** the solid badge: two short lines ("Creators", "Start earning") */
  solid?: { href: string; top: string; bottom: string }
  /** the outline badge: one word */
  outline?: { href: string; label: string }
}

/** Two round badges at the right of the title, set at different heights. Wide screens only. */
export function HeroBadges({ solid, outline }: HeroBadgeProps) {
  const swap = useSignupSwap(solid?.href ?? '/')
  const solidProps = solid ? (swap.swapped ? { href: swap.href, top: 'Your', bottom: 'Dashboard' } : solid) : null
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] xl:block">
      {solidProps && (
        <TransitionLink href={solidProps.href} className="hero-badge pointer-events-auto absolute top-2 right-[26%] grid size-[132px] place-items-center rounded-full bg-paper text-center font-mono text-[12px] leading-[1.7] tracking-[0.1em] text-ink uppercase transition-transform duration-500 hover:scale-[1.05]">
          <span>
            <T>{solidProps.top}</T>
            <br />
            <span aria-hidden="true">-</span>
            <br />
            <T>{solidProps.bottom}</T>
          </span>
        </TransitionLink>
      )}
      {outline && (
        <TransitionLink href={outline.href} className="hero-badge hero-badge-b pointer-events-auto absolute top-[118px] right-0 grid size-[116px] place-items-center rounded-full border border-paper/70 text-center font-mono text-[13px] tracking-[0.12em] text-paper uppercase transition-[transform,background-color,color] duration-500 hover:scale-[1.05] hover:bg-paper hover:text-ink">
          <T>{outline.label}</T>
        </TransitionLink>
      )}
    </div>
  )
}

/**
 * One hairline under the hero: it leaves the left edge, turns a corner, runs along and turns down again into an arrow that points at the first section's
 * right-hand column. Every length is fixed, so the corners are true circles. Wide screens only; it is only a drawing.
 */
export function HeroPath() {
  const line = 'border-paper/65'
  return (
    <div aria-hidden="true" className="hero-path pointer-events-none absolute top-full left-0 hidden h-[104px] w-full md:block">
      <span className="absolute top-[-3px] left-[-3px] size-[7px] rounded-full bg-paper/75" />
      <span className={`absolute top-0 left-0 h-[24px] w-px border-l ${line}`} />
      <span className={`absolute top-[24px] left-0 size-7 rounded-bl-[28px] border-b border-l ${line}`} />
      <span className={`absolute top-[51px] left-7 h-px w-[calc(50%-36px)] border-b ${line}`} />
      <span className={`absolute top-[51px] left-[calc(50%-8px)] size-7 rounded-tr-[28px] border-t border-r ${line}`} />
      <span className={`absolute top-[79px] left-[calc(50%+19px)] h-[12px] w-px border-l ${line}`} />
      <svg className="absolute top-[90px] left-[calc(50%+11px)] text-paper/65" width="17" height="9" viewBox="0 0 17 9" fill="none">
        <path d="M1 1l7.5 7L16 1" stroke="currentColor" strokeWidth="1" />
      </svg>
    </div>
  )
}

export type ArchItem = { src: string; label?: string; href?: string }

/**
 * A picture framed by three hairline arches, one inside the other. Several pictures give way to each other every few seconds (the first, still, for reduced
 * motion). Under it, in the small type the Anubis page uses for ":film credits:", what is on show, which opens when it has a link.
 */
export function ArchFrame({ items, caption, className }: { items: ArchItem[]; caption?: string; className?: string }) {
  const reduced = useReducedMotion()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (reduced || items.length < 2) return
    const t = window.setInterval(() => setI((n) => (n + 1) % items.length), 4800)
    return () => window.clearInterval(t)
  }, [reduced, items.length])
  if (items.length === 0) return null
  const now = items[i % items.length]
  const text = now.label ?? caption
  return (
    <figure className={cn('relative mx-auto w-full max-w-[340px]', className)}>
      <div className="relative aspect-[340/290]">
        <span aria-hidden="true" className="absolute inset-0 rounded-t-[999px] border border-paper/35" />
        <span aria-hidden="true" className="absolute inset-[6px] rounded-t-[999px] border border-paper/22" />
        <span aria-hidden="true" className="absolute inset-[12px] rounded-t-[999px] border border-paper/12" />
        <div className="absolute inset-[18px] overflow-hidden rounded-t-[999px] bg-black">
          {items.map((c, n) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={`${n}:${c.src}`} src={c.src} alt="" aria-hidden={n !== i} loading="lazy" className={cn('absolute inset-0 size-full object-cover transition-opacity duration-[1400ms] ease-out', n === i ? 'hero-zoom opacity-100' : 'opacity-0')} />
          ))}
          <span aria-hidden="true" className="absolute inset-0 shadow-[inset_0_0_46px_rgb(0_0_0/0.55)]" />
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent" />
        </div>
      </div>
      {text && (
        <figcaption className="mt-4 text-center font-mono text-[11px] tracking-[0.04em] text-paper/70">
          :
          {now.href ? (
            <TransitionLink href={now.href} className="underline decoration-dotted underline-offset-4 transition-colors hover:text-paper">
              {text}
            </TransitionLink>
          ) : (
            <span className="underline decoration-dotted underline-offset-4">{text}</span>
          )}
          :
        </figcaption>
      )}
    </figure>
  )
}

/** A section with words on the left and an arched picture on the right. */
export function ArchSection({ id, title, children, items, caption }: { id?: string; title: string; children: React.ReactNode; items: ArchItem[]; caption?: string }) {
  return (
    <section id={id} className={cn(CONTAINER, 'border-t border-line py-20 md:py-32')}>
      <div className="grid items-center gap-14 md:grid-cols-12 md:gap-10">
        <div className="md:col-span-6">
          <Words as="h2" align="left" text={title} className="max-w-[14ch] font-display text-4xl leading-[0.98] tracking-[-0.04em] md:text-[4.2rem]" />
          <Reveal delay={0.1} className="mt-8 max-w-xl text-pretty text-lg leading-relaxed text-paper/60 md:text-xl">
            {children}
          </Reveal>
        </div>
        <Reveal delay={0.15} className="md:col-span-5 md:col-start-8">
          <ArchFrame items={items} caption={caption} />
        </Reveal>
      </div>
    </section>
  )
}

/** A short list of the parts of a long page, fixed at the right edge of very wide screens, with a red mark beside the part being read (the Anubis page has the same). */
export function PageToc({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? '')
  const key = items.map((x) => x.id).join(',')
  useEffect(() => {
    const els = key.split(',').map((id) => document.getElementById(id)).filter((e): e is HTMLElement => Boolean(e))
    if (!els.length) return
    const seen = new Set<string>()
    const order = key.split(',')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) (e.isIntersecting ? seen.add(e.target.id) : seen.delete(e.target.id))
        const first = order.find((id) => seen.has(id))
        if (first) setActive(first)
      },
      { rootMargin: '-25% 0px -60% 0px' },
    )
    els.forEach((e) => io.observe(e))
    return () => io.disconnect()
  }, [key])
  return (
    <nav aria-label="On this page" className="fixed top-1/2 right-7 z-30 hidden -translate-y-1/2 min-[1680px]:block">
      <ul className="grid gap-3 font-mono text-[12px] leading-none">
        {items.map((it) => (
          <li key={it.id}>
            <a href={`#${it.id}`} aria-current={active === it.id ? 'true' : undefined} className={cn('relative block py-0.5 pl-3 transition-colors duration-300', active === it.id ? 'text-paper' : 'text-paper/40 hover:text-paper/80')}>
              {active === it.id && <span aria-hidden="true" className="absolute top-0 left-0 h-full w-px bg-signal" />}
              <T>{it.label}</T>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
