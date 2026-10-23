'use client'

import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
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
 * One hairline that joins two real things: it leaves from under the hero's button (or, with no button, its sentence), turns a corner, runs along and
 * turns down again into an arrow that points at the first heading after the hero. The two ends are measured from the page itself (the hero's
 * `data-path-from` block and the first h2 or h3 that follows it), so it always starts at something and ends at something, whatever the page. It is
 * measured again when the window changes size and once the entrance animations have settled. Wide screens only; it is only a drawing.
 */
export function HeroPath() {
  const host = useRef<HTMLDivElement>(null)
  const [geo, setGeo] = useState<{ w: number; h: number; d: string; arrow: string; dot: [number, number] } | null>(null)

  useEffect(() => {
    const root = host.current?.parentElement
    if (!root) return
    let raf = 0
    const measure = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        if (!window.matchMedia('(min-width: 768px)').matches) return setGeo(null)
        const header = root.closest('header')
        const main = root.closest('main')
        const from = root.querySelector<HTMLElement>('[data-path-from]')
        if (!header || !main || !from) return setGeo(null)
        const target = [...main.querySelectorAll<HTMLElement>('h2, h3')].find((h) => header.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING)
        if (!target) return setGeo(null)
        const rr = root.getBoundingClientRect()
        const fr = from.getBoundingClientRect()
        const tr = target.getBoundingClientRect()
        const sx = fr.left - rr.left + 28
        const sy = fr.bottom - rr.top + 12
        const ex = tr.left - rr.left + 16
        // end above the whole block the heading sits in (a small label may sit over it), not on the label
        const blockTop = target.parentElement?.getBoundingClientRect().top ?? tr.top
        const ey = (tr.top - blockTop < 90 ? blockTop : tr.top) - rr.top - 20
        if (ey - sy < 90) return setGeo(null)
        const y1 = sy + Math.min(72, Math.max(46, (ey - sy) * 0.28)) // the height of the run along
        const dx = ex - sx
        const r = Math.min(28, Math.abs(dx) / 2 - 1)
        let d: string
        if (r < 6) d = `M${sx} ${sy}V${ey}`
        else if (dx < 0) d = `M${sx} ${sy}V${y1 - r}A${r} ${r} 0 0 1 ${sx - r} ${y1}H${ex + r}A${r} ${r} 0 0 0 ${ex} ${y1 + r}V${ey}`
        else d = `M${sx} ${sy}V${y1 - r}A${r} ${r} 0 0 0 ${sx + r} ${y1}H${ex - r}A${r} ${r} 0 0 1 ${ex} ${y1 + r}V${ey}`
        const ax = r < 6 ? sx : ex
        setGeo({ w: Math.ceil(rr.width), h: Math.ceil(ey + 12), d, arrow: `M${ax - 8} ${ey - 6}L${ax} ${ey + 2}L${ax + 8} ${ey - 6}`, dot: [sx, sy] })
      })
    }
    measure()
    const late = window.setTimeout(measure, 1600) // after the entrance animations have settled
    window.addEventListener('resize', measure)
    window.addEventListener('load', measure)
    void document.fonts?.ready.then(measure)
    const ro = new ResizeObserver(measure)
    ro.observe(document.body)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(late)
      window.removeEventListener('resize', measure)
      window.removeEventListener('load', measure)
      ro.disconnect()
    }
  }, [])

  return (
    <div ref={host} aria-hidden="true" className="pointer-events-none absolute inset-0 hidden md:block">
      {geo && (
        <svg width={geo.w} height={geo.h} className="hero-path absolute top-0 left-0 overflow-visible text-paper/65" fill="none">
          <circle cx={geo.dot[0]} cy={geo.dot[1]} r="3.5" fill="currentColor" />
          <path d={geo.d} stroke="currentColor" strokeWidth="1" />
          <path d={geo.arrow} stroke="currentColor" strokeWidth="1" />
        </svg>
      )}
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
