'use client'

import { ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRef } from 'react'
import { type BioBlock } from '@/lib/bio'
import { cn } from '@/lib/utils'
import { Avatar, Bio, BlockIcon, BlockView, Footer, fontClass, Name, Socials } from './bits'
import { Badges } from './card'
import { Cap, Frames, hostOf, type LinkBlock, pad, Rows, Speed, Halftone, Stipple, useLink, useScene, useStep, WinBar, winClass, winHover } from './comic'
import { Depth, useBio } from './context'

const parts = (items: BioBlock[]) => ({ links: items.filter((b) => b.t === 'link') as LinkBlock[], rest: items.filter((b) => b.t !== 'link') })

/** 1. Aura: the cover. The name sits in front of three hairline frames round the picture, and the links open below as windows. */
export function Aura() {
  const { data, items } = useBio()
  const top = useRef<HTMLElement>(null)
  const p = useScene(top, ['start start', 'end start'])
  const drift = useStep(p, [0, 1], ['0cqh', '-16cqh'], '0cqh')
  const grow = useStep(p, [0, 1], [1, 1.12], 1)
  const line = (data.bio || '').split('\n')[0].slice(0, 90)
  return (
    <main className="min-h-full w-full">
      <section ref={top} className="relative flex h-[100cqh] min-h-[32rem] flex-col items-center overflow-hidden px-4 pt-[7cqh] text-center">
        <Cap>{line || `logoless.io/${data.handle}`}</Cap>
        <motion.div style={{ scale: grow }} className="mt-[5cqh]">
          <Frames>
            <Avatar size={176} />
          </Frames>
        </motion.div>
        <motion.div style={{ y: drift }} className="absolute inset-x-0 top-[13cqh] px-2">
          <Name className="text-[clamp(3rem,16cqw,9.5rem)] [overflow-wrap:anywhere]" />
        </motion.div>
        <Badges className="mt-[6cqh]" />
        <Socials className="mt-5" />
        <span aria-hidden="true" className="absolute bottom-5 flex flex-col items-center gap-2 text-[0.6rem] tracking-[0.22em] text-[var(--bio-mute)] uppercase">
          scroll
          <span className="block h-7 w-px bg-[var(--bio-fg)]" />
        </span>
      </section>
      <section className="mx-auto w-full max-w-[34rem] px-5 pb-6">
        <Rows items={items} className="pt-4" />
        <Footer />
      </section>
    </main>
  )
}

/** 2. Split: the name holds the left of the screen while the links, as windows, move past on the right. */
export function Split() {
  const { items } = useBio()
  return (
    <main className="mx-auto grid min-h-full w-full max-w-[78rem] gap-x-14 px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:px-12">
      <div className="pt-[11cqh] pb-6 md:sticky md:top-0 md:flex md:h-[100cqh] md:flex-col md:justify-center md:py-0">
        <Depth d={0.04} pointer={6}>
          <Frames className="mb-10 w-fit">
            <Avatar size={96} />
          </Frames>
        </Depth>
        <Name className="text-[clamp(3rem,9cqw,7.2rem)] [overflow-wrap:anywhere]" />
        <Bio className="mt-6 max-w-[26rem]" />
        <Socials justify="start" className="mt-7" />
      </div>
      <div className="pt-6 pb-4 md:py-[16cqh]">
        <Depth d={-0.03}>
          <Rows items={items} />
        </Depth>
        <Footer className="mt-10 justify-start md:justify-end" />
      </div>
    </main>
  )
}

/** 3. Poster: the name as large as the screen, in two layers that slide at different speeds, and the links as lines of type. */
export function Poster() {
  const { data, cfg, items } = useBio()
  const words = data.name.split(/\s+/).filter(Boolean).slice(0, 3)
  let n = -1
  return (
    <main className="relative min-h-full w-full pb-6">
      <section className="relative flex h-[100cqh] min-h-[28rem] flex-col justify-between overflow-hidden px-6 pt-8 pb-8 md:px-12">
        <div aria-hidden="true" className="absolute top-1/2 left-1/2 aspect-square w-[160cqh] -translate-x-1/2 -translate-y-1/2 opacity-60">
          <Speed className="size-full" />
        </div>
        <Halftone className="absolute inset-x-0 bottom-0 h-1/3 opacity-60" />
        <div className="relative flex items-center justify-between">
          <Avatar size={56} />
          <Socials justify="start" />
        </div>
        <div className="relative select-none" aria-hidden="true">
          {words.map((w, i) => (
            <div key={i} className="relative leading-[0.82]">
              <Depth d={0.1 + i * 0.06}>
                <span className={cn('bn block text-[clamp(4.2rem,21cqw,19rem)] whitespace-nowrap', fontClass(cfg.theme.font))}>{w}</span>
              </Depth>
              <Depth d={0.18 + i * 0.09} className="absolute inset-0">
                <span className={cn('bn bn-outline block text-[clamp(4.2rem,21cqw,19rem)] whitespace-nowrap', fontClass(cfg.theme.font))}>{w}</span>
              </Depth>
            </div>
          ))}
        </div>
        <span className="sr-only" role="heading" aria-level={1}>
          {data.name}
        </span>
        <Bio className="relative max-w-[28rem]" />
      </section>
      <section className="relative px-6 md:px-12">
        <div className="mx-auto max-w-[78rem] border-t border-[rgb(var(--bio-fg-rgb)/0.6)]">
          {items.map((b, i) => {
            if (b.t !== 'link') {
              return (
                <div key={b.id} className="py-4">
                  <BlockView block={b} index={i} />
                </div>
              )
            }
            n++
            return <PosterRow key={b.id} block={b} index={n} />
          })}
        </div>
        <Footer />
      </section>
    </main>
  )
}

function PosterRow({ block, index }: { block: LinkBlock; index: number }) {
  const lp = useLink(block)
  return (
    <Depth d={0.015 * (index % 4)}>
      <a {...lp} data-link className="group relative flex items-baseline justify-between gap-6 overflow-hidden border-b border-[rgb(var(--bio-fg-rgb)/0.6)] py-5 md:py-7">
        <span className="absolute inset-0 origin-bottom scale-y-0 bg-[var(--bio-fg)] transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] group-hover:scale-y-100" />
        <span className="relative flex items-baseline gap-4 md:gap-6">
          <span className="text-[0.62rem] tabular-nums text-[var(--bio-mute)] transition-colors duration-500 group-hover:text-[var(--bio-bg)]">{pad(index + 1)}</span>
          <span className="bt text-[clamp(1.8rem,6cqw,4.6rem)] transition-colors duration-500 group-hover:text-[var(--bio-bg)]">{block.title}</span>
        </span>
        <span className="relative flex items-center gap-3 text-[0.8rem] text-[var(--bio-mute)] italic transition-colors duration-500 group-hover:text-[var(--bio-bg)]">
          <span className="hidden sm:inline">{block.note || hostOf(block.url)}</span>
          <ArrowRight className="size-5" strokeWidth={1.4} />
        </span>
      </a>
    </Depth>
  )
}

/** 4. Bento: windows of different sizes, each drifting at its own depth. */
function Tile({ title, children, className, depth = 0.04, href, block }: { title: string; children: React.ReactNode; className?: string; depth?: number; href?: boolean; block?: LinkBlock }) {
  const lp = useLink(block ?? { id: '', url: '' })
  const body = (
    <>
      <WinBar>{title}</WinBar>
      <div className="relative flex min-h-0 flex-1 flex-col p-4">{children}</div>
    </>
  )
  return (
    <Depth d={depth} className={cn('min-h-0', className)}>
      {href && block ? (
        <a {...lp} data-link className={cn('group flex h-full flex-col', winClass, winHover)}>
          {body}
        </a>
      ) : (
        <div className={cn('flex h-full flex-col', winClass)}>{body}</div>
      )}
    </Depth>
  )
}

export function Bento() {
  const { items, socials, data, cfg } = useBio()
  const { links, rest } = parts(items)
  const span = (i: number) => (i % 5 === 0 ? 'col-span-2' : i % 5 === 3 ? 'col-span-2 md:col-span-1 md:row-span-2' : '')
  return (
    <main className="mx-auto min-h-full w-full max-w-[64rem] px-5 pt-[8cqh] pb-6 md:px-8">
      <div className="grid auto-rows-[11rem] grid-cols-2 gap-5 md:grid-cols-4">
        <Tile title={data.handle} depth={0.05} className="col-span-2 row-span-2">
          <Frames className="w-fit">
            <Avatar size={84} />
          </Frames>
          <div className="mt-auto pt-6">
            <Name className="text-[clamp(2rem,6cqw,3.2rem)]" />
            <Bio className="mt-3 text-[0.88rem]" />
          </div>
        </Tile>
        {socials.length > 0 && (
          <Tile title="find me" depth={0.09} className="col-span-2">
            <div className="m-auto">
              <Socials />
            </div>
          </Tile>
        )}
        {links.map((l, i) => (
          <Tile key={l.id} title={`${pad(i + 1)} · ${hostOf(l.url)}`} depth={0.03 + (i % 4) * 0.035} className={span(i)} href block={l}>
            <span className="flex items-start justify-between">
              <BlockIcon block={l} className="size-6" />
              <ArrowRight className="size-5 opacity-50 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={1.5} />
            </span>
            <span className="mt-auto">
              <span className={cn('bt block text-[1.2rem]', fontClass(cfg.theme.font))}>{l.title}</span>
              {l.note && <span className="mt-1 block text-[0.74rem] italic opacity-60">{l.note}</span>}
            </span>
          </Tile>
        ))}
      </div>
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

function StackCard({ block, index, total }: { block: LinkBlock; index: number; total: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const p = useScene(ref, ['start start', 'end start'])
  const scale = useStep(p, [0, 1], [1, 0.92], 1)
  const dim = useStep(p, [0, 1], [0, 0.7], 0)
  const lp = useLink(block)
  const last = index === total - 1
  return (
    <div ref={ref} className="relative" style={{ height: last ? '60cqh' : '78cqh' }}>
      <motion.div className="sticky" style={{ top: `calc(12cqh + ${index * 0.9}rem)`, scale, transformOrigin: 'top center' }}>
        <a {...lp} data-link className={cn('relative flex h-[min(24rem,52cqh)] flex-col overflow-hidden', winClass)}>
          <WinBar>
            {pad(index + 1)} / {pad(total)} · {hostOf(block.url)}
          </WinBar>
          <span className="relative flex flex-1 flex-col justify-between p-6 md:p-8">
            <Stipple className="absolute inset-y-0 right-0 w-[6%] opacity-40" />
            <span className="flex items-start justify-between">
              <BlockIcon block={block} className="size-7" />
              <ArrowRight className="size-7 opacity-60" strokeWidth={1.3} />
            </span>
            <span>
              <span className="bt block text-[clamp(2rem,7cqw,3.8rem)]">{block.title}</span>
              {block.note && <span className="mt-3 block text-[0.9rem] italic opacity-65">{block.note}</span>}
            </span>
          </span>
          <motion.span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: dim }} />
        </a>
      </motion.div>
    </div>
  )
}

/** 5. Stack: the links are tall windows that pile up as you scroll past them. */
export function Stack() {
  const { items } = useBio()
  const { links, rest } = parts(items)
  return (
    <main className="mx-auto min-h-full w-full max-w-[40rem] px-5">
      <section className="flex h-[88cqh] min-h-[26rem] flex-col items-center justify-center text-center">
        <Depth d={0.25} pointer={8}>
          <Frames>
            <Avatar size={104} />
          </Frames>
        </Depth>
        <Depth d={0.16} className="mt-9">
          <Name className="text-[clamp(2.6rem,10cqw,4.6rem)]" />
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
