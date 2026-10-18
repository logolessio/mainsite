'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useId } from 'react'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

export type GlassTab = { id: string; label: string; href?: string }

/**
 * A row of choices on a pane of liquid glass. The highlight slides and stretches from one choice to the next.
 * Centre it with its wrapper. Give each tab an `href` to use it as navigation, or an `onChange` to use it as a switch.
 */
export function GlassTabs({ tabs, value, onChange, label, className }: { tabs: GlassTab[]; value: string; onChange?: (id: string) => void; label: string; className?: string }) {
  const id = useId()
  // The glass light is a tall, moving pseudo-element. If the scroller were the glass itself, that light would count as
  // scrollable overflow and a scrollbar would flash in and out. So the glass clips, and a plain inner row scrolls.
  return (
    <div className={cn('glass-liquid mx-auto w-fit max-w-full rounded-pill', className)}>
      <div role={onChange ? 'tablist' : 'navigation'} {...(onChange ? {} : { 'data-kb-tabs': '' })} aria-label={label} className="no-scrollbar flex items-center gap-1 overflow-x-auto overflow-y-hidden p-1.5">
        {tabs.map((t) => {
          const on = t.id === value
          const inner = (
            <>
              {on && <motion.span layoutId={`glass-tab-${id}`} transition={{ type: 'spring', stiffness: 380, damping: 32 }} className="absolute inset-0 rounded-pill bg-paper" />}
              <span className={cn('relative transition-colors duration-200', on ? 'text-ink' : 'text-paper/60 hover:text-paper')}>{t.label}</span>
            </>
          )
          const cls = 'relative inline-flex h-10 shrink-0 items-center rounded-pill px-5 text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-paper/60'
          return t.href ? (
            <Link key={t.id} href={t.href} aria-current={on ? 'page' : undefined} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={t.id} type="button" role="tab" aria-selected={on} tabIndex={on ? 0 : -1} onClick={() => onChange?.(t.id)} className={cls}>
              {inner}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { EASE_OUT }
