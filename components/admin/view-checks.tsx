'use client'

import { Loader2, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { More } from '@/components/admin/more'

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
    <div className="mb-8 rounded-3xl border border-line bg-black/45 px-6 py-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-72">
          <p className="text-[15px]">
            View checks{' '}
            <span className="text-mute">
              {!s ? 'loading…' : l ? `· last run ${ago(l.at)}` : '· has not run yet'}
            </span>
          </p>
          {l && (
            <p className="mt-0.5 text-[13px] text-mute">
              Looked at {l.checked}: {l.updated} went up, {l.unchanged} unchanged, {l.manual} by hand (Instagram), {l.failed} could not be read.
              {s && s.held > 0 && <span className="text-paper"> {s.held} held for a person.</span>}
            </p>
          )}
        </div>
        <button type="button" onClick={run} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-pill border border-line-strong px-4 text-sm transition-colors hover:bg-paper/10 disabled:opacity-40">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Check now
        </button>
      </div>
      {msg && <p role="status" className="mt-3 text-sm">{msg}</p>}
      <More label="How it works" className="mt-1">
        <p className="text-sm text-mute">About every two hours, the views of approved submissions on live campaigns are looked up again on YouTube and TikTok, and any increase is paid. Instagram does not allow this, so those are set by hand. A sudden jump, or a video older than its campaign, is held and listed in your notifications. The switch to pause all of this is under System, Settings.</p>
      </More>
    </div>
  )
}
