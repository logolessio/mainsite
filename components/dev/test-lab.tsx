'use client'

import { Check, ExternalLink, Loader2, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

export type LabItem = { id: string; label: string; body: string; href?: string }
export type LabGroup = { title: string; sub?: string; items: LabItem[] }

const KEY = 'll:test-lab'
const read = (): Record<string, boolean> => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

/**
 * Everything there is to try, in one list, with a tick for each thing you have tried. The ticks are kept in this browser. Each item opens
 * the page (or the closest page) where it can be tried, and the buttons at the top make a little made-up data to try things on.
 */
export function TestLab({ groups }: { groups: LabGroup[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [only, setOnly] = useState(false)
  const [busy, setBusy] = useState('')

  useEffect(() => setDone(read()), [])
  const flip = (id: string) =>
    setDone((d) => {
      const n = { ...d, [id]: !d[id] }
      if (!n[id]) delete n[id]
      try {
        localStorage.setItem(KEY, JSON.stringify(n))
      } catch {
        /* a private window forgets */
      }
      return n
    })
  const reset = () => {
    setDone({})
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* nothing kept */
    }
  }

  const all = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const count = all.filter((i) => done[i.id]).length

  const make = async (action: 'notify' | 'campaign-request') => {
    setBusy(action)
    try {
      const res = await fetch('/api/dev/lab', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) })
      const j = (await res.json().catch(() => ({}))) as { error?: string; message?: string; href?: string }
      if (!res.ok) throw new Error(j.error ?? 'That did not work.')
      toast.ok(j.message ?? 'Done')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'That did not work.')
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="grid gap-8">
      <div className="rounded-card border border-line-strong bg-white/[0.03] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-display text-5xl leading-none tabular-nums">
              {count}
              <span className="text-2xl text-mute">/{all.length}</span>
            </p>
            <p className="mt-2 text-sm text-mute">things tried</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setOnly((v) => !v)} aria-pressed={only} className={cn('h-10 rounded-pill border px-4 text-sm transition-colors', only ? 'border-paper bg-paper/10' : 'border-line-strong text-mute hover:text-paper')}>
              Only what is left
            </button>
            <button type="button" onClick={reset} className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm text-mute transition-colors hover:text-paper">
              <RotateCcw className="size-3.5" /> Start again
            </button>
          </div>
        </div>
        <div className="mt-5 h-1.5 overflow-hidden rounded-pill bg-white/10" role="progressbar" aria-valuenow={count} aria-valuemin={0} aria-valuemax={all.length} aria-label="Things tried">
          <div className="h-full rounded-pill bg-paper transition-[width] duration-500" style={{ width: `${all.length ? (count / all.length) * 100 : 0}%` }} />
        </div>
        <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
          <p className="mr-2 self-center text-sm text-mute">Make something to try on:</p>
          <button type="button" disabled={Boolean(busy)} onClick={() => void make('notify')} className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm transition-colors hover:bg-white/[0.06] disabled:opacity-50">
            {busy === 'notify' && <Loader2 className="size-3.5 animate-spin" />} Send me three notifications
          </button>
          <button type="button" disabled={Boolean(busy)} onClick={() => void make('campaign-request')} className="inline-flex h-10 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm transition-colors hover:bg-white/[0.06] disabled:opacity-50">
            {busy === 'campaign-request' && <Loader2 className="size-3.5 animate-spin" />} Make a campaign request to review
          </button>
        </div>
      </div>

      {groups.map((g) => {
        const items = only ? g.items.filter((i) => !done[i.id]) : g.items
        if (!items.length) return null
        const n = g.items.filter((i) => done[i.id]).length
        return (
          <section key={g.title}>
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <div>
                <h2 className="text-xl">{g.title}</h2>
                {g.sub && <p className="mt-0.5 text-sm text-mute">{g.sub}</p>}
              </div>
              <p className="shrink-0 font-mono text-xs text-mute tabular-nums">
                {n}/{g.items.length}
              </p>
            </div>
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line">
              {items.map((i) => (
                <li key={i.id} className="flex items-start gap-4 bg-black/30 px-4 py-4 sm:px-5">
                  <button type="button" role="checkbox" aria-checked={Boolean(done[i.id])} aria-label={`Tried: ${i.label}`} onClick={() => flip(i.id)} className={cn('mt-0.5 grid size-6 shrink-0 place-items-center rounded-chip border transition-colors', done[i.id] ? 'border-paper bg-paper text-ink' : 'border-line-strong hover:border-paper/60')}>
                    {done[i.id] && <Check aria-hidden="true" className="size-3.5" />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-[15px] leading-snug', done[i.id] && 'text-mute line-through decoration-white/20')}>{i.label}</p>
                    <p className="mt-0.5 text-sm leading-snug text-mute">{i.body}</p>
                  </div>
                  {i.href && (
                    <a href={i.href} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-pill border border-line-strong px-3.5 text-sm transition-colors hover:bg-white/[0.06]">
                      Open <ExternalLink aria-hidden="true" className="size-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
