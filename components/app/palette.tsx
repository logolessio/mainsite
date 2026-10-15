'use client'

import { SITE_URL_FOR_STAFF } from '@/lib/staff-nav'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, CornerDownLeft, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon, type IconName } from '@/components/icons'
import { useTransitions } from '@/components/shell/transition-provider'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import type { AppNavItem } from './nav-types'

/** ⌘K: type to filter, arrows to move, Enter to go. */
export function Palette({ open, onClose, items, area, onLogout }: { open: boolean; onClose: () => void; items: AppNavItem[]; area: string; onLogout: () => void }) {
  const { navigate } = useTransitions()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  const rows = useMemo(() => {
    const all = [
      ...items.map((it) => ({ key: it.href, label: it.label, icon: it.icon as IconName | null, hint: area, run: () => navigate(it.href) })),
      { key: 'site', label: 'Back to the site', icon: null as IconName | null, hint: 'Go', run: () => (area === 'Owner' ? window.location.assign(SITE_URL_FOR_STAFF) : navigate('/')) },
      { key: 'out', label: 'Log out', icon: null as IconName | null, hint: 'Account', run: onLogout },
    ]
    const t = q.trim().toLowerCase()
    return t ? all.filter((r) => r.label.toLowerCase().includes(t)) : all
  }, [items, q, area, navigate, onLogout])

  useEffect(() => {
    if (open) {
      setQ('')
      setI(0)
      window.setTimeout(() => input.current?.focus(), 30)
    }
  }, [open])
  useEffect(() => setI(0), [q])

  const go = useCallback(
    (idx: number) => {
      const r = rows[idx]
      if (!r) return
      onClose()
      r.run()
    },
    [rows, onClose],
  )

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') (e.preventDefault(), setI((n) => Math.min(rows.length - 1, n + 1)))
    else if (e.key === 'ArrowUp') (e.preventDefault(), setI((n) => Math.max(0, n - 1)))
    else if (e.key === 'Enter') (e.preventDefault(), go(i))
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 px-4 pt-[16vh]" onMouseDown={onClose}>
          <motion.div
            role="dialog"
            aria-label="Jump to"
            initial={{ opacity: 0, y: -14, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={onKey}
            className="w-full max-w-lg rounded-3xl border border-line-strong bg-[#08080a] shadow-[0_40px_100px_-20px_rgb(0_0_0/0.9)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search aria-hidden="true" className="size-5 text-mute" />
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Where to?" aria-label="Where to?" className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-mute" />
              <button type="button" aria-label="Close" onClick={onClose} className="grid size-8 place-items-center rounded-full text-mute hover:bg-white/10">
                <X className="size-4" />
              </button>
            </div>
            <ul role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
              {rows.length === 0 && <li className="px-4 py-8 text-center text-sm text-mute">Nothing matches.</li>}
              {rows.map((r, idx) => (
                <li key={r.key} role="option" aria-selected={idx === i}>
                  <button type="button" onMouseMove={() => setI(idx)} onClick={() => go(idx)} className={cn('relative flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-[15px] transition-colors', idx === i ? 'text-paper' : 'text-mute')}>
                    {idx === i && <motion.span layoutId="palette-hl" transition={{ duration: 0.18, ease: EASE_OUT }} className="absolute inset-0 rounded-2xl bg-white/[0.08]" />}
                    <span className="relative grid size-5 place-items-center">{r.icon ? <Icon name={r.icon} aria-hidden="true" className="size-[18px]" /> : <ArrowUpRight className="size-[18px]" />}</span>
                    <span className="relative flex-1">{r.label}</span>
                    <span className="relative text-xs text-mute">{r.hint}</span>
                    {idx === i && <CornerDownLeft aria-hidden="true" className="relative size-4 text-mute" />}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
