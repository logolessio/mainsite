'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { ActionButton } from './ui'

/** Sends the artist to Stripe to pay for an accepted campaign. */
export function PayCampaignButton({ id, amount }: { id: string; amount: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div className="flex flex-col items-end gap-1">
      <ActionButton
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setError('')
          const res = await fetch(`/api/campaigns/${id}/pay`, { method: 'POST' })
          const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
          if (!res.ok || !j.url) {
            setError(j.error ?? 'Could not start the payment.')
            setBusy(false)
            return
          }
          window.location.href = j.url
        }}
      >
        {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        Pay {amount}
      </ActionButton>
      {error && <span role="alert" className="text-xs text-signal">{error}</span>}
    </div>
  )
}
