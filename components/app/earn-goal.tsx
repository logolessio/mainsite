'use client'

import { useEffect, useState } from 'react'
import { useFeature } from '@/components/shell/features-provider'
import { ActionButton, Card } from './ui'

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

/** A private goal for the month: set an amount and watch the bar fill as earnings arrive. */
export function EarnGoal() {
  const on = useFeature('earn-goal')
  const [data, setData] = useState<{ goal: number | null; earned: number } | null>(null)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!on) return
    fetch('/api/me/goal', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { goal: number | null; earned: number } | null) => setData(j))
      .catch(() => {})
  }, [on])
  if (!on || !data) return null

  const save = async (dollars: number | null) => {
    setBusy(true)
    setError('')
    const res = await fetch('/api/me/goal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ dollars }) }).catch(() => null)
    setBusy(false)
    if (!res?.ok) return setError('Could not save that. Try again.')
    setData({ ...data, goal: dollars && dollars > 0 ? Math.round(dollars * 100) : null })
    setEditing(false)
  }

  const pct = data.goal ? Math.min(100, Math.round((data.earned / data.goal) * 100)) : 0
  return (
    <Card title="Goal for this month" sub="Only you can see this." className="mt-12">
      {data.goal && !editing ? (
        <div className="grid gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-display text-4xl leading-none tracking-[-0.04em] tabular-nums">
              {usd(data.earned)}
              <span className="text-paper/35"> / {usd(data.goal)}</span>
            </p>
            <p className="text-[15px] text-paper/55 tabular-nums">{pct >= 100 ? 'Goal reached' : `${pct}%`}</p>
          </div>
          <div className="h-2 overflow-hidden rounded-pill bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progress to your goal">
            <div className="h-full rounded-pill bg-paper transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex gap-2">
            <ActionButton type="button" variant="ghost" onClick={() => (setValue(String(data.goal! / 100)), setEditing(true))}>Change</ActionButton>
            <ActionButton type="button" variant="ghost" disabled={busy} onClick={() => save(null)}>Clear</ActionButton>
          </div>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const n = Number(value)
            if (!Number.isFinite(n) || n <= 0) return setError('Enter an amount in dollars.')
            void save(n)
          }}
          className="flex flex-wrap items-center gap-3"
        >
          <label className="relative block">
            <span className="sr-only">Goal in dollars</span>
            <span aria-hidden="true" className="absolute top-1/2 left-4 -translate-y-1/2 text-paper/50">$</span>
            <input value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, '').slice(0, 9))} inputMode="decimal" placeholder="500" className="h-11 w-40 rounded-pill border border-line-strong bg-transparent pr-4 pl-8 text-[15px] focus:border-paper/60 focus:outline-none" />
          </label>
          <ActionButton type="submit" disabled={busy}>Set goal</ActionButton>
          {editing && <ActionButton type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</ActionButton>}
          {error && <p role="alert" className="w-full text-sm text-red-500">{error}</p>}
        </form>
      )}
    </Card>
  )
}
