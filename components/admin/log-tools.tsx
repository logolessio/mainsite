'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function CleanupLogs() {
  const router = useRouter()
  const [days, setDays] = useState('90')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-mute">Delete activity log rows older than</span>
      <input value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="h-9 w-20 rounded-full border border-line-strong bg-ink/80 px-3 text-center text-sm focus:outline-none" aria-label="Days" />
      <span className="text-sm text-mute">days</span>
      <button
        type="button"
        disabled={busy || Number(days) < 7}
        onClick={async () => {
          if (!window.confirm(`Permanently delete activity log rows older than ${days} days? The audit log is not affected. Export first if you want a copy.`)) return
          setBusy(true)
          setMsg('')
          const res = await fetch('/api/admin/logs-cleanup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ days: Number(days) }) }).catch(() => null)
          const j = (await res?.json().catch(() => ({}))) as { error?: string; deleted?: number } | undefined
          setBusy(false)
          setMsg(res?.ok ? `Deleted ${j?.deleted ?? 0} rows.` : (j?.error ?? 'Failed.'))
          router.refresh()
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-signal/50 px-4 text-xs text-signal hover:bg-signal/10 disabled:opacity-40"
      >
        {busy && <Loader2 className="size-3 animate-spin" />} Delete
      </button>
      {msg && <span className="text-xs text-mute">{msg}</span>}
    </div>
  )
}
