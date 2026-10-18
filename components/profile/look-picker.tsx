'use client'

import { Check } from 'lucide-react'
import { avatarCss, bannerCss, LOOKS } from '@/lib/looks'
import { cn } from '@/lib/utils'

/** The ready-made looks: a noisy gradient picture and a banner that go together. Used when signing up and in the profile. */
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
            title={l.name}
            onClick={() => onPick(l.id)}
            className={cn('relative aspect-[4/3] overflow-hidden rounded-2xl outline-none ring-offset-2 ring-offset-ink transition-transform hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-paper/70', on && 'ring-2 ring-paper')}
            style={{ background: bannerCss(l) }}
          >
            <span aria-hidden="true" className="absolute bottom-1.5 left-1.5 size-6 rounded-pill ring-2 ring-black/40" style={{ background: avatarCss(l) }} />
            {on && (
              <span aria-hidden="true" className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-pill bg-paper text-ink">
                <Check className="size-3" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
