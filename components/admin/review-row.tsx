'use client'

import { askConfirm } from './confirm-dialog'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AdminButton } from './ui'

/** One clip: open it, type what the verified views are, approve (and pay) or reject. */
export function ReviewControls({ id, status, views, rateCents }: { id: string; status: string; views: number; rateCents: number }) {
  const router = useRouter()
  const [v, setV] = useState(String(views))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const n = Number(v.replace(/[, ]/g, ''))
  const delta = Number.isFinite(n) ? Math.max(0, n - views) : 0
  const gross = Math.floor((delta * rateCents) / 1000)

  const send = async (action: 'approve' | 'views') => {
    if (!Number.isInteger(n) || n < 0) return setMsg('Enter a whole number of views.')
    if (gross > 0 && !(await askConfirm({ title: `Pay $${(gross / 100).toFixed(2)} for these views?`, summary: [`${delta.toLocaleString()} new verified views.`, `$${(gross / 100).toFixed(2)} goes to the creator (before the platform fee), out of the brand's budget.`, 'Money that has been paid out is not taken back automatically.'], action: 'Pay it' }))) return
    setBusy(true)
    setMsg('')
    const res = await fetch(`/api/admin/submissions/${id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, views: n }) }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string } | undefined
    setBusy(false)
    if (!res?.ok) return setMsg(j?.error ?? 'Something went wrong.')
    router.refresh()
  }

  return (
    <div className="flex flex-wrap items-start gap-2">
      {status !== 'rejected' && (
        <>
          <label className="sr-only" htmlFor={`v-${id}`}>Verified views</label>
          <input
            id={`v-${id}`}
            value={v}
            onChange={(e) => setV(e.target.value)}
            data-key="v"
            data-key-label="Set the views"
            inputMode="numeric"
            className="h-9 w-32 rounded-pill border border-line-strong bg-ink/80 px-3 text-right text-xs focus:outline-none"
            aria-label="Verified views"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => send(status === 'pending' ? 'approve' : 'views')}
            data-key="a"
            data-key-label={status === 'pending' ? 'Approve' : 'Update'}
            aria-keyshortcuts="a"
            className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-paper px-4 text-xs font-medium text-ink hover:bg-paper/85 disabled:opacity-40"
          >
            {busy && <Loader2 className="size-3 animate-spin" />}
            {status === 'pending' ? (gross > 0 ? `Approve + pay $${(gross / 100).toFixed(2)}` : 'Approve') : gross > 0 ? `Pay $${(gross / 100).toFixed(2)}` : 'Update views'}
          </button>
        </>
      )}
      {views === 0 && status !== 'rejected' && (
        <AdminButton variant="danger" url={`/api/admin/submissions/${id}`} data={{ action: 'reject' }} hotkey="r" ask={{ label: 'Reason (the clipper sees this)', key: 'reason', required: true }}>
          Reject
        </AdminButton>
      )}
      {msg && <span role="alert" className="w-full text-[11px] text-signal">{msg}</span>}
    </div>
  )
}
