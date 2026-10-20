'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useId } from 'react'
import { X } from 'lucide-react'
import { BrandIcon } from '@/components/brand-icon'
import type { Platform } from '@/lib/campaigns'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { LiquidGlass } from '@/components/ui/liquid-glass'
import { useFeature } from '@/components/shell/features-provider'
import { CoverTextControl } from './cover-text-control'

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

/** A chip is only its text and its shape; the white pill behind the chosen one is drawn by the group and slides to it. */
const chip = (on: boolean) =>
  cn('relative inline-flex h-8 items-center gap-1.5 rounded-pill px-3 text-xs transition-colors duration-300', on ? 'text-ink' : 'text-mute hover:text-paper')

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
  const group = useId()
  const textSize = useFeature('cover-text-size')
  return (
    <LiquidGlass
      as={motion.div}
      data-tour="filters"
      initial={false}
      rootClassName="mx-auto mb-10 w-fit max-w-full md:mb-14"
      rounded="rounded-[calc(26px*var(--round,1))] md:rounded-pill"
      className="flex flex-wrap items-center justify-center gap-1 p-1.5 md:px-3"
    >
      <div role="group" aria-label="Category" className="flex flex-wrap justify-center gap-0.5">
        {categories.map((c) => (
          <button key={c} type="button" aria-pressed={category === c} onClick={() => onCategory(c)} className={chip(category === c)}>
            {category === c && <motion.span layoutId={`${group}-category`} transition={SLIDE} aria-hidden="true" className="absolute inset-0 rounded-pill bg-paper" />}
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
                {on && <motion.span key="bg" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={SLIDE} aria-hidden="true" className="absolute inset-0 rounded-pill bg-paper" />}
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
      {textSize && (
        <>
          <span aria-hidden="true" className="mx-1 hidden h-4 w-px bg-line-strong md:block" />
          <CoverTextControl />
        </>
      )}
      {/* the clear button's place is always kept, so nothing in the bar moves when it appears: it only fades and grows in where it stands */}
      <span className="relative grid size-8 shrink-0 place-items-center">
        <AnimatePresence initial={false}>
          {active && (
            <motion.button
              key="clear"
              type="button"
              onClick={onClear}
              aria-label="Clear filters"
              title="Clear filters"
              initial={{ opacity: 0, scale: 0.6, rotate: -45 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6, rotate: 45 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="absolute inset-0 grid place-items-center rounded-pill text-mute transition-colors hover:bg-white/[0.08] hover:text-paper"
            >
              <X aria-hidden="true" className="size-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </span>
    </LiquidGlass>
  )
}
