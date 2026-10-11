'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { FAQ } from '@/lib/faq'
import { EASE_OUT } from '@/lib/layout'
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
    <div className="mx-auto max-w-3xl text-center">
      <div className="flex flex-col items-center gap-5">
        <div role="tablist" aria-label="FAQ audience" className="relative inline-flex rounded-2xl border border-line-strong p-1">
          {(['All', ...groups] as Tab[]).map((t) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className="relative h-11 rounded-xl px-6 text-sm">
              {tab === t && <motion.span layoutId="faq-pill" transition={{ duration: 0.35, ease: EASE_OUT }} className="absolute inset-0 rounded-xl bg-paper" />}
              <span className={cn('relative transition-colors', tab === t ? 'text-ink' : 'text-mute hover:text-paper')}>{t}</span>
            </button>
          ))}
        </div>
        <label className="relative block w-full max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-5 size-4 -translate-y-1/2 text-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the questions" aria-label="Search the questions" className="h-12 w-full rounded-full border border-line-strong bg-transparent pr-5 pl-12 text-sm outline-none placeholder:text-mute focus:border-paper/50" />
        </label>
        <p className="font-mono text-xs text-mute" aria-live="polite">
          {items.length} {items.length === 1 ? 'answer' : 'answers'}
        </p>
      </div>

      <ul className="mt-10 border-t border-line">
        <AnimatePresence initial={false} mode="popLayout">
          {items.map((item, i) => {
            const id = `${item.group}-${item.q}`
            const isOpen = open === id
            return (
              <motion.li key={id} layout="position" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, delay: Math.min(i, 6) * 0.03, ease: EASE_OUT }} className="border-b border-line">
                <h3>
                  <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : id)} className="group flex w-full items-center gap-5 py-7 text-left md:gap-8 md:py-9">
                    <span className="font-mono text-xs text-mute tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                    <span className={cn('flex-1 font-display text-2xl leading-tight transition-transform duration-500 md:text-4xl', isOpen ? 'translate-x-1' : 'group-hover:translate-x-1.5')}><T>{item.q}</T></span>
                    {tab === 'All' && <span className="hidden font-mono text-[11px] text-mute md:block">{item.group}</span>}
                    <Plus aria-hidden="true" className={cn('size-5 shrink-0 transition-transform duration-300', isOpen && 'rotate-45')} />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: EASE_OUT }} className="overflow-hidden">
                      <p className="max-w-xl pb-9 pl-[2.6rem] text-pretty text-left leading-snug text-mute md:pl-[4.2rem]"><T>{item.a}</T></p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            )
          })}
        </AnimatePresence>
      </ul>
      {items.length === 0 && <p className="py-14 text-mute">No answers match. Try fewer words, or ask us on the contact page.</p>}
    </div>
  )
}
