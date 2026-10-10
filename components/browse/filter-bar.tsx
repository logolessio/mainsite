'use client'

import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { BrandIcon } from '@/components/brand-icon'
import type { Platform } from '@/lib/campaigns'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

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

const pill = (on: boolean) =>
  cn(
    'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs transition-colors',
    on ? 'bg-paper text-ink' : 'text-mute hover:text-paper',
  )

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
  return (
    <motion.div
      data-tour="filters"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.45, ease: EASE_OUT }}
      className="mx-auto mb-10 flex max-w-fit flex-wrap items-center justify-center gap-1 rounded-[22px] border border-line bg-surface/80 p-1 md:mb-14 md:rounded-full"
    >
      <div role="group" aria-label="Category" className="flex flex-wrap justify-center gap-0.5">
        {categories.map((c) => (
          <button key={c} type="button" aria-pressed={category === c} onClick={() => onCategory(c)} className={pill(category === c)}>
            {c}
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
              className={cn(pill(on), 'w-8 justify-center px-0')}
            >
              <BrandIcon name={p.key} className="size-3.5" />
            </button>
          )
        })}
      </div>
      <span aria-hidden="true" className="mx-1 hidden h-4 w-px bg-line-strong md:block" />
      <label>
        <span className="sr-only">Sort by</span>
        <select
          value={sort}
          onChange={(e) => onSort(e.target.value as SortKey)}
          className="h-8 cursor-pointer appearance-none rounded-full bg-transparent px-3 text-xs text-mute transition-colors hover:text-paper focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key} className="bg-ink">
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {active && (
        <button type="button" onClick={onClear} aria-label="Clear filters" className="grid size-8 place-items-center rounded-full text-mute transition-colors hover:text-paper">
          <X aria-hidden="true" className="size-3.5" />
        </button>
      )}
    </motion.div>
  )
}
