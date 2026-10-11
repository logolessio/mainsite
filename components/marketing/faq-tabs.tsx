'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { FAQ } from '@/lib/faq'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { T } from '@/components/shell/copy-provider'

export function FaqTabs() {
  const tabs = Object.keys(FAQ) as (keyof typeof FAQ)[]
  const [tab, setTab] = useState<keyof typeof FAQ>('Clippers')
  const [open, setOpen] = useState<number | null>(0)

  return (
    <div className="mx-auto max-w-3xl text-center">
      <div role="tablist" aria-label="FAQ audience" className="inline-flex border border-line-strong rounded-2xl">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => {
              setTab(t)
              setOpen(0)
            }}
            className={cn(
              'h-11 px-6 text-sm transition-colors',
              tab === t ? 'bg-paper text-ink' : 'text-mute hover:text-paper',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.ul
          key={tab}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="mt-12 border-t border-line"
        >
          {FAQ[tab].map((item, i) => {
            const isOpen = open === i
            return (
              <li key={item.q} className="border-b border-line">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-6 py-8 text-center"
                  >
                    <span className="flex-1 font-display text-2xl md:text-4xl"><T>{item.q}</T></span>
                    <Plus
                      aria-hidden="true"
                      className={cn('size-5 shrink-0 transition-transform duration-300', isOpen && 'rotate-45')}
                    />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.4, ease: EASE_OUT }}
                      className="overflow-hidden"
                    >
                      <p className="mx-auto max-w-xl pb-10 text-pretty leading-snug text-mute"><T>{item.a}</T></p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </motion.ul>
      </AnimatePresence>
    </div>
  )
}
