'use client'

import { ArrowRight } from 'lucide-react'
import { type MotionValue, motion, useScroll, useTransform } from 'framer-motion'
import { type CSSProperties, type MouseEvent, type ReactNode, type RefObject, useRef } from 'react'
import { type BioBlock } from '@/lib/bio'
import { cn } from '@/lib/utils'
import { BlockView as BlockViewSlot } from './bits'
import { useBio } from './context'

/**
 * The pieces the page layouts are built from: square frames and caption boxes, speed lines, halftone and stipple, a link drawn as a numbered row, and
 * scenes that come in and go out as the page scrolls. Nothing in here is rounded.
 */
export type LinkBlock = Extract<BioBlock, { t: 'link' }>

/** How far an element has come on the page's own scroll box, 0 to 1. */
export function useScene(ref: RefObject<HTMLElement | null>, offset: [string, string] = ['start end', 'end start']) {
  const { scroller } = useBio()
  const { scrollYProgress } = useScroll({ target: ref, container: scroller, offset: offset as never })
  return scrollYProgress
}

/** A scroll value that stays at `rest` for people who asked for less motion. */
export function useStep<T extends number | string>(p: MotionValue<number>, input: number[], output: T[], rest: T): MotionValue<T extends number ? number : string> {
  const { reduced } = useBio()
  return useTransform(p, input, reduced ? input.map(() => rest) : output) as unknown as MotionValue<T extends number ? number : string>
}

/** What a link needs on its element: where it goes, and counting the press (the editor's copy and the small pictures do not leave). */
export function useLink(block: { id: string; url: string }) {
  const { track, mode } = useBio()
  const external = !block.url.startsWith('mailto:')
  return {
    href: mode === 'live' || mode === 'preview' ? block.url : undefined,
    target: external ? '_blank' : undefined,
    rel: external ? 'noopener noreferrer nofollow' : undefined,
    tabIndex: mode === 'mini' ? -1 : undefined,
    onClick: (e: MouseEvent) => {
      if (mode === 'mini') return e.preventDefault()
      track('click', block.id)
      if (mode === 'preview') e.preventDefault()
    },
  }
}

export const pad = (n: number) => String(n).padStart(2, '0')

/** A small label in a box. */
export function Boxed({ children, className, solid = false }: { children: ReactNode; className?: string; solid?: boolean }) {
  return <span className={cn('inline-flex items-center border px-2.5 py-1 text-[0.62rem] tracking-[0.18em] uppercase', solid ? 'border-[var(--bio-fg)] bg-[var(--bio-fg)] text-[var(--bio-bg)]' : 'border-[rgb(var(--bio-fg-rgb)/0.55)]', className)}>{children}</span>
}

/** The box a comic narrates in. */
export function Narr({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div style={style} className={cn('border border-[rgb(var(--bio-fg-rgb)/0.85)] bg-[var(--bio-bg)] px-3.5 py-2.5 text-[0.68rem] leading-[1.7] tracking-[0.08em] uppercase', className)}>
      {children}
    </div>
  )
}

/** An italic line with a dotted underline, like a caption under a picture. */
export function Cap({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-[0.72rem] text-[var(--bio-mute)] italic', className)}><span className="border-b border-dotted border-[rgb(var(--bio-fg-rgb)/0.5)]">{children}</span></p>
}

/** Three hairline frames round something. */
export function Frames({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      {[0, 1, 2].map((i) => (
        <span key={i} aria-hidden="true" className="pointer-events-none absolute border" style={{ inset: `${-8 - i * 8}px`, borderColor: `rgb(var(--bio-fg-rgb) / ${0.6 - i * 0.16})` }} />
      ))}
      {children}
    </div>
  )
}

/** Hair-thin rays from one point. */
export const Speed = ({ className }: { className?: string }) => <div aria-hidden="true" className={cn('bio-speed pointer-events-none', className)} />
/** Dots that fade out. `at` is where they are densest. */
export const Halftone = ({ className, at = 'bottom' }: { className?: string; at?: 'bottom' | 'top' | 'left' | 'right' }) => (
  <div aria-hidden="true" className={cn('bio-halftone pointer-events-none', className)} style={{ ['--hm' as string]: `linear-gradient(to ${at === 'bottom' ? 'top' : at === 'top' ? 'bottom' : at === 'left' ? 'right' : 'left'}, #000, transparent 72%)` }} />
)
/** Fine speckle for the edge of a panel. */
export const Stipple = ({ className }: { className?: string }) => <div aria-hidden="true" className={cn('bio-stipple pointer-events-none', className)} />

/** A scene that rises out of the dark as it arrives and sinks back as the next one comes. */
export function SceneBox({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const p = useScene(ref)
  const scale = useStep(p, [0, 0.2, 0.8, 1], [0.94, 1, 1, 0.96], 1)
  const opacity = useStep(p, [0, 0.18, 0.8, 1], [0, 1, 1, 0.2], 1)
  const y = useStep(p, [0, 0.2, 1], ['6cqh', '0cqh', '-3cqh'], '0cqh')
  return (
    <motion.div ref={ref} style={{ scale, opacity, y }} className={cn('will-change-transform', className)}>
      {children}
    </motion.div>
  )
}

export const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u.replace(/^mailto:/, '')
  }
}

/** The title bar of a window: three small square lights and a label, in the page's own ink. */
export function WinBar({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex h-6 items-center gap-1.5 bg-[var(--bio-accent)] px-2.5 text-[var(--bio-on-accent)]', className)}>
      {[0, 1, 2].map((i) => (
        <span key={i} aria-hidden="true" className="size-[6px] bg-[var(--bio-bg)] opacity-70" />
      ))}
      <span className="ml-1.5 min-w-0 truncate text-[0.58rem] tracking-[0.14em] uppercase">{children}</span>
    </div>
  )
}

/** A window: a title bar, a body and a hard square shadow. */
export const winClass = 'border border-[rgb(var(--bio-accent-rgb)/0.8)] bg-[var(--bio-bg)] shadow-[5px_5px_0_rgb(var(--bio-accent-rgb)/0.85)]'
export const winHover = 'transition-[translate,box-shadow] duration-300 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_rgb(var(--bio-accent-rgb)/0.85)]'

/** A link as a window: numbered, with the site in the title bar. It slides in from a side when it comes into view. */
export function PanelRow({ block, index, className }: { block: LinkBlock; index: number; className?: string }) {
  const ref = useRef<HTMLAnchorElement>(null)
  const p = useScene(ref, ['start 99%', 'start 72%'])
  const x = useStep(p, [0, 1], [index % 2 ? 40 : -40, 0], 0)
  const o = useStep(p, [0, 1], [0, 1], 1)
  const lp = useLink(block)
  return (
    <motion.a ref={ref} {...lp} data-link style={{ x, opacity: o }} className={cn('group block', winClass, winHover, className)}>
      <WinBar>
        {pad(index + 1)} · {hostOf(block.url)}
      </WinBar>
      <span className="flex items-center gap-4 px-4 py-4">
        <span className="min-w-0 flex-1">
          <span className="bt block text-[clamp(1.2rem,5.2vw,2rem)] [overflow-wrap:anywhere]">{block.title}</span>
          {block.note && <span className="mt-1.5 block text-[0.74rem] italic opacity-60">{block.note}</span>}
        </span>
        <ArrowRight aria-hidden="true" className="size-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
      </span>
    </motion.a>
  )
}

/** The links and the rest, one after another, numbering only the links. */
export function Rows({ items, className }: { items: BioBlock[]; className?: string }) {
  let n = -1
  return (
    <div className={cn('grid gap-6', className)}>
      {items.map((b, i) => {
        if (b.t !== 'link') return <BlockViewSlot key={b.id} block={b} index={i} />
        n++
        return <PanelRow key={b.id} block={b} index={n} />
      })}
    </div>
  )
}

/** A hairline that draws itself down a stretch of the page as you scroll through it. */
export function DrawLine({ p, className }: { p: MotionValue<number>; className?: string }) {
  const s = useStep(p, [0, 1], [0, 1], 1)
  return <motion.span aria-hidden="true" style={{ scaleY: s }} className={cn('block w-px origin-top bg-[var(--bio-accent)]', className)} />
}
