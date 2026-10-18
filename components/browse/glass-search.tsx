'use client'

import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useMotionPrefs } from '@/hooks/use-motion-prefs'
import { cn } from '@/lib/utils'

type Props = {
  value: string
  onChange: (value: string) => void
  resultCount: number
  className?: string
}

export function GlassSearch({ value, onChange, resultCount, className }: Props) {
  const { reduced } = useMotionPrefs()

  return (
    <div data-tour="search" className={cn('glass relative isolate overflow-hidden rounded-pill', className)}>
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -z-10 h-24 w-40 -translate-y-1/2 rounded-pill bg-paper/20 blur-2xl"
        initial={{ left: '-10%' }}
        animate={reduced ? { left: '20%' } : { left: ['-10%', '75%', '-10%'], scale: [1, 1.25, 1] }}
        transition={reduced ? { duration: 0 } : { duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <label htmlFor="campaign-search" className="sr-only">
        Search campaigns
      </label>
      <div className="flex h-14 items-center gap-3 pr-2 pl-5 md:h-16 md:pl-6">
        <Search aria-hidden="true" className="size-5 shrink-0 text-mute" />
        <input
          id="campaign-search"
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search artists, streamers, songs…"
          autoComplete="off"
          enterKeyHint="search"
          onKeyDown={(e) => e.key === 'Escape' && onChange('')}
          className="h-full min-w-0 flex-1 bg-transparent text-base text-paper placeholder:text-mute focus:outline-none md:text-lg [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="grid size-10 place-items-center rounded-pill text-mute transition-colors hover:bg-paper/10 hover:text-paper"
          >
            <X className="size-4" />
          </button>
        ) : (
          <span className="hidden pr-4 font-mono text-xs text-mute sm:block">{resultCount} live</span>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {value ? `${resultCount} campaigns match ${value}` : ''}
      </p>
    </div>
  )
}
