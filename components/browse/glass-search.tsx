'use client'

import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LiquidGlass } from '@/components/ui/liquid-glass'

type Props = {
  value: string
  onChange: (value: string) => void
  resultCount: number
  className?: string
}

export function GlassSearch({ value, onChange, resultCount, className }: Props) {
  return (
    <LiquidGlass data-tour="search" rootClassName={cn('relative', className)} look={{ zRadius: 18 }}>
      <label htmlFor="campaign-search" className="sr-only">
        Search campaigns
      </label>
      <div className="flex h-14 items-center gap-3 pr-2 pl-5 md:h-16 md:pl-6">
        <Search aria-hidden="true" className="size-5 shrink-0 text-mute" />
        <input
          id="campaign-search"
          data-bare
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
    </LiquidGlass>
  )
}
