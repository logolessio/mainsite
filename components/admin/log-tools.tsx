'use client'

import { askAdminSecret } from './secret-dialog'
import { askConfirm } from './confirm-dialog'
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
      <input value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="h-9 w-20 rounded-pill border border-line-strong bg-ink/80 px-3 text-center text-sm focus:outline-none" aria-label="Days" />
      <span className="text-sm text-mute">days</span>
      <button
        type="button"
        disabled={busy || Number(days) < 7}
        onClick={async () => {
          if (!(await askConfirm({ title: `Delete activity older than ${days} days?`, summary: ['Removes old rows from the activity log for good.', 'The audit log (who did what) is not touched.', 'Export first if you want a copy. Only the owner can do this.'], word: 'DELETE', action: 'Delete old rows' }))) return
          const secret = await askAdminSecret('Deleting logs cannot be undone.')
          if (!secret) return
          setBusy(true)
          setMsg('')
          const res = await fetch('/api/admin/logs-cleanup', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ days: Number(days), secret }) }).catch(() => null)
          const j = (await res?.json().catch(() => ({}))) as { error?: string; deleted?: number } | undefined
          setBusy(false)
          setMsg(res?.ok ? `Deleted ${j?.deleted ?? 0} rows.` : (j?.error ?? 'Failed.'))
          router.refresh()
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-signal/50 px-4 text-xs text-signal hover:bg-signal/10 disabled:opacity-40"
      >
        {busy && <Loader2 className="size-3 animate-spin" />} Delete
      </button>
      {msg && <span className="text-xs text-mute">{msg}</span>}
    </div>
  )
}
