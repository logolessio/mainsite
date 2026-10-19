'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { BlobLens, type Rect } from '@/components/glass/blob-lens'
import { X } from 'lucide-react'
import { BrandIcon } from '@/components/brand-icon'
import type { Platform } from '@/lib/campaigns'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { LiquidGlass } from '@/components/ui/liquid-glass'

export type SortKey = 'rate' | 'ending' | 'budget'

export const SORTS: { key: SortKey; label: string }[] = [
  { key: 'rate', label: 'Highest rate' },
  { key: 'ending', label: 'Ending soon' },
  { key: 'budget', label: 'Biggest budget' },
]

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'instagram', label: 'Instagram' },
]

/** A chip is only its text and its shape; the lens of glass behind the chosen category is drawn by the group and slides to it. */
const chip = (on: boolean) =>
  cn('relative inline-flex h-8 items-center gap-1.5 rounded-pill px-3 text-xs transition-colors duration-300', on ? 'text-paper' : 'text-mute hover:text-paper')

const SLIDE = { type: 'spring', stiffness: 520, damping: 38, mass: 0.8 } as const

export function FilterBar({
  categories,
  category,
  onCategory,
  platforms,
  onPlatform,
  sort,
  onSort,
  active,
  onClear,
}: {
  categories: string[]
  category: string
  onCategory: (c: string) => void
  platforms: Platform[]
  onPlatform: (p: Platform) => void
  sort: SortKey
  onSort: (s: SortKey) => void
  active: boolean
  onClear: () => void
}) {
  const row = useRef<HTMLDivElement>(null)
  const nodes = useRef(new Map<string, HTMLButtonElement>())
  const [rect, setRect] = useState<Rect | null>(null)
  const [from, setFrom] = useState<Rect | null>(null)
  const [still, setStill] = useState(false)
  const measure = useCallback(() => {
    const el = nodes.current.get(category)
    return el ? { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight } : null
  }, [category])
  useLayoutEffect(() => {
    const m = measure()
    if (!m) return
    setFrom((f) => f ?? m)
    setRect(m)
  }, [measure, categories])
  // the bar wraps and resizes with the window: the lens follows at once, it does not glide through that
  useLayoutEffect(() => {
    const el = row.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      const m = measure()
      if (!m) return
      setStill(true)
      setRect(m)
      window.setTimeout(() => setStill(false), 60)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [measure])
  return (
    <LiquidGlass
      as={motion.div}
      data-tour="filters"
      initial={false}
      rootClassName="mx-auto mb-10 w-fit max-w-full md:mb-14"
      rounded="rounded-[calc(26px*var(--round,1))] md:rounded-pill"
      className="flex flex-wrap items-center justify-center gap-1 p-1.5 md:px-3"
    >
      <div ref={row} role="group" aria-label="Category" className="relative flex flex-wrap justify-center gap-0.5">
        {rect && from && <BlobLens rect={rect} from={from} instant={still} soft />}
        {categories.map((c) => (
          <button
            key={c}
            ref={(el) => {
              if (el) nodes.current.set(c, el)
              else nodes.current.delete(c)
            }}
            type="button"
            aria-pressed={category === c}
            onClick={() => onCategory(c)}
            className={chip(category === c)}
          >
            {category === c && !rect && <span aria-hidden="true" className="absolute inset-0 rounded-pill bg-white/[0.2]" />}
            <span className="relative">{c}</span>
          </button>
        ))}
      </div>
      <span aria-hidden="true" className="mx-1 hidden h-4 w-px bg-line-strong md:block" />
      <div role="group" aria-label="Platform" className="flex gap-0.5">
        {PLATFORMS.map((p) => {
          const on = platforms.includes(p.key)
          return (
            <button
              key={p.key}
              type="button"
              aria-pressed={on}
              aria-label={p.label}
              title={p.label}
              onClick={() => onPlatform(p.key)}
              className={cn(chip(on), 'w-8 justify-center px-0')}
            >
              <AnimatePresence initial={false}>
                {on && <motion.span key="bg" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={SLIDE} aria-hidden="true" className="absolute inset-0 rounded-pill bg-white/[0.22] shadow-[inset_0_1px_0_rgb(255_255_255/0.5),inset_0_0_0_1px_rgb(255_255_255/0.3)]" />}
              </AnimatePresence>
              <BrandIcon name={p.key} className="relative size-3.5" />
            </button>
          )
        })}
      </div>
      <span aria-hidden="true" className="mx-1 hidden h-4 w-px bg-line-strong md:block" />
      {/* the visible text decides the width, so the bar is only as wide as its choices; the real select sits invisibly on top */}
      <label className="group/sort relative inline-grid h-8 cursor-pointer items-center rounded-pill has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-paper/60">
        <span className="sr-only">Sort by</span>
        <span aria-hidden="true" className="px-3 text-xs whitespace-nowrap text-mute transition-colors group-hover/sort:text-paper">
          {SORTS.find((x) => x.key === sort)?.label}
        </span>
        <select value={sort} onChange={(e) => onSort(e.target.value as SortKey)} className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0 focus:outline-none">
          {SORTS.map((s) => (
            <option key={s.key} value={s.key} className="bg-ink">
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {active && (
        <button type="button" onClick={onClear} aria-label="Clear filters" className="grid size-8 place-items-center rounded-pill text-mute transition-colors hover:text-paper">
          <X aria-hidden="true" className="size-3.5" />
        </button>
      )}
    </LiquidGlass>
  )
}
