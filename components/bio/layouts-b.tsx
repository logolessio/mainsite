'use client'

import { ArrowRight } from 'lucide-react'
import { motion, useAnimationFrame, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion'
import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { type BioBlock, linkLabel } from '@/lib/bio'
import { PROFILE_FONT_CLASS } from '@/lib/profile-fonts'
import { cn } from '@/lib/utils'
import { Avatar, Bio, BlockIcon, BlockView, Footer, Name, Socials } from './bits'
import { Cap, DrawLine, Frames, hostOf, type LinkBlock, Narr, pad, Stipple, useLink, useScene, useStep, WinBar, winClass, winHover } from './comic'
import { Depth, useBio } from './context'

const split = (items: BioBlock[]) => ({ links: items.filter((b) => b.t === 'link') as LinkBlock[], rest: items.filter((b) => b.t !== 'link') })

/* ------------------------------------------------------------------ 6. Orbit */

/** A link sitting on a square ring. The ring turns, the box stays upright. */
function OrbitBox({ block, x, y, back, onHover }: { block: LinkBlock; x: number; y: number; back: ReturnType<typeof useTransform<number, number>>; onHover: (b: LinkBlock | null) => void }) {
  const lp = useLink(block)
  return (
    <motion.a
      {...lp}
      data-link
      aria-label={block.title}
      onMouseEnter={() => onHover(block)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(block)}
      onBlur={() => onHover(null)}
      className="bs absolute !size-[3rem]"
      style={{ left: `${x}%`, top: `${y}%`, x: '-50%', y: '-50%', rotate: back }}
    >
      <BlockIcon block={block} className="size-[1.25rem]" />
    </motion.a>
  )
}

function Ring({ size, rot, boxes, onHover }: { size: number; rot: ReturnType<typeof useMotionValue<number>>; boxes: { b: LinkBlock; a: number }[]; onHover: (b: LinkBlock | null) => void }) {
  const back = useTransform(rot, (v) => -v)
  return (
    <motion.div aria-hidden={boxes.length === 0 ? 'true' : undefined} className="absolute top-1/2 left-1/2 border border-[rgb(var(--bio-fg-rgb)/0.45)]" style={{ width: `${size}%`, height: `${size}%`, x: '-50%', y: '-50%', rotate: rot }}>
      {boxes.map(({ b, a }) => {
        // a point on the square's edge for this angle
        const t = Math.tan(a)
        const cos = Math.cos(a)
        const sin = Math.sin(a)
        const px = Math.abs(t) <= 1 ? (cos >= 0 ? 100 : 0) : 50 + 50 * (cos / Math.abs(sin))
        const py = Math.abs(t) <= 1 ? 50 + 50 * (sin / Math.abs(cos)) : sin >= 0 ? 100 : 0
        return <OrbitBox key={b.id} block={b} x={px} y={py} back={back} onHover={onHover} />
      })}
    </motion.div>
  )
}

/** Links on square rings round the picture. The rings turn slowly, and faster as you scroll. */
export function Orbit() {
  const { items, sy, reduced } = useBio()
  const { links, rest } = split(items)
  const [label, setLabel] = useState<LinkBlock | null>(null)
  const time = useMotionValue(0)
  useAnimationFrame((t) => {
    if (!reduced) time.set(t / 1000)
  })
  const rot1 = useTransform([time, sy] as never, ([t, y]: number[]) => t * 5 + y * 0.05)
  const rot2 = useTransform([time, sy] as never, ([t, y]: number[]) => -t * 3.5 - y * 0.04)
  const rot3 = useTransform([time, sy] as never, ([t, y]: number[]) => t * 2.2 + y * 0.03)
  const rings = [
    { size: 54, cap: 4, rot: rot1 },
    { size: 78, cap: 7, rot: rot2 },
    { size: 100, cap: 99, rot: rot3 },
  ]
  let at = 0
  const placed = rings.map((rg, ri) => {
    const batch = links.slice(at, at + rg.cap)
    at += batch.length
    return batch.map((b, i) => ({ b, a: (i / batch.length) * Math.PI * 2 + ri * 0.55 + Math.PI / 4 }))
  })
  return (
    <main className="mx-auto min-h-full w-full max-w-[44rem] px-4 text-center">
      <section className="flex min-h-[100cqh] flex-col items-center justify-center py-8">
        <div className="relative aspect-square w-[min(88cqw,60cqh)]">
          {rings.map((rg, i) => (
            <Ring key={i} size={rg.size} rot={rg.rot} boxes={placed[i]} onHover={setLabel} />
          ))}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Depth d={0.04} pointer={6}>
              <Frames>
                <Avatar size={96} />
              </Frames>
            </Depth>
          </div>
          <div aria-live="polite" className="pointer-events-none absolute inset-x-0 -bottom-9 text-[0.74rem] tracking-[0.12em] text-[var(--bio-mute)] uppercase">
            {label ? label.title : ''}
          </div>
        </div>
        <Name className="mt-14 text-[clamp(2.4rem,9cqw,4.2rem)]" />
        <Bio center className="mt-3" />
        <Socials className="mt-5" />
      </section>
      {(links.length > 0 || rest.length > 0) && (
        <div className="flex flex-col gap-3 pb-4">
          {items.map((b, i) => (
            <BlockView key={b.id} block={b} index={i} />
          ))}
        </div>
      )}
      <Footer />
    </main>
  )
}

/* ------------------------------------------------------------------ 7. Index */

/** A list. The row under the pointer fills with ink and the others fall back; a small window follows the pointer. */
export function Index() {
  const { items, mode } = useBio()
  const [on, setOn] = useState<string | null>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 28 })
  const sY = useSpring(y, { stiffness: 260, damping: 28 })
  const list = useRef<HTMLDivElement>(null)
  const current = items.find((b) => b.id === on && b.t === 'link') as LinkBlock | undefined
  const move = (e: React.PointerEvent) => {
    const r = list.current?.getBoundingClientRect()
    if (!r) return
    x.set(e.clientX - r.left + 24)
    y.set(e.clientY - r.top + 18)
  }
  let n = 0
  return (
    <main className="mx-auto min-h-full w-full max-w-[64rem] px-6 pt-[9cqh] pb-6 md:px-10">
      <header className="flex items-start justify-between gap-6">
        <Frames>
          <Avatar size={52} />
        </Frames>
        <Socials justify="start" />
      </header>
      <Depth d={0.08} className="mt-[7cqh]">
        <Name className="text-[clamp(3.4rem,13cqw,10rem)] [overflow-wrap:anywhere]" />
      </Depth>
      <Bio className="mt-6 max-w-[30rem]" />
      <div ref={list} onPointerMove={move} onPointerLeave={() => setOn(null)} className="relative mt-[8cqh] border-t border-[rgb(var(--bio-fg-rgb)/0.6)]">
        {items.map((b, i) => {
          if (b.t !== 'link') {
            return (
              <div key={b.id} className="py-4">
                <BlockView block={b} index={i} />
              </div>
            )
          }
          n++
          return <IndexRow key={b.id} block={b} n={n} dim={on !== null && on !== b.id} onEnter={() => setOn(b.id)} />
        })}
        {current && mode !== 'mini' && (
          <motion.div aria-hidden="true" className={cn('pointer-events-none absolute top-0 left-0 z-10 hidden w-[15rem] md:block', winClass)} style={{ x: sx, y: sY }}>
            <WinBar>{hostOf(current.url)}</WinBar>
            <div className="p-4">
              <BlockIcon block={current} className="size-6" />
              <p className="bt mt-5 text-[1.2rem]">{current.title}</p>
              {current.note && <p className="mt-2 text-[0.74rem] italic opacity-60">{current.note}</p>}
            </div>
          </motion.div>
        )}
      </div>
      <Footer />
    </main>
  )
}

function IndexRow({ block, n, dim, onEnter }: { block: LinkBlock; n: number; dim: boolean; onEnter: () => void }) {
  const lp = useLink(block)
  return (
    <a
      {...lp}
      data-in
      data-link
      onMouseEnter={onEnter}
      style={{ '--i': n, opacity: dim ? 0.3 : 1, transition: 'opacity .45s' } as CSSProperties}
      className="group grid grid-cols-[2.2rem_1fr_auto] items-baseline gap-x-4 border-b border-[rgb(var(--bio-fg-rgb)/0.6)] py-5 md:grid-cols-[3.4rem_1fr_auto] md:py-6"
    >
      <span className="text-[0.66rem] tabular-nums text-[var(--bio-mute)]">{pad(n)}</span>
      <span className="bt text-[clamp(1.5rem,4.6cqw,3rem)] transition-transform duration-500 group-hover:translate-x-2">{linkLabel(block)}</span>
      <span className="flex items-center gap-3">
        <span className="hidden text-[0.78rem] text-[var(--bio-mute)] italic sm:inline">{block.note || hostOf(block.url)}</span>
        <ArrowRight className="size-5 opacity-50 transition-transform duration-500 group-hover:translate-x-1 group-hover:opacity-100" strokeWidth={1.4} />
      </span>
    </a>
  )
}

/* ------------------------------------------------------------------ 8. Terminal */

export function Terminal() {
  const { items, data, socials, mode, track } = useBio()
  const { links, rest } = split(items)
  const mono = PROFILE_FONT_CLASS.anubis
  const line = 'flex flex-wrap items-baseline gap-x-3'
  return (
    <main className={cn('mx-auto min-h-full w-full max-w-[48rem] px-4 pt-[10cqh] pb-6', mono)}>
      <Depth d={0.05}>
        <div data-in className={winClass}>
          <WinBar>
            {data.handle} · zsh · {pad(links.length)} links
          </WinBar>
          <div className="space-y-5 p-5 text-[0.92rem] leading-relaxed md:p-7">
            <div style={{ '--i': 1 } as CSSProperties} data-in>
              <p className="bio-mute">$ whoami</p>
              <p className="bt text-[1.6rem]">{data.name}</p>
            </div>
            {data.bio && (
              <div style={{ '--i': 2 } as CSSProperties} data-in>
                <p className="bio-mute">$ cat about.txt</p>
                <p className="whitespace-pre-line">{data.bio}</p>
              </div>
            )}
            {socials.length > 0 && (
              <div style={{ '--i': 3 } as CSSProperties} data-in>
                <p className="bio-mute">$ open --socials</p>
                <p className={line}>
                  {socials.map((s) => (
                    <a key={s.id} href={mode === 'mini' ? undefined : s.url} target="_blank" rel="noopener noreferrer nofollow" onClick={() => track('click', s.id)} className="underline decoration-[var(--bio-line)] underline-offset-4 hover:decoration-[var(--bio-fg)]">
                      {s.platform}
                    </a>
                  ))}
                </p>
              </div>
            )}
            <div style={{ '--i': 4 } as CSSProperties} data-in>
              <p className="bio-mute">$ ls ./links</p>
              <ul className="mt-1 space-y-1">
                {links.map((l, i) => (
                  <TermLink key={l.id} block={l} i={i} />
                ))}
              </ul>
            </div>
            <p data-in style={{ '--i': 5 } as CSSProperties}>
              <span className="bio-mute">$ </span>
              <span aria-hidden="true" style={{ animation: 'bio-blink 1.05s steps(1) infinite' }}>█</span>
            </p>
          </div>
        </div>
      </Depth>
      {rest.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          {rest.map((b, i) => (
            <BlockView key={b.id} block={b} index={i} />
          ))}
        </div>
      )}
      <Footer />
    </main>
  )
}

function TermLink({ block, i }: { block: LinkBlock; i: number }) {
  const lp = useLink(block)
  return (
    <li>
      <a {...lp} data-link className="group flex items-baseline gap-3 py-1">
        <span className="bio-mute">[{i}]</span>
        <span className="underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-[var(--bio-fg)]">{linkLabel(block)}</span>
        <span className="bio-mute hidden truncate text-[0.8rem] sm:inline">{hostOf(block.url)}</span>
        <span className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">→</span>
      </a>
    </li>
  )
}

/* ------------------------------------------------------------------ 9. Chapters */

function Chapter({ block, index, total }: { block: LinkBlock; index: number; total: number }) {
  const ref = useRef<HTMLElement>(null)
  const p = useScene(ref)
  const right = index % 2 === 1
  const enter = useStep(p, [0, 0.4, 0.62, 1], [right ? 42 : -42, 0, 0, right ? -18 : 18], 0)
  const fade = useStep(p, [0, 0.3, 0.7, 1], [0, 1, 1, 0], 1)
  const numY = useStep(p, [0, 1], ['16cqh', '-16cqh'], '0cqh')
  const lp = useLink(block)
  return (
    <section ref={ref} data-chapter className="relative flex h-[100cqh] min-h-[26rem] snap-start items-center overflow-hidden px-6 md:px-14">
      <motion.span aria-hidden="true" style={{ y: numY }} className={cn('bn bn-outline pointer-events-none absolute top-1/2 -translate-y-1/2 text-[clamp(10rem,46cqw,34rem)] leading-none select-none', right ? 'left-4' : 'right-4')}>
        {index + 1}
      </motion.span>
      <motion.div style={{ opacity: fade }} className={cn('relative z-10 flex w-full flex-col gap-6', right ? 'items-end text-right' : 'items-start text-left')}>
        <span className="flex items-center gap-3">
          <BlockIcon block={block} className="size-7" />
          <span className="border border-[rgb(var(--bio-fg-rgb)/0.6)] px-2.5 py-1 text-[0.62rem] tracking-[0.18em] uppercase">
            {pad(index + 1)} / {pad(total)}
          </span>
        </span>
        <motion.a {...lp} data-link style={{ x: `${enter}cqw` }} className="group block max-w-[14ch] [overflow-wrap:anywhere]">
          <span className="bt block text-[clamp(3rem,12cqw,9.5rem)]">
            {linkLabel(block)}
            <ArrowRight className="ml-2 inline size-[0.45em] -translate-y-[0.1em] opacity-50 transition-transform duration-500 group-hover:translate-x-2 group-hover:opacity-100" strokeWidth={1.3} />
          </span>
        </motion.a>
        {block.note && <Narr className="max-w-[24rem] normal-case">{block.note}</Narr>}
        <span className="flex items-center gap-3 text-[0.62rem] tracking-[0.2em] text-[var(--bio-mute)] uppercase">
          <span className="block h-px w-8 bg-[var(--bio-fg)]" /> {hostOf(block.url)}
        </span>
      </motion.div>
    </section>
  )
}

/** One screen per link, with a very large title that slides in and a number behind it that moves against the scroll. */
export function Chapters() {
  const { items } = useBio()
  const { links, rest } = split(items)
  const head = useRef<HTMLElement>(null)
  const p = useScene(head, ['start start', 'end start'])
  return (
    <main data-layout="chapters" className="min-h-full w-full">
      <section ref={head} className="relative flex h-[100cqh] min-h-[28rem] snap-start flex-col items-center justify-center px-6 text-center">
        <Depth d={0.22} pointer={8}>
          <Frames>
            <Avatar size={112} />
          </Frames>
        </Depth>
        <Depth d={0.14} className="mt-9">
          <Name className="text-[clamp(3rem,12cqw,8rem)]" />
        </Depth>
        <Depth d={0.08} className="mt-4">
          <Bio center />
        </Depth>
        <Socials className="mt-6" />
        <span aria-hidden="true" className="absolute bottom-6 flex flex-col items-center gap-2 text-[0.6rem] tracking-[0.22em] text-[var(--bio-mute)] uppercase">
          scroll
          <DrawLine p={p} className="h-8" />
        </span>
      </section>
      {links.map((l, i) => (
        <Chapter key={l.id} block={l} index={i} total={links.length} />
      ))}
      {rest.length > 0 && (
        <section className="mx-auto flex w-full max-w-[36rem] flex-col gap-3 px-6 py-16">
          {rest.map((b, i) => (
            <BlockView key={b.id} block={b} index={i} />
          ))}
        </section>
      )}
      <Footer />
    </main>
  )
}

/* ------------------------------------------------------------------ 10. Reel */

function Frame({ block, index }: { block: LinkBlock; index: number }) {
  const lp = useLink(block)
  return (
    <a {...lp} data-link className={cn('group relative flex h-[min(58cqh,28rem)] w-[min(76cqw,23rem)] shrink-0 flex-col', winClass, winHover)}>
      <WinBar>
        frame {pad(index + 1)} · {hostOf(block.url)}
      </WinBar>
      <span className="flex flex-1 flex-col justify-between p-6">
        <span className="flex items-start justify-between">
          <BlockIcon block={block} className="size-9" />
          <ArrowRight className="size-5 opacity-50 transition-transform duration-500 group-hover:translate-x-1" strokeWidth={1.4} />
        </span>
        <span>
          <span className="bt block text-[clamp(1.9rem,6cqw,2.8rem)]">{linkLabel(block)}</span>
          {block.note && <span className="mt-2 block text-[0.8rem] italic opacity-65">{block.note}</span>}
        </span>
      </span>
    </a>
  )
}

/** A strip of windows that runs sideways as you scroll down. */
export function Reel() {
  const { items, scroller, reduced } = useBio()
  const { links, rest } = split(items)
  const wrap = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [range, setRange] = useState(0)
  const { scrollYProgress } = useScroll({ target: wrap, container: scroller, offset: ['start start', 'end end'] })
  const p = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 })
  const x = useTransform(p, [0, 1], [0, -range])
  const bar = useTransform(p, [0, 1], ['0%', '100%'])
  useEffect(() => {
    const el = track.current
    if (!el) return
    const measure = () => setRange(Math.max(0, el.scrollWidth - (el.parentElement?.clientWidth ?? 0)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [links.length])
  return (
    <main className="min-h-full w-full">
      <div ref={wrap} style={{ height: `calc(100cqh + ${reduced ? 0 : range}px)` }}>
        <div className="sticky top-0 flex h-[100cqh] flex-col justify-center overflow-hidden">
          <Stipple className="absolute inset-x-0 top-[7%] h-3 opacity-40" />
          <Stipple className="absolute inset-x-0 bottom-[7%] h-3 opacity-40" />
          <motion.div ref={track} className="flex w-max items-center gap-8 px-[8cqw]" style={{ x: reduced ? 0 : x }}>
            <div className="flex w-[min(80cqw,26rem)] shrink-0 flex-col justify-center pr-6">
              <Frames className="mb-10 w-fit">
                <Avatar size={92} />
              </Frames>
              <Name className="text-[clamp(3rem,9cqw,6rem)] [overflow-wrap:anywhere]" />
              <Bio className="mt-4" />
              <Socials justify="start" className="mt-6" />
              <Cap className="mt-6">{pad(links.length)} frames, scroll to run them</Cap>
            </div>
            {links.map((l, i) => (
              <Frame key={l.id} block={l} index={i} />
            ))}
            <div className="w-[12cqw] shrink-0" />
          </motion.div>
          <div aria-hidden="true" className="absolute inset-x-[8cqw] bottom-[3%] h-px bg-[var(--bio-line)]">
            <motion.span className="absolute inset-y-0 left-0 bg-[var(--bio-fg)]" style={{ width: bar }} />
          </div>
        </div>
      </div>
      {rest.length > 0 && (
        <div className="mx-auto flex w-full max-w-[36rem] flex-col gap-3 px-6 pb-10">
          {rest.map((b, i) => (
            <BlockView key={b.id} block={b} index={i} />
          ))}
        </div>
      )}
      <Footer />
    </main>
  )
}
