'use client'

import { Check } from 'lucide-react'
import { LOOK_TILE_BLEND, LOOKS, lookOrbCss, lookTileCss } from '@/lib/looks'
import { cn } from '@/lib/utils'

/**
 * The ready-made looks: a noisy gradient picture and a banner that go together. Used when signing up and in the profile.
 * Each tile is the banner with the picture sitting on it as a small sphere. The name shows on hover and on the chosen one, which has a red edge.
 */
export function LookPicker({ value, onPick, className }: { value: string; onPick: (id: string) => void; className?: string }) {
  return (
    <div role="radiogroup" aria-label="Ready-made looks" className={cn('grid w-full max-w-md grid-cols-4 gap-2.5', className)}>
      {LOOKS.map((l) => {
        const on = value === l.id
        return (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={l.name}
            onClick={() => onPick(l.id)}
            className={cn(
              'group/look relative aspect-[4/3] overflow-hidden rounded-card border outline-none transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink',
              on ? 'border-signal shadow-[0_0_0_1px_var(--signal),0_14px_30px_-14px_rgb(255_31_56/0.75)]' : 'border-white/12 hover:border-white/30 hover:shadow-[0_14px_28px_-16px_rgb(0_0_0/0.9)]',
            )}
            style={{ background: lookTileCss(l), backgroundBlendMode: LOOK_TILE_BLEND }}
          >
            {/* a faint top sheen, and a darker foot so the name can be read on every colour */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255/0.12)_0%,transparent_34%,transparent_58%,rgb(0_0_0/0.38)_100%)]" />
            <span aria-hidden="true" className="absolute bottom-2 left-2 size-7 rounded-full shadow-[0_6px_14px_-4px_rgb(0_0_0/0.75),inset_0_0_0_1px_rgb(255_255_255/0.32)]" style={{ background: lookOrbCss(l) }} />
            <span aria-hidden="true" className={cn('absolute right-2 bottom-2.5 font-mono text-[9.5px] leading-none tracking-[0.12em] text-white/90 uppercase transition-opacity duration-300 [text-shadow:0_1px_6px_rgb(0_0_0/0.6)]', on ? 'opacity-100' : 'opacity-0 group-hover/look:opacity-100 group-focus-visible/look:opacity-100')}>
              {l.name}
            </span>
            {on && (
              <span aria-hidden="true" className="absolute top-2 right-2 grid size-[18px] place-items-center rounded-full bg-signal text-white shadow-[0_2px_8px_rgb(0_0_0/0.4)]">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
