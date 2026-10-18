'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FAQ } from '@/lib/faq'
import { EASE_OUT } from '@/lib/layout'
import { GlassTabs } from '@/components/ui/glass-tabs'
import { cn } from '@/lib/utils'
import { T } from '@/components/shell/copy-provider'

type Tab = 'All' | keyof typeof FAQ

export function FaqTabs() {
  const groups = Object.keys(FAQ) as (keyof typeof FAQ)[]
  const [tab, setTab] = useState<Tab>('All')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const items = useMemo(() => {
    const t = q.trim().toLowerCase()
    return groups
      .flatMap((g) => FAQ[g].map((f) => ({ ...f, group: g })))
      .filter((f) => (tab === 'All' || f.group === tab) && (!t || f.q.toLowerCase().includes(t) || f.a.toLowerCase().includes(t)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q])

  return (
    <div>
      <div className="flex flex-col items-center gap-5 border-b border-line pb-8">
        <GlassTabs label="FAQ audience tabs" value={tab} onChange={(t) => setTab(t as Tab)} tabs={(['All', ...groups] as Tab[]).map((t) => ({ id: t, label: t }))}  />
        <label className="block w-full max-w-md">
          <span className="sr-only">Search the questions</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the questions" className="h-12 w-full rounded-pill border border-line-strong bg-transparent px-5 text-[15px] outline-none transition-colors placeholder:text-paper/35 focus:border-paper" />
        </label>
      </div>

      <ul>
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item, i) => {
            const id = `${item.group}-${item.q}`
            const isOpen = open === id
            return (
              <motion.li key={id} layout="position" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, delay: Math.min(i, 6) * 0.03, ease: EASE_OUT }} className="border-b border-line">
                <h3>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : id)} className="group flex w-full items-center gap-6 py-7 text-left md:py-9">
                    <span className="flex-1 font-display text-2xl leading-tight tracking-[-0.025em] md:text-[2.2rem]"><T>{item.q}</T></span>
                    <Plus aria-hidden="true" className={cn('size-5 shrink-0 text-paper/50 transition-transform duration-300 group-hover:text-paper', isOpen && 'rotate-45')} />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE_OUT }} className="overflow-hidden">
                      <p className="max-w-2xl pb-9 text-pretty text-lg leading-relaxed text-paper/60"><T>{item.a}</T></p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
      {items.length === 0 && <p className="py-14 text-lg text-paper/50">No answers match. Try fewer words, or ask us on the contact page.</p>}
    </div>
  )
}
