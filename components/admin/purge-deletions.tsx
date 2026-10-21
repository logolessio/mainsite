'use client'

import { askConfirm } from './confirm-dialog'
import { askAdminSecret } from './secret-dialog'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

/** Accounts wait 30 days after a deletion request. This removes the ones whose time is up. */
export function PurgeDeletions({ waiting, due }: { waiting: number; due: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  if (!waiting) return null
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-line p-4 text-sm">
      <span className="text-mute">
        {waiting} {waiting === 1 ? 'account is' : 'accounts are'} waiting to be deleted. {due} {due === 1 ? 'is' : 'are'} past the 30 days.
      </span>
      <button
        type="button"
        disabled={busy || !due}
        onClick={async () => {
          const ok = await askConfirm({ title: `Delete ${due} ${due === 1 ? 'account' : 'accounts'} now?`, summary: ['Only accounts whose 30 days are up are removed.', 'Any money left goes where each person chose.', 'Only the owner can do this, with the admin password.'], word: 'DELETE', action: 'Delete them' })
          if (!ok) return
          const secret = await askAdminSecret('Deleting accounts cannot be undone.')
          if (!secret) return
          setBusy(true)
          setMsg('')
          const res = await fetch('/api/admin/deletions', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ secret }) }).catch(() => null)
          const j = (await res?.json().catch(() => ({}))) as { error?: string; removed?: number; failed?: string[] } | undefined
          setBusy(false)
          setMsg(res?.ok ? `Removed ${j?.removed ?? 0}.${j?.failed?.length ? ` Could not remove: ${j.failed.join('; ')}` : ''}` : (j?.error ?? 'Failed.'))
          router.refresh()
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-signal/50 px-4 text-xs text-signal hover:bg-signal/10 disabled:opacity-40"
      >
        {busy && <Loader2 className="size-3 animate-spin" />} Delete accounts now
      </button>
      {msg && <span className="text-xs text-mute">{msg}</span>}
    </div>
  )
}
