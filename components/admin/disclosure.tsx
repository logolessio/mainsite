'use client'

import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * A section that opens and closes, so a page can show the one thing you came for and keep the rest one click away.
 * It opens with a smooth height ease (no layout jump) and its contents cannot be tabbed into while closed.
 */
export function Disclosure({ title, sub, badge, defaultOpen = false, children, className, flush = false }: { title: string; sub?: string; badge?: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode; className?: string; flush?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section className={cn('overflow-hidden rounded-3xl border border-line bg-black/45', className)}>
      <h2>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.03]">
          <span className="min-w-0 flex-1">
            <span className="block text-lg tracking-[-0.01em]">{title}</span>
            {sub && <span className="mt-0.5 block text-sm text-mute">{sub}</span>}
          </span>
          {badge}
          <ChevronDown aria-hidden="true" className={cn('size-5 shrink-0 text-mute transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]', open && 'rotate-180')} />
        </button>
      </h2>
      <div id={id} role="region" inert={!open} className={cn('grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="min-h-0 overflow-hidden">
          <div className={cn('border-t border-line', !flush && 'p-6')}>{children}</div>
        </div>
      </div>
    </section>
  )
}
