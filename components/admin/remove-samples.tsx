'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ActionButton } from '@/components/app/ui'

/** Deletes every sample campaign in one go, after a confirmation. Campaigns that hold money or clips are kept. */
export function RemoveSamples({ count }: { count: number }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  if (count === 0) return null
  const run = async () => {
    if (!window.confirm(`Delete all ${count} sample campaign${count > 1 ? 's' : ''}? They are made-up artists. This cannot be undone.`)) return
    setBusy(true)
    setMsg('')
    const res = await fetch('/api/admin/campaigns/samples', { method: 'POST' }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { removed?: number; kept?: number; error?: string }
    setBusy(false)
    if (!res?.ok) return setMsg(j.error ?? 'Could not remove them.')
    setMsg(`Removed ${j.removed}${j.kept ? `, kept ${j.kept} that have money or clips attached` : ''}.`)
    router.refresh()
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ActionButton variant="danger" onClick={run} disabled={busy}>
        {busy ? 'Removing…' : `Remove ${count} sample campaign${count > 1 ? 's' : ''}`}
      </ActionButton>
      {msg && <span role="status" className="text-sm text-mute">{msg}</span>}
    </div>
  )
}
