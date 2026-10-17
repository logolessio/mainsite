'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useId, useState } from 'react'
import { cn } from '@/lib/utils'

export type TabbedItem = { id: string; label: string; count?: number; hot?: boolean; node: React.ReactNode }

/**
 * Splits a long page into a few named views you switch between, with a count beside each. The view you picked last is remembered
 * (per `memory` key) so coming back puts you where you were. The views are rendered on the server and handed in as nodes.
 */
export function Tabbed({ tabs, initial, memory, className }: { tabs: TabbedItem[]; initial?: string; memory?: string; className?: string }) {
  const uid = useId()
  const first = tabs.find((t) => t.id === initial)?.id ?? tabs[0]?.id ?? ''
  const [on, setOn] = useState(first)

  useEffect(() => {
    if (!memory) return
    try {
      const v = window.sessionStorage.getItem(`ll:tab:${memory}`)
      if (v && tabs.some((t) => t.id === v)) setOn(v)
    } catch {
      /* a private window forgets */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memory])

  const pick = (id: string) => {
    setOn(id)
    if (memory) {
      try {
        window.sessionStorage.setItem(`ll:tab:${memory}`, id)
      } catch {
        /* ignore */
      }
    }
  }
  const current = tabs.find((t) => t.id === on) ?? tabs[0]

  return (
    <div className={className}>
      <div role="tablist" className="no-scrollbar -mx-1 mb-6 flex gap-1 overflow-x-auto px-1 pb-1">
        {tabs.map((t) => {
          const active = t.id === current?.id
          return (
            <button key={t.id} id={`${uid}-${t.id}`} type="button" role="tab" aria-selected={active} aria-controls={`${uid}-panel`} onClick={() => pick(t.id)} className="relative inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] outline-none transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-paper/60">
              {active && <motion.span layoutId={`tabbed-${uid}`} transition={{ type: 'spring', stiffness: 420, damping: 36 }} className="absolute inset-0 rounded-full border border-white/[0.14] bg-white/[0.08]" />}
              <span className={cn('relative', active ? 'text-paper' : 'text-paper/55 hover:text-paper')}>{t.label}</span>
              {t.count !== undefined && (
                <span className={cn('relative grid h-5 min-w-5 place-items-center rounded-full border px-1.5 text-[11px] tabular-nums transition-colors duration-300', t.hot && t.count > 0 ? 'border-cyan-300/60 text-cyan-200' : 'border-white/15 text-paper/50')}>{t.count}</span>
              )}
            </button>
          )
        })}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={current?.id} id={`${uid}-panel`} role="tabpanel" aria-labelledby={current ? `${uid}-${current.id}` : undefined} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
          {current?.node}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
