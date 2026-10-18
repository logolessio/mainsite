'use client'

import { Check, ChevronRight } from 'lucide-react'
import { TransitionLink } from '@/components/shell/transition-link'
import { cn } from '@/lib/utils'

export type CheckItem = { label: string; body: string; href: string; done?: boolean }

export function Checklist({ items }: { items: CheckItem[] }) {
  return (
    <ol className="divide-y divide-line">
      {items.map((it, i) => (
        <li key={it.label}>
          <TransitionLink href={it.href} className="group flex items-center gap-4 py-3.5">
            <span
              className={cn(
                'grid size-8 shrink-0 place-items-center rounded-pill border text-xs',
                it.done ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute',
              )}
            >
              {it.done ? <Check className="size-4" /> : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">{it.label}</span>
              <span className="block text-sm text-mute">{it.body}</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-4 text-mute transition-transform group-hover:translate-x-1" />
          </TransitionLink>
        </li>
      ))}
    </ol>
  )
}
