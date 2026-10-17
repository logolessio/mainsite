'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, LayoutGrid, Rows3, Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'
import { Badge, type Column, DataTable } from './table'

export type SubmissionRow = {
  id: string
  campaign: string
  platform: string
  url: string
  status: 'pending' | 'approved' | 'rejected'
  views: number
  earned: number
  submittedAt: string
}

const TONE = { approved: 'good', rejected: 'bad', pending: 'warn' } as const
type Filter = 'all' | SubmissionRow['status']
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'Approved' },
  { id: 'pending', label: 'In review' },
  { id: 'rejected', label: 'Rejected' },
]
const usd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const cols: Column<SubmissionRow>[] = [
  { key: 'c', header: 'Campaign', render: (r) => r.campaign },
  { key: 'p', header: 'Platform', render: (r) => r.platform },
  {
    key: 'l',
    header: 'Link',
    render: (r) => (
      <a href={r.url} rel="noopener noreferrer nofollow" className="underline underline-offset-4 hover:text-paper" target="_blank">
        Open
      </a>
    ),
  },
  { key: 's', header: 'Status', render: (r) => <Badge tone={TONE[r.status]}>{r.status}</Badge> },
  { key: 'v', header: 'Verified views', render: (r) => r.views.toLocaleString(), className: 'text-right' },
  { key: 'e', header: 'Earned', render: (r) => usd(r.earned), className: 'text-right' },
]

type Sort = 'new' | 'views' | 'earned'
const SORTS: { id: Sort; label: string }[] = [
  { id: 'new', label: 'Newest' },
  { id: 'views', label: 'Most views' },
  { id: 'earned', label: 'Most earned' },
]

/** What you chose last time is what you see this time: the filter, the sort and cards or table. */
const remembered = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  try {
    const v = window.localStorage.getItem(key)
    return allowed.includes(v as T) ? (v as T) : fallback
  } catch {
    return fallback
  }
}
const remember = (key: string, v: string) => {
  try {
    window.localStorage.setItem(key, v)
  } catch {
    /* a private window just forgets */
  }
}

/** Every clip, with filters, search, a sort, and a switch between cards and a table. Your choices are remembered. */
export function SubmissionsTable({ rows, empty }: { rows: SubmissionRow[]; empty: React.ReactNode }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [view, setView] = useState<'cards' | 'table'>('cards')
  const [sort, setSort] = useState<Sort>('new')
  useEffect(() => {
    setFilter(remembered('ll:subs:filter', FILTERS.map((f) => f.id), 'all'))
    setView(remembered('ll:subs:view', ['cards', 'table'] as const, 'cards'))
    setSort(remembered('ll:subs:sort', SORTS.map((x) => x.id), 'new'))
  }, [])
  const pick = <T extends string>(key: string, set: (v: T) => void) => (v: T) => (set(v), remember(key, v))

  const counts = useMemo(() => ({ all: rows.length, approved: rows.filter((r) => r.status === 'approved').length, pending: rows.filter((r) => r.status === 'pending').length, rejected: rows.filter((r) => r.status === 'rejected').length }), [rows])
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    const list = rows.filter((r) => (filter === 'all' || r.status === filter) && (!t || r.campaign.toLowerCase().includes(t) || r.platform.toLowerCase().includes(t)))
    return sort === 'views' ? [...list].sort((a, b) => b.views - a.views) : sort === 'earned' ? [...list].sort((a, b) => b.earned - a.earned) : list
  }, [rows, filter, q, sort])
  const views = rows.reduce((s, r) => s + r.views, 0)
  const earned = rows.reduce((s, r) => s + r.earned, 0)

  if (rows.length === 0) return <div className="rounded-3xl border border-line bg-black/45">{empty}</div>

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Clips', value: String(rows.length), note: `${counts.approved} approved` },
          { label: 'In review', value: String(counts.pending), note: 'Waiting on checks' },
          { label: 'Verified views', value: views.toLocaleString(), note: 'Across all clips' },
          { label: 'Earned', value: usd(earned), note: 'From these clips' },
        ].map((t) => (
          <div key={t.label} className="rounded-3xl border border-line bg-black/45 p-6">
            <p className="text-sm text-mute">{t.label}</p>
            <p className="mt-3 font-display text-4xl leading-none font-medium tracking-tight tabular-nums">{t.value}</p>
            <p className="mt-3 text-xs text-mute">{t.note}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="tablist" aria-label="Filter clips" className="glass-liquid inline-flex w-fit flex-wrap rounded-full p-1">
          {FILTERS.map((f) => (
            <button key={f.id} role="tab" type="button" aria-selected={filter === f.id} tabIndex={filter === f.id ? 0 : -1} onClick={() => pick<Filter>('ll:subs:filter', setFilter)(f.id)} className="relative h-9 rounded-full px-4 text-sm">
              {filter === f.id && <motion.span layoutId="clip-filter" transition={{ duration: 0.3, ease: EASE_OUT }} className="absolute inset-0 rounded-full bg-paper" />}
              <span className={cn('relative transition-colors', filter === f.id ? 'text-ink' : 'text-mute hover:text-paper')}>
                {f.label} <span className="tabular-nums opacity-60">{counts[f.id]}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label className="glass-liquid relative block flex-1 rounded-full md:w-60 md:flex-none">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-mute" />
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && setQ('')} type="search" enterKeyHint="search" placeholder="Search submissions" aria-label="Search submissions" className="h-10 w-full rounded-full bg-transparent pr-9 pl-10 text-sm outline-none placeholder:text-mute [&::-webkit-search-cancel-button]:hidden" />
            {q && (
              <button type="button" aria-label="Clear search" onClick={() => setQ('')} className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-mute hover:text-paper">
                <X aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </label>
          <label className="glass-liquid relative inline-grid h-10 cursor-pointer items-center rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-paper/60">
            <span className="sr-only">Sort by</span>
            <span aria-hidden="true" className="px-4 text-sm whitespace-nowrap text-mute">
              {SORTS.find((x) => x.id === sort)?.label}
            </span>
            <select value={sort} onChange={(e) => pick<Sort>('ll:subs:sort', setSort)(e.target.value as Sort)} className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0 focus:outline-none">
              {SORTS.map((x) => (
                <option key={x.id} value={x.id} className="bg-ink">
                  {x.label}
                </option>
              ))}
            </select>
          </label>
          <div className="glass-liquid inline-flex rounded-full p-1">
            {([['cards', LayoutGrid, 'Cards'], ['table', Rows3, 'Table']] as const).map(([id, Ico, label]) => (
              <button key={id} type="button" aria-label={label} aria-pressed={view === id} onClick={() => pick<'cards' | 'table'>('ll:subs:view', setView)(id)} className={cn('grid size-8 place-items-center rounded-full transition-colors', view === id ? 'bg-paper text-ink' : 'text-mute hover:text-paper')}>
                <Ico className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <p role="status" className="sr-only">{shown.length} of {rows.length} shown</p>
      <div className="mt-6">
        {view === 'table' ? (
          <DataTable columns={cols} rows={shown} empty={<div className="px-6 py-12 text-center text-mute">No clips match.</div>} />
        ) : shown.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center text-mute">No clips match. Try another filter or search.</div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence initial={false} mode="popLayout">
              {shown.map((r, i) => (
                <motion.li key={r.id} data-kb-row layout="position" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.45, delay: Math.min(i, 8) * 0.035, ease: EASE_OUT }} whileHover={{ y: -3 }} className="group flex flex-col rounded-3xl border border-line bg-black/45 p-6 transition-colors hover:border-line-strong">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-mute">{r.platform}</span>
                    <Badge tone={TONE[r.status]}>{r.status === 'pending' ? 'in review' : r.status}</Badge>
                  </div>
                  <h2 className="mt-5 line-clamp-2 min-h-[3.2rem] text-lg leading-snug font-medium tracking-tight">{r.campaign}</h2>
                  <p className="mt-1 text-xs text-mute">Submitted {r.submittedAt}</p>
                  <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5">
                    <div>
                      <dt className="text-xs text-mute">Verified views</dt>
                      <dd className="mt-1 font-display text-2xl leading-none font-medium tabular-nums">{r.views.toLocaleString()}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-mute">Earned</dt>
                      <dd className="mt-1 font-display text-2xl leading-none font-medium tabular-nums">{usd(r.earned)}</dd>
                    </div>
                  </dl>
                  <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" data-key="o" data-key-label="Open the clip" aria-keyshortcuts="o" className="mt-6 inline-flex items-center gap-1.5 text-sm text-mute transition-colors group-hover:text-paper">
                    Open the clip <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </a>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  )
}
