'use client'

import { SITE_URL_FOR_STAFF } from '@/lib/staff-nav'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Clock, CornerDownLeft, LogOut, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon, type IconName } from '@/components/icons'
import { useDialog } from '@/hooks/use-dialog'
import { useTransitions } from '@/components/shell/transition-provider'
import { EASE_OUT, SPRING_POP } from '@/lib/layout'
import { toast } from '@/lib/toast'
import { type QuickAction, actionsFor, scoreOf } from '@/lib/quick-actions'
import { cn } from '@/lib/utils'
import type { AppNavItem } from './nav-types'

type Row = { key: string; group: 'Recent' | 'Do' | 'Go to' | 'Campaigns'; label: string; icon: IconName | null; hint: string; keys: string; kbd?: string; cover?: string; run: () => void }
type Camp = { id: string; title: string; creator: string; type: string; cover: string; rate: number }

/**
 * ⌘K or /: one box for everything. With nothing typed it shows where you were last and the things people do most; typing finds a page
 * or an action ("with" finds Withdraw, "fund" finds Add funds). Arrows move, Enter goes, Esc closes.
 */
export function Palette({ open, onClose, items, area, onLogout, recents, handle, onHelp }: { open: boolean; onClose: () => void; items: AppNavItem[]; area: string; onLogout: () => void; recents: string[]; handle?: string; onHelp: () => void }) {
  const { navigate } = useTransitions()
  const [q, setQ] = useState('')
  const [i, setI] = useState(0)
  const [note, setNote] = useState('')
  const [camps, setCamps] = useState<Camp[] | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const box = useDialog<HTMLDivElement>(open, onClose, { initial: 'none' })

  const rows = useMemo<Row[]>(() => {
    const byHref = new Map(items.map((it, n) => [it.href, { it, n }]))
    const act = (a: QuickAction): Row => ({
      key: `a:${a.id}`,
      group: 'Do',
      label: a.label,
      icon: a.icon,
      hint: a.hint,
      keys: a.keys,
      run: () => {
        if (a.run === 'help') return onHelp()
        if (a.run === 'profile-link') {
          if (!handle) return
          void navigator.clipboard?.writeText(`${window.location.origin}/@${handle}`).catch(() => {})
          toast.ok('Profile link copied')
          return setNote('Profile link copied')
        }
        if (a.href) a.href.startsWith('http') ? window.location.assign(a.href) : navigate(a.href)
      },
    })
    const pages: Row[] = items.map((it, n) => ({ key: `p:${it.href}`, group: 'Go to', label: it.label, icon: it.icon as IconName, hint: n < 9 ? `g ${n + 1}` : '', keys: it.section ?? '', run: () => navigate(it.href) }))
    const recent: Row[] = recents
      .map((h) => byHref.get(h))
      .filter((x): x is { it: AppNavItem; n: number } => Boolean(x))
      .slice(0, 3)
      .map(({ it }) => ({ key: `r:${it.href}`, group: 'Recent', label: it.label, icon: 'Compass' as IconName, hint: 'Recent', keys: '', run: () => navigate(it.href) }))
    const tail: Row[] = [
      { key: 'site', group: 'Go to', label: 'Back to the site', icon: null, hint: '', keys: 'home public website', run: () => (area === 'Owner' ? window.location.assign(SITE_URL_FOR_STAFF) : navigate('/')) },
      { key: 'out', group: 'Go to', label: 'Log out', icon: null, hint: '', keys: 'sign out leave', run: onLogout },
    ]
    const all = [...actionsFor(area).map(act), ...pages, ...tail]
    const t = q.trim()
    if (!t) return [...recent, ...all]
    const found: Row[] = (camps ?? [])
      .map((c) => ({ c, s: scoreOf(`${c.title} ${c.creator} ${c.type}`, t) }))
      .filter((x) => x.s > 0 && t.length >= 2)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5)
      .map(({ c }) => ({ key: `c:${c.id}`, group: 'Campaigns' as const, label: c.title, icon: null, hint: `$${c.rate.toFixed(2)} per 1k`, keys: '', cover: c.cover, run: () => navigate(`/campaign/${c.id}`) }))
    const search: Row[] =
      area === 'Owner' && t.length >= 2
        ? [
            { key: 'sp', group: 'Do', label: `Find “${t}” in People`, icon: 'Users', hint: '', keys: t, run: () => navigate(`/admin/people?q=${encodeURIComponent(t)}`) },
            { key: 'st', group: 'Do', label: `Find “${t}” in the site text`, icon: 'FileCheck2', hint: '', keys: t, run: () => navigate(`/admin/text?q=${encodeURIComponent(t)}`) },
          ]
        : []
    const hits = all
      .map((r) => ({ r, s: scoreOf(`${r.label} ${r.keys}`, t) }))
      .filter((x) => x.s > 0) // only what matches; the small bonus below just puts actions ahead of pages on a tie
      .map((x) => ({ ...x, s: x.s + (x.r.group === 'Do' ? 0.5 : 0) }))
      .sort((a, b) => b.s - a.s)
      .map((x) => x.r)
    return [...hits, ...found, ...search]
  }, [items, q, area, navigate, onLogout, recents, handle, onHelp, camps])

  useEffect(() => {
    if (open && camps === null) fetch('/api/search').then((r) => r.json()).then((j: { campaigns?: Camp[] }) => setCamps(j.campaigns ?? [])).catch(() => setCamps([]))
    if (open) {
      setQ('')
      setI(0)
      setNote('')
      window.setTimeout(() => input.current?.focus(), 30)
    }
  }, [open])
  useEffect(() => setI(0), [q])
  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(() => (setNote(''), onClose()), 900)
    return () => window.clearTimeout(t)
  }, [note, onClose])

  const go = useCallback(
    (idx: number) => {
      const r = rows[idx]
      if (!r) return
      const copies = r.key === 'a:share'
      if (!copies) onClose()
      r.run()
    },
    [rows, onClose],
  )

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') (e.preventDefault(), setI((n) => Math.min(rows.length - 1, n + 1)))
    else if (e.key === 'ArrowUp') (e.preventDefault(), setI((n) => Math.max(0, n - 1)))
    else if (e.key === 'Home') (e.preventDefault(), setI(0))
    else if (e.key === 'End') (e.preventDefault(), setI(rows.length - 1))
    else if (e.key === 'Enter') (e.preventDefault(), go(i))
  }

  // keep the highlighted row in view while arrowing through a long list
  useEffect(() => {
    document.getElementById(`pal-${i}`)?.scrollIntoView({ block: 'nearest' })
  }, [i])

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-[70] flex items-start justify-center bg-black/60 px-4 pt-[12vh] md:pt-[16vh]" onMouseDown={onClose}>
          <motion.div
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-label="Search or jump"
            initial={{ opacity: 0, y: -18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.14 } }}
            transition={SPRING_POP}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={onKey}
            className="w-full max-w-lg rounded-3xl border border-line-strong bg-[#08080a] shadow-[0_40px_100px_-20px_rgb(0_0_0/0.9)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-5">
              <Search aria-hidden="true" className="size-5 text-mute" />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type a page or something to do"
                aria-label="Search or jump"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-list"
                aria-activedescendant={rows[i] ? `pal-${i}` : undefined}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="go"
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-mute"
              />
              <button type="button" aria-label="Close" onClick={onClose} className="grid size-8 place-items-center rounded-full text-mute hover:bg-white/10">
                <X className="size-4" />
              </button>
            </div>
            <ul id="palette-list" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
              {rows.length === 0 && <li className="px-4 py-8 text-center text-sm text-mute">Nothing matches. Try fewer letters.</li>}
              {rows.map((r, idx) => (
                <li key={r.key} role="presentation">
                  {!q.trim() && r.group !== rows[idx - 1]?.group && <p className="px-4 pt-3 pb-1.5 text-xs text-mute">{r.group === 'Do' ? 'Quick actions' : r.group === 'Recent' ? 'Recent' : 'Pages'}</p>}
                  <button id={`pal-${idx}`} role="option" aria-selected={idx === i} type="button" onMouseMove={() => i !== idx && setI(idx)} onClick={() => go(idx)} className={cn('relative flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-[15px] transition-colors', idx === i ? 'text-paper' : 'text-paper/65')}>
                    {idx === i && <motion.span layoutId="palette-hl" transition={{ duration: 0.18, ease: EASE_OUT }} className="absolute inset-0 rounded-2xl bg-white/[0.08]" />}
                    <span className="relative grid size-5 place-items-center">{r.cover ? <img src={r.cover} alt="" className="size-7 rounded-md object-cover" /> : r.group === 'Recent' ? <Clock aria-hidden="true" className="size-[18px]" /> : r.icon ? <Icon name={r.icon} aria-hidden="true" className="size-[18px]" /> : r.key === 'out' ? <LogOut className="size-[18px]" /> : <ArrowUpRight className="size-[18px]" />}</span>
                    <span className="relative flex-1">{r.label}</span>
                    {r.hint && r.hint !== 'Do' && r.hint !== 'Recent' && <span className="relative rounded-md border border-line px-1.5 py-0.5 font-mono text-[11px] text-mute">{r.hint}</span>}
                    {idx === i && <CornerDownLeft aria-hidden="true" className="relative size-4 text-mute" />}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-mute" aria-live="polite">
              <span>{note || 'Enter to go · Esc to close'}</span>
              <span className="hidden sm:inline">
                <kbd className="rounded border border-line px-1 font-mono">↑</kbd> <kbd className="rounded border border-line px-1 font-mono">↓</kbd> to move
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
