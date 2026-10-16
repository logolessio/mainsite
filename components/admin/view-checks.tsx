'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/app/ui'

type Summary = { at: number; checked: number; updated: number; unchanged: number; flagged: number; failed: number; manual: number; skipped?: string }
type State = { last: Summary | null; due: number; held: number }

const ago = (at: number) => {
  const m = Math.max(0, Math.round((Date.now() / 1000 - at) / 60))
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`
}

/** The two-hourly look at the views of live submissions: when it last ran, what it found, and a button to run it now. */
export function ViewChecks() {
  const [s, setS] = useState<State | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const load = useCallback(() => {
    fetch('/api/admin/views', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: State | null) => setS(j))
      .catch(() => setS(null))
  }, [])
  useEffect(load, [load])
  const run = async () => {
    setBusy(true)
    setMsg('')
    const res = await fetch('/api/admin/views', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as Partial<Summary> & { error?: string }
    setBusy(false)
    if (!res?.ok) return setMsg(j.error ?? 'Could not run it.')
    setMsg(`Looked at ${j.checked}: ${j.updated} went up, ${j.flagged} held for a person, ${j.failed} could not be read.`)
    load()
  }
  const l = s?.last
  return (
    <Card
      title="View checks"
      sub="About every two hours, the views of approved submissions on live campaigns are looked up again on YouTube and TikTok, and any increase is paid. Instagram does not allow this, so those are set by hand."
      action={
        <button type="button" onClick={run} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong px-4 text-sm transition-colors hover:bg-paper/10 disabled:opacity-40">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Check now
        </button>
      }
      className="mb-8"
    >
      {!s ? (
        <p className="text-sm text-mute">Loading…</p>
      ) : (
        <p className="text-sm text-mute">
          {l ? (
            <>
              Last run {ago(l.at)}: looked at {l.checked}, {l.updated} went up, {l.unchanged} unchanged, {l.manual} by hand (Instagram), {l.failed} could not be read.
            </>
          ) : (
            'It has not run yet.'
          )}{' '}
          {s.held > 0 && <span className="text-paper">{s.held} held for a person (an unusual jump, or a video older than its campaign). They are listed in your notifications.</span>}
        </p>
      )}
      {msg && <p role="status" className="mt-3 text-sm">{msg}</p>}
    </Card>
  )
}
