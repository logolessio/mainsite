'use client'

import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

/** A quiet "show more" inside a row: the detail is one click away and opens with a smooth ease, so rows stay short. */
export function More({ label = 'Details', openLabel, children, className }: { label?: string; openLabel?: string; children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className={className}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm text-paper/55 transition-colors hover:bg-white/[0.06] hover:text-paper">
        {open ? (openLabel ?? 'Hide') : label}
        <ChevronDown aria-hidden="true" className={cn('size-4 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]', open && 'rotate-180')} />
      </button>
      <div id={id} inert={!open} className={cn('grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="min-h-0 overflow-hidden">
          <div className="pt-3">{children}</div>
        </div>
      </div>
    </div>
  )
}
