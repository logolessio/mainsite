'use client'

import { ArrowUpRight } from 'lucide-react'
import { motion, useAnimationFrame, useMotionTemplate, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion'
import { type CSSProperties, useEffect, useRef, useState } from 'react'
import { type BioBlock } from '@/lib/bio'
import { PROFILE_FONT_CLASS } from '@/lib/profile-fonts'
import { cn } from '@/lib/utils'
import { Avatar, Bio, BlockIcon, BlockView, Footer, fontClass, Name, Socials } from './bits'
import { Depth, useBio } from './context'

type Link = Extract<BioBlock, { t: 'link' }>
const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return u.replace(/^mailto:/, '')
  }
}
function split(items: BioBlock[]) {
  return { links: items.filter((b) => b.t === 'link') as Link[], rest: items.filter((b) => b.t !== 'link') }
}

/* ------------------------------------------------------------------ 6. Orbit */

function OrbitDot({ block, angle, radius, rot, onHover }: { block: Link; angle: number; radius: number; rot: ReturnType<typeof useMotionValue<number>>; onHover: (b: Link | null) => void }) {
  const { track, mode } = useBio()
  const a = useTransform(rot, (v) => v + angle)
  const back = useTransform(a, (v) => -v)
  const t = useMotionTemplate`translate(-50%, -50%) rotate(${a}deg) translateY(${-radius}px) rotate(${back}deg)`
  return (
    <motion.a
      data-link
      href={mode === 'mini' ? undefined : block.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      aria-label={block.title}
      onMouseEnter={() => onHover(block)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(block)}
      onBlur={() => onHover(null)}
      onClick={() => track('click', block.id)}
      className="bs absolute top-1/2 left-1/2 !size-[3.1rem]"
      style={{ transform: t as unknown as string }}
    >
      <BlockIcon block={block} className="size-[1.3rem]" />
    </motion.a>
  )
}

/** Links on rings round the picture. The rings turn slowly, and faster as you scroll. */
export function Orbit() {
  const { items, sy, reduced, cfg } = useBio()
  const { links, rest } = split(items)
  const box = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(520)
  const [label, setLabel] = useState<Link | null>(null)
  const time = useMotionValue(0)
  useAnimationFrame((t) => {
    if (!reduced) time.set(t / 1000)
  })
  const rot1 = useTransform([time, sy] as never, ([t, y]: number[]) => t * 5 + y * 0.05)
  const rot2 = useTransform([time, sy] as never, ([t, y]: number[]) => -t * 3.5 - y * 0.04)
  const rot3 = useTransform([time, sy] as never, ([t, y]: number[]) => t * 2.2 + y * 0.03)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize(el.clientWidth))
    ro.observe(el)
    setSize(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const rings = [
    { r: 0.27, cap: 5, rot: rot1 },
    { r: 0.38, cap: 8, rot: rot2 },
    { r: 0.48, cap: 99, rot: rot3 },
  ]
  const placed: { b: Link; ring: number; angle: number; of: number }[] = []
  let at = 0
  rings.forEach((rg, ri) => {
    const batch = links.slice(at, at + rg.cap)
    batch.forEach((b, i) => placed.push({ b, ring: ri, angle: (i / batch.length) * 360 + ri * 33, of: batch.length }))
    at += batch.length
  })
  return (
    <main className="mx-auto min-h-full w-full max-w-[44rem] px-4 text-center">
      <section className="flex min-h-[100cqh] flex-col items-center justify-center py-8">
        <div ref={box} className="relative aspect-square w-[min(96vw,64cqh)]">
          {rings.map((rg, i) => (
            <span key={i} aria-hidden="true" className="absolute top-1/2 left-1/2 rounded-full border border-[var(--bio-line)]" style={{ width: `${rg.r * 200}%`, height: `${rg.r * 200}%`, transform: 'translate(-50%,-50%)', opacity: placed.some((p) => p.ring === i) ? 1 : 0.25 }} />
          ))}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Depth d={0.04} pointer={8}>
              <Avatar size={110} />
            </Depth>
          </div>
          {placed.map((p) => (
            <OrbitDot key={p.b.id} block={p.b} angle={p.angle} radius={rings[p.ring].r * size} rot={rings[p.ring].rot} onHover={setLabel} />
          ))}
          <div aria-live="polite" className="bio-mute pointer-events-none absolute inset-x-0 bottom-[8%] text-[0.85rem]">
            {label ? label.title : ''}
          </div>
        </div>
        <Name className="mt-4 text-[clamp(2.2rem,8vw,3.6rem)]" />
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
      <span className={cn('hidden', fontClass(cfg.theme.font))} />
    </main>
  )
}

/* ------------------------------------------------------------------ 7. Index */

/** An editorial list. The row under the pointer lights up and the others fall back; a small card follows the pointer. */
export function Index() {
  const { items, cfg, mode } = useBio()
  const [on, setOn] = useState<string | null>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 260, damping: 28 })
  const sY = useSpring(y, { stiffness: 260, damping: 28 })
  const list = useRef<HTMLDivElement>(null)
  const current = items.find((b) => b.id === on && b.t === 'link') as Link | undefined
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
        <Avatar size={52} />
        <Socials justify="start" />
      </header>
      <Depth d={0.08} className="mt-[7cqh]">
        <Name className="text-[clamp(3.4rem,13vw,10rem)] [overflow-wrap:anywhere]" />
      </Depth>
      <Bio className="mt-6 max-w-[30rem]" />
      <div ref={list} onPointerMove={move} onPointerLeave={() => setOn(null)} className="relative mt-[8cqh] border-t border-[var(--bio-line)]">
        {items.map((b, i) => {
          if (b.t !== 'link') return <div key={b.id} className="py-4"><BlockView block={b} index={i} /></div>
          n++
          return (
            <a
              key={b.id}
              data-in
              data-link
              style={{ '--i': i, opacity: on && on !== b.id ? 0.28 : 1, transition: 'opacity .45s' } as CSSProperties}
              href={mode === 'mini' ? undefined : b.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              onMouseEnter={() => setOn(b.id)}
              className="group grid grid-cols-[2.2rem_1fr_auto] items-baseline gap-x-4 border-b border-[var(--bio-line)] py-5 md:grid-cols-[3.4rem_1fr_auto] md:py-6"
            >
              <span className="bio-mute font-mono text-[0.78rem]">{String(n).padStart(2, '0')}</span>
              <span className={cn('text-[clamp(1.5rem,4.6vw,3rem)] leading-none font-medium tracking-[-0.035em] transition-transform duration-500 group-hover:translate-x-2', fontClass(cfg.theme.font))}>{b.title}</span>
              <span className="flex items-center gap-3">
                <span className="bio-mute hidden text-[0.82rem] sm:inline">{b.note || hostOf(b.url)}</span>
                <ArrowUpRight className="size-5 opacity-40 transition-all duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" strokeWidth={1.4} />
              </span>
            </a>
          )
        })}
        {current && mode !== 'mini' && (
          <motion.div aria-hidden="true" className="bio-tile pointer-events-none absolute top-0 left-0 hidden w-[15rem] p-4 md:block" style={{ x: sx, y: sY }}>
            <BlockIcon block={current} className="size-6" />
            <p className="mt-6 text-[1.05rem] leading-tight font-medium tracking-[-0.02em]">{current.title}</p>
            <p className="bio-mute mt-1 text-[0.78rem]">{hostOf(current.url)}</p>
          </motion.div>
        )}
      </div>
      <Footer />
    </main>
  )
}

/* ------------------------------------------------------------------ 8. Terminal */

export function Terminal() {
  const { items, data, socials, mode, track, cfg } = useBio()
  const { links, rest } = split(items)
  const mono = PROFILE_FONT_CLASS.mono
  const line = 'flex flex-wrap items-baseline gap-x-3'
  return (
    <main className={cn('mx-auto min-h-full w-full max-w-[48rem] px-4 pt-[10cqh] pb-6', mono)}>
      <Depth d={0.05}>
        <div data-in className="overflow-hidden border border-[var(--bio-line)] bg-[var(--bio-soft)] backdrop-blur-xl" style={{ borderRadius: 'calc(var(--bio-r) * 0.6)' }}>
          <div className="flex items-center gap-2 border-b border-[var(--bio-line)] px-4 py-3">
            <span className="size-2.5 rounded-full border border-[var(--bio-mute)]" />
            <span className="size-2.5 rounded-full border border-[var(--bio-mute)]" />
            <span className="size-2.5 rounded-full border border-[var(--bio-mute)]" />
            <span className="bio-mute ml-3 text-[0.75rem]">{data.handle} ~ zsh</span>
          </div>
          <div className="space-y-5 p-5 text-[0.92rem] leading-relaxed md:p-7">
            <div style={{ '--i': 1 } as CSSProperties} data-in>
              <p className="bio-mute">$ whoami</p>
              <p className="text-[1.5rem] leading-tight font-semibold tracking-[-0.02em]">{data.name}</p>
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
                  <li key={l.id}>
                    <a data-link href={mode === 'mini' ? undefined : l.url} target="_blank" rel="noopener noreferrer nofollow" onClick={() => track('click', l.id)} className="group flex items-baseline gap-3 py-1">
                      <span className="bio-mute">[{i}]</span>
                      <span className="underline decoration-transparent underline-offset-4 transition-colors group-hover:decoration-[var(--bio-fg)]">{l.title}</span>
                      <span className="bio-mute hidden truncate text-[0.8rem] sm:inline">{hostOf(l.url)}</span>
                      <span className="ml-auto opacity-0 transition-opacity group-hover:opacity-100">→</span>
                    </a>
                  </li>
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
        <div className="mt-4 flex flex-col gap-3">
          {rest.map((b, i) => (
            <BlockView key={b.id} block={b} index={i} />
          ))}
        </div>
      )}
      <Footer />
      <span className={cn('hidden', fontClass(cfg.theme.font))} />
    </main>
  )
}

/* ------------------------------------------------------------------ 9. Chapters */

function Chapter({ block, index, total }: { block: Link; index: number; total: number }) {
  const { cfg, track, mode } = useBio()
  const right = index % 2 === 1
  return (
    <section data-chapter className="relative flex h-[100cqh] min-h-[26rem] snap-start items-center overflow-hidden px-6 md:px-14">
      <Depth d={0.32} className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 select-none', right ? 'left-4' : 'right-4')}>
        <span aria-hidden="true" className={cn('bn bn-outline block text-[clamp(10rem,46vw,34rem)] leading-none', fontClass(cfg.theme.font))}>
          {index + 1}
        </span>
      </Depth>
      <div className={cn('relative z-10 flex w-full flex-col gap-6', right ? 'items-end text-right' : 'items-start text-left')}>
        <Depth d={0.1}>
          <BlockIcon block={block} className="size-8" />
        </Depth>
        <Depth d={0.06}>
          <a data-link href={mode === 'mini' ? undefined : block.url} target="_blank" rel="noopener noreferrer nofollow" onClick={() => track('click', block.id)} className={cn('group block max-w-[16ch] text-[clamp(3rem,12vw,9.5rem)] leading-[0.92] font-medium tracking-[-0.05em] [overflow-wrap:anywhere]', fontClass(cfg.theme.font))}>
            {block.title}
            <ArrowUpRight className="ml-2 inline size-[0.5em] -translate-y-[0.15em] opacity-40 transition-all duration-500 group-hover:translate-x-1 group-hover:-translate-y-[0.3em] group-hover:opacity-100" strokeWidth={1.2} />
          </a>
        </Depth>
        {block.note && <p className="bio-mute max-w-[26rem] text-[1rem]">{block.note}</p>}
        <span className="bio-mute text-[0.72rem] tracking-[0.2em] uppercase">
          {index + 1} / {total}
        </span>
      </div>
    </section>
  )
}

/** One screen per link, with a very large title and a number behind it that moves against the scroll. */
export function Chapters() {
  const { items } = useBio()
  const { links, rest } = split(items)
  return (
    <main data-layout="chapters" className="min-h-full w-full">
      <section className="relative flex h-[100cqh] min-h-[28rem] snap-start flex-col items-center justify-center px-6 text-center">
        <Depth d={0.22} pointer={12}>
          <Avatar size={112} />
        </Depth>
        <Depth d={0.14} className="mt-7">
          <Name className="text-[clamp(3rem,12vw,8rem)]" />
        </Depth>
        <Depth d={0.08} className="mt-4">
          <Bio center />
        </Depth>
        <Socials className="mt-6" />
        <span aria-hidden="true" className="bio-mute absolute bottom-6 text-[0.7rem] tracking-[0.3em] uppercase">
          scroll
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

function Frame({ block, index }: { block: Link; index: number }) {
  const { cfg, track, mode } = useBio()
  return (
    <a
      data-link
      href={mode === 'mini' ? undefined : block.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={() => track('click', block.id)}
      className="bio-tile group relative flex h-[min(58cqh,28rem)] w-[min(76vw,23rem)] shrink-0 flex-col justify-between overflow-hidden p-6"
      style={{ borderRadius: 'calc(var(--bio-r) * 0.7)' }}
    >
      <span className="flex items-start justify-between">
        <span className="bio-mute font-mono text-[0.72rem]">FRAME {String(index + 1).padStart(2, '0')}</span>
        <ArrowUpRight className="size-5 opacity-40 transition-all duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" strokeWidth={1.4} />
      </span>
      <BlockIcon block={block} className="size-9" />
      <span>
        <span className={cn('block text-[clamp(1.9rem,6vw,2.8rem)] leading-[0.98] font-medium tracking-[-0.04em]', fontClass(cfg.theme.font))}>{block.title}</span>
        {block.note && <span className="bio-mute mt-2 block text-[0.85rem]">{block.note}</span>}
      </span>
    </a>
  )
}

/** A film strip that runs sideways as you scroll down. */
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
          <div aria-hidden="true" className="absolute inset-x-0 top-[8%] h-3 opacity-25" style={{ backgroundImage: 'repeating-linear-gradient(90deg, var(--bio-fg) 0 14px, transparent 14px 30px)', maskImage: 'linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)' }} />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-[8%] h-3 opacity-25" style={{ backgroundImage: 'repeating-linear-gradient(90deg, var(--bio-fg) 0 14px, transparent 14px 30px)', maskImage: 'linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)', WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent)' }} />
          <motion.div ref={track} className="flex w-max items-center gap-5 px-[8vw]" style={{ x: reduced ? 0 : x }}>
            <div className="flex w-[min(80vw,26rem)] shrink-0 flex-col justify-center pr-6">
              <Avatar size={92} className="mb-6" />
              <Name className="text-[clamp(3rem,9vw,6rem)] [overflow-wrap:anywhere]" />
              <Bio className="mt-4" />
              <Socials justify="start" className="mt-6" />
            </div>
            {links.map((l, i) => (
              <Frame key={l.id} block={l} index={i} />
            ))}
            <div className="w-[12vw] shrink-0" />
          </motion.div>
          <div aria-hidden="true" className="absolute inset-x-[8vw] bottom-[3%] h-px bg-[var(--bio-line)]">
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
