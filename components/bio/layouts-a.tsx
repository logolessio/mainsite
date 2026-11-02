'use client'

import { ArrowUpRight } from 'lucide-react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { type CSSProperties, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, Bio, BlockIcon, BlockList, BlockView, Footer, fontClass, Lean, Name, Socials } from './bits'
import { Badges, GlassCard } from './card'
import { Depth, useBio } from './context'
import type { BioBlock } from '@/lib/bio'

type Link = Extract<BioBlock, { t: 'link' }>
const asLink = (b: BioBlock): Link | null => (b.t === 'link' ? b : null)

/** 1. Aura: a frosted panel in the middle of the screen. It leans towards the pointer, a light slides over it, and the picture sits on its edge. */
export function Aura() {
  const { cfg, items } = useBio()
  const left = cfg.theme.align === 'left'
  return (
    <main className="mx-auto flex min-h-full w-full max-w-[34rem] flex-col px-4 pt-[9cqh] pb-6">
      <Depth d={0.07} pointer={5}>
        <GlassCard>
          <div className={cn('flex flex-col px-6 pt-0 pb-6 sm:px-8', left ? 'items-start text-left' : 'items-center text-center')}>
            <Depth d={0.1} pointer={10} className="-mt-[3.2rem]">
              <Avatar size={112} />
            </Depth>
            <Name className="mt-5 text-[clamp(2.2rem,8.5vw,3.2rem)]" />
            <Badges className="mt-3" center={!left} />
            <Bio center={!left} className="mt-4" />
            <Socials justify={left ? 'start' : 'center'} className="mt-5" />
            {items.length > 0 && (
              <div className="mt-7 w-full">
                <BlockList />
              </div>
            )}
          </div>
        </GlassCard>
      </Depth>
      <Footer className="mt-auto w-full" />
    </main>
  )
}

/** 2. Split: the name holds the left of the screen while the links move past on the right. */
export function Split() {
  const { items, cfg } = useBio()
  return (
    <main className="mx-auto grid min-h-full w-full max-w-[78rem] gap-x-16 px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:px-12">
      <div className="pt-[11cqh] pb-6 md:sticky md:top-0 md:flex md:h-[100cqh] md:flex-col md:justify-center md:py-0">
        <Depth d={0.04} pointer={8}>
          <Avatar size={96} className="mb-8" />
        </Depth>
        <Name className="text-[clamp(3rem,9vw,7.5rem)] [overflow-wrap:anywhere]" />
        <Bio className="mt-6 max-w-[26rem]" />
        <Socials justify="start" className="mt-7" />
      </div>
      <div className="flex flex-col gap-3 pt-6 pb-4 md:py-[16cqh]">
        <Depth d={-0.04}>
          <div className={cn('flex flex-col gap-3', fontClass(cfg.theme.font))}>
            {items.map((b, i) => (
              <BlockView key={b.id} block={b} index={i} />
            ))}
          </div>
        </Depth>
        <Footer className="mt-10 justify-start md:justify-end" />
      </div>
    </main>
  )
}

/** 3. Poster: the name as large as the screen, in two layers that slide at different speeds; the links are lines of type. */
export function Poster() {
  const { data, cfg, items } = useBio()
  const words = data.name.split(/\s+/).filter(Boolean).slice(0, 3)
  return (
    <main className="relative min-h-full w-full pb-6">
      <section className="relative flex h-[100cqh] min-h-[28rem] flex-col justify-between overflow-hidden px-6 pt-8 pb-8 md:px-12">
        <div className="flex items-center justify-between">
          <Avatar size={56} />
          <Socials justify="start" />
        </div>
        <div className="relative select-none" aria-hidden="true">
          {words.map((w, i) => (
            <div key={i} className="relative leading-[0.82]">
              <Depth d={0.1 + i * 0.06}>
                <span className={cn('bn block text-[clamp(4.2rem,21vw,19rem)] whitespace-nowrap', fontClass(cfg.theme.font))}>{w}</span>
              </Depth>
              <Depth d={0.18 + i * 0.09} className="absolute inset-0">
                <span className={cn('bn bn-outline block text-[clamp(4.2rem,21vw,19rem)] whitespace-nowrap', fontClass(cfg.theme.font))}>{w}</span>
              </Depth>
            </div>
          ))}
        </div>
        <span className="sr-only" role="heading" aria-level={1}>{data.name}</span>
        <Bio className="max-w-[28rem]" />
      </section>
      <section className="px-6 md:px-12">
        <div className="mx-auto max-w-[78rem] border-t border-[var(--bio-line)]">
          {items.map((b, i) => {
            const l = asLink(b)
            if (!l) return <div key={b.id} className="py-4"><BlockView block={b} index={i} /></div>
            return (
              <Depth key={b.id} d={0.015 * (i % 4)}>
                <a data-in data-link style={{ '--i': i } as CSSProperties} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="group relative flex items-baseline justify-between gap-6 overflow-hidden border-b border-[var(--bio-line)] py-5 md:py-7" onClick={() => undefined}>
                  <span className="absolute inset-0 origin-bottom scale-y-0 bg-[var(--bio-fg)] transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-y-100" />
                  <span className={cn('relative text-[clamp(1.8rem,6vw,4.6rem)] leading-none font-medium tracking-[-0.04em] transition-colors duration-500 group-hover:text-[var(--bio-bg)]', fontClass(cfg.theme.font))}>{l.title}</span>
                  <span className="relative flex items-center gap-3 text-[0.85rem] text-[var(--bio-mute)] transition-colors duration-500 group-hover:text-[var(--bio-bg)]">
                    <span className="hidden sm:inline">{l.note}</span>
                    <ArrowUpRight className="size-6" strokeWidth={1.4} />
                  </span>
                </a>
              </Depth>
            )
          })}
        </div>
        <Footer />
      </section>
    </main>
  )
}

/** 4. Bento: tiles of different sizes, each drifting at its own depth. */
export function Bento() {
  const { items, socials, data, cfg } = useBio()
  const links = items.filter((b) => b.t === 'link') as Link[]
  const rest = items.filter((b) => b.t !== 'link')
  const span = (i: number) => (i % 5 === 0 ? 'col-span-2' : i % 5 === 3 ? 'col-span-2 md:col-span-1 md:row-span-2' : '')
  return (
    <main className="mx-auto min-h-full w-full max-w-[64rem] px-5 pt-[8cqh] pb-6 md:px-8">
      <div className="grid auto-rows-[10.5rem] grid-cols-2 gap-3 md:grid-cols-4">
        <Depth d={0.05} className="col-span-2 row-span-2">
          <Lean className="h-full">
            <div data-in className="bio-tile flex h-full flex-col justify-between p-6" style={{ ['--i' as string]: 0 }}>
              <Avatar size={84} />
              <div>
                <Name className="text-[clamp(2rem,6vw,3.2rem)]" />
                <Bio className="mt-3 text-[0.92rem]" />
              </div>
            </div>
          </Lean>
        </Depth>
        {socials.length > 0 && (
          <Depth d={0.09} className="col-span-2">
            <div data-in className="bio-tile flex h-full items-center justify-center p-5" style={{ ['--i' as string]: 2 }}>
              <Socials />
            </div>
          </Depth>
        )}
        {links.map((l, i) => (
          <Depth key={l.id} d={0.03 + (i % 4) * 0.035} className={span(i)}>
            <Lean className="h-full">
              <a
                data-in
                data-link
                href={l.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                style={{ ['--i' as string]: 3 + Math.min(i, 10) }}
                className="bio-tile group flex h-full flex-col justify-between p-5"
              >
                <span className="flex items-start justify-between">
                  <BlockIcon block={l} className="size-6" />
                  <ArrowUpRight className="size-5 opacity-40 transition-all duration-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" strokeWidth={1.5} />
                </span>
                <span>
                  <span className={cn('block text-[1.15rem] leading-tight font-medium tracking-[-0.02em]', fontClass(cfg.theme.font))}>{l.title}</span>
                  {l.note && <span className="bio-mute mt-1 block text-[0.78rem]">{l.note}</span>}
                </span>
              </a>
            </Lean>
          </Depth>
        ))}
      </div>
      {rest.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {rest.map((b, i) => (
            <BlockView key={b.id} block={b} index={i} />
          ))}
        </div>
      )}
      <Footer />
      <span className="sr-only">{data.name}</span>
    </main>
  )
}

function StackCard({ block, index, total }: { block: Link; index: number; total: number }) {
  const { scroller, cfg, reduced } = useBio()
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, container: scroller, offset: ['start start', 'end start'] })
  const p = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 })
  const scale = useTransform(p, [0, 1], [1, reduced ? 1 : 0.9])
  const dim = useTransform(p, [0, 1], [0, reduced ? 0 : 0.7])
  const last = index === total - 1
  return (
    <div ref={ref} className="relative" style={{ height: last ? '60cqh' : '78cqh' }}>
      <motion.div className="sticky" style={{ top: `calc(12cqh + ${index * 0.9}rem)`, scale, transformOrigin: 'top center' }}>
        <a
          data-link
          href={block.url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="bio-tile relative flex h-[min(24rem,52cqh)] flex-col justify-between overflow-hidden p-7 md:p-9"
          style={{ background: 'var(--bio-card, var(--bio-soft))' }}
        >
          <span className="flex items-start justify-between">
            <BlockIcon block={block} className="size-7" />
            <ArrowUpRight className="size-7 opacity-50" strokeWidth={1.3} />
          </span>
          <span>
            <span className={cn('block text-[clamp(2rem,7vw,3.8rem)] leading-[0.98] font-medium tracking-[-0.04em]', fontClass(cfg.theme.font))}>{block.title}</span>
            {block.note && <span className="bio-mute mt-3 block text-[0.95rem]">{block.note}</span>}
          </span>
          <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: dim }} />
        </a>
      </motion.div>
    </div>
  )
}

/** 5. Stack: the links are tall cards that pile up as you scroll past them. */
export function Stack() {
  const { items } = useBio()
  const links = items.filter((b) => b.t === 'link') as Link[]
  const rest = items.filter((b) => b.t !== 'link')
  return (
    <main className="mx-auto min-h-full w-full max-w-[40rem] px-5">
      <section className="flex h-[88cqh] min-h-[26rem] flex-col items-center justify-center text-center">
        <Depth d={0.25} pointer={10}>
          <Avatar size={104} />
        </Depth>
        <Depth d={0.16} className="mt-6">
          <Name className="text-[clamp(2.6rem,10vw,4.6rem)]" />
        </Depth>
        <Depth d={0.1} className="mt-4">
          <Bio center />
        </Depth>
        <Socials className="mt-6" />
      </section>
      <div>
        {links.map((l, i) => (
          <StackCard key={l.id} block={l} index={i} total={links.length} />
        ))}
      </div>
      {rest.length > 0 && (
        <div className="flex flex-col gap-3 pb-6">
          {rest.map((b, i) => (
            <BlockView key={b.id} block={b} index={i} />
          ))}
        </div>
      )}
      <Footer />
    </main>
  )
}
