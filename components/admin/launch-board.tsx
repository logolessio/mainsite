'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowUpRight, Check, ChevronDown, Circle, Loader2, RefreshCw, Rocket } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Badge } from '@/components/app/table'
import { Card } from '@/components/app/ui'
import { when } from '@/lib/format'
import type { Group, Item, Level, Readiness } from '@/lib/launch-readiness'
import { EASE_OUT } from '@/lib/layout'
import { cn } from '@/lib/utils'

const GROUPS: Group[] = ['Payments and payouts', 'Sign-in and accounts', 'Database and safety', 'Content and look', 'Running the business']
const LEVEL: Record<Level, { label: string; tone: 'bad' | 'warn' | 'neutral' }> = {
  blocker: { label: 'Must do before launch', tone: 'bad' },
  should: { label: 'Should do', tone: 'warn' },
  nice: { label: 'Nice to have', tone: 'neutral' },
}
const VERDICT = {
  'not-ready': { title: 'Not ready to launch yet', line: (n: number) => `${n} must-do thing${n === 1 ? '' : 's'} left. Everything marked “Must do” has to be finished first.` },
  almost: { title: 'Almost there', line: () => 'Every must-do is finished. Tidy up the “should do” list and you can go.' },
  ready: { title: 'Ready to launch', line: () => 'Everything important is done. Go and send those artist links.' },
} as const
const FILTERS = [
  { id: 'todo', label: 'Still to do' },
  { id: 'blocker', label: 'Must-dos' },
  { id: 'done', label: 'Done' },
  { id: 'all', label: 'Everything' },
] as const

function Ring({ percent, tone }: { percent: number; tone: string }) {
  const r = 84
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-52 shrink-0">
      <svg viewBox="0 0 200 200" className="size-full -rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-white/10" />
        <motion.circle cx="100" cy="100" r={r} fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - percent / 100) }} transition={{ duration: 1.4, ease: EASE_OUT }} className={tone} stroke="currentColor" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-display text-6xl font-medium tabular-nums">{percent}<span className="text-3xl text-mute">%</span></p>
          <p className="font-mono text-[11px] tracking-wide text-mute uppercase">ready</p>
        </div>
      </div>
    </div>
  )
}

function StateIcon({ s }: { s: Item['state'] }) {
  if (s === 'done') return <span className="grid size-7 shrink-0 place-items-center rounded-pill bg-emerald-400/15 text-emerald-300"><Check className="size-4" /></span>
  if (s === 'warn') return <span className="grid size-7 shrink-0 place-items-center rounded-pill bg-amber-300/15 text-amber-300"><AlertTriangle className="size-4" /></span>
  return <span className="grid size-7 shrink-0 place-items-center rounded-pill border border-line-strong text-mute"><Circle className="size-3" /></span>
}

export function LaunchBoard({ r }: { r: Readiness }) {
  const router = useRouter()
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('todo')
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const shown = useMemo(
    () =>
      r.items.filter((i) => (filter === 'all' ? true : filter === 'done' ? i.state === 'done' : filter === 'blocker' ? i.level === 'blocker' && i.state !== 'done' : i.state !== 'done')),
    [r.items, filter],
  )
  const next = r.items
    .filter((i) => i.level === 'blocker' && i.state !== 'done')
    .sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group))
    .slice(0, 5)
  const v = VERDICT[r.verdict]
  const tone = r.verdict === 'ready' ? 'text-emerald-400' : r.verdict === 'almost' ? 'text-amber-300' : 'text-paper'

  const toggle = async (i: Item) => {
    setBusy(i.id)
    setError('')
    const res = await fetch('/api/admin/launch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: i.id, done: i.state !== 'done' }) }).catch(() => null)
    setBusy(null)
    if (!res?.ok) return setError(((await res?.json().catch(() => ({}))) as { error?: string })?.error ?? 'Could not save that.')
    router.refresh()
  }
  const recheck = () => {
    setRefreshing(true)
    router.refresh()
    window.setTimeout(() => setRefreshing(false), 900)
  }
  const jump = (id: string) => {
    setFilter('all')
    setOpen(id)
    window.setTimeout(() => document.getElementById(`item-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120)
  }

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE_OUT }} className="relative mb-8 overflow-hidden rounded-[calc(2rem*var(--round,1))] border border-line-strong bg-black/45 p-6 md:p-10">
        <div aria-hidden="true" className="pointer-events-none absolute -top-1/2 -right-1/4 size-[40rem] rounded-pill bg-[radial-gradient(closest-side,rgb(243_242_238/0.09),transparent)]" />
        <div className="relative flex flex-col items-center gap-8 md:flex-row md:items-center md:gap-12">
          <Ring percent={r.percent} tone={tone} />
          <div className="min-w-0 flex-1 text-center md:text-left">
            <p className="inline-flex items-center gap-2 font-mono text-xs tracking-wide text-mute uppercase"><Rocket className="size-4" /> Launch readiness</p>
            <h1 className="mt-3 font-display text-4xl leading-tight font-medium tracking-tight md:text-5xl">{v.title}</h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-mute">{v.line(r.blockersLeft)}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
              <Badge tone="good">{r.counts.done} done</Badge>
              {r.counts.warn > 0 && <Badge tone="warn">{r.counts.warn} to check</Badge>}
              <Badge tone={r.counts.todo ? 'bad' : 'neutral'}>{r.counts.todo} to do</Badge>
              <button type="button" onClick={recheck} className="inline-flex h-7 items-center gap-1.5 rounded-pill border border-line-strong px-3 text-xs text-mute transition-colors hover:text-paper">
                <RefreshCw className={cn('size-3', refreshing && 'animate-spin')} /> Check again
              </button>
              <span className="self-center text-xs text-mute">Checked {when(r.checkedAt)}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {next.length > 0 && (
        <Card title="Do these next" sub="The must-dos still open, in order. Click one to see exactly how.">
          <ol className="grid gap-2">
            {next.map((i, n) => (
              <li key={i.id}>
                <button type="button" onClick={() => jump(i.id)} className="group flex w-full items-center gap-4 rounded-2xl border border-line bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-paper/40 hover:bg-white/[0.05]">
                  <span className="grid size-7 shrink-0 place-items-center rounded-pill bg-paper font-mono text-xs text-ink">{n + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px]">{i.title}</span>
                    {i.detail && <span className="block truncate text-xs text-mute">{i.detail}</span>}
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-mute transition-transform group-hover:translate-y-0.5" />
                </button>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)} aria-pressed={filter === f.id} className={cn('inline-flex h-9 items-center rounded-pill border px-4 text-sm transition-colors', filter === f.id ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
            {f.label}
          </button>
        ))}
        {error && <span role="alert" className="text-sm text-signal">{error}</span>}
      </div>

      <div className="mt-6 grid gap-8">
        {GROUPS.map((g) => {
          const all = r.items.filter((i) => i.group === g)
          const list = shown.filter((i) => i.group === g)
          if (!list.length) return null
          const done = all.filter((i) => i.state === 'done').length
          return (
            <section key={g}>
              <div className="mb-3 flex items-end justify-between gap-4">
                <h2 className="font-display text-2xl md:text-3xl">{g}</h2>
                <div className="flex items-center gap-3 text-sm text-mute">
                  {done}/{all.length}
                  <span className="hidden h-1.5 w-28 overflow-hidden rounded-pill bg-white/10 sm:block"><span className="block h-full rounded-pill bg-paper transition-[width] duration-700" style={{ width: `${(done / all.length) * 100}%` }} /></span>
                </div>
              </div>
              <ul className="overflow-hidden rounded-3xl border border-line bg-black/45">
                {list.map((i) => {
                  const isOpen = open === i.id
                  const expandable = Boolean(i.how?.length || i.href || i.manual)
                  return (
                    <li id={`item-${i.id}`} key={i.id} className="border-b border-line last:border-b-0">
                      <button type="button" onClick={() => expandable && setOpen(isOpen ? null : i.id)} aria-expanded={isOpen} className={cn('flex w-full items-start gap-4 px-5 py-4 text-left transition-colors', expandable && 'hover:bg-white/[0.025]')}>
                        <StateIcon s={i.state} />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className={cn('text-[15px]', i.state === 'done' && 'text-mute')}>{i.title}</span>
                            {i.state !== 'done' && <Badge tone={LEVEL[i.level].tone}>{LEVEL[i.level].label}</Badge>}
                            {i.manual && i.state !== 'done' && <Badge>you confirm this</Badge>}
                          </span>
                          {i.detail && <span className="mt-0.5 block text-xs text-mute">{i.detail}</span>}
                        </span>
                        {expandable && <ChevronDown className={cn('mt-1 size-4 shrink-0 text-mute transition-transform duration-300', isOpen && 'rotate-180')} />}
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE_OUT }} className="overflow-hidden">
                            <div className="grid gap-4 px-5 pb-5 pl-16">
                              <p className="text-sm leading-relaxed text-mute"><span className="text-paper">Why it matters: </span>{i.why}</p>
                              {i.how && (
                                <ol className="grid gap-2 text-sm text-mute">
                                  {i.how.map((h, n) => (
                                    <li key={n} className="flex gap-3">
                                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-pill border border-line-strong font-mono text-[10px]">{n + 1}</span>
                                      <span>{h}</span>
                                    </li>
                                  ))}
                                </ol>
                              )}
                              <div className="flex flex-wrap gap-2">
                                {i.href && (
                                  <a href={i.href} className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-line-strong px-4 text-xs transition-colors hover:bg-white/10">
                                    {i.hrefLabel ?? 'Open'} <ArrowUpRight className="size-3.5" />
                                  </a>
                                )}
                                {i.manual && (
                                  <button type="button" disabled={busy === i.id} onClick={() => toggle(i)} className={cn('inline-flex h-9 items-center gap-1.5 rounded-pill px-4 text-xs font-medium transition-colors disabled:opacity-50', i.state === 'done' ? 'border border-line-strong text-mute hover:text-paper' : 'bg-paper text-ink hover:bg-paper/85')}>
                                    {busy === i.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                                    {i.state === 'done' ? 'Mark as not done' : 'I have done this'}
                                  </button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
        {shown.length === 0 && (
          <Card>
            <p className="text-sm text-mute">{filter === 'todo' || filter === 'blocker' ? 'Nothing left here. Nicely done.' : 'Nothing to show.'}</p>
          </Card>
        )}
      </div>
    </>
  )
}
