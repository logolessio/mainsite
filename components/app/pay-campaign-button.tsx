'use client'

import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ActionButton } from './ui'

/** Starts an approved campaign. Nothing is charged: clippers are paid from the balance as they earn. If the balance is too low it says so. */
export function PayCampaignButton({ id, label = 'Start campaign' }: { id: string; label?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const short = error.includes('Add funds')
  return (
    <div className="flex flex-col items-end gap-1">
      <ActionButton
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError('')
          const res = await fetch(`/api/campaigns/${id}/pay`, { method: 'POST' })
          const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
          setBusy(false)
          if (!res.ok || !j.ok) return setError(j.error ?? 'Could not start it.')
          router.refresh()
        }}
      >
        {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        {label}
      </ActionButton>
      {error && (
        <span role="alert" className="max-w-xs text-right text-xs text-signal">
          {error}{' '}
          {short && (
            <Link href="/brand/balance" className="underline underline-offset-4">
              Open balance
            </Link>
          )}
        </span>
      )}
    </div>
  )
}
