'use client'

import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ActionButton } from './ui'

/** Pays for an accepted campaign from the brand's balance: the budget plus our fee on top. If the balance is short, it says so. */
export function PayCampaignButton({ id, amount }: { id: string; amount: string }) {
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
          if (!res.ok || !j.ok) return setError(j.error ?? 'Could not take the payment.')
          router.refresh()
        }}
      >
        {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        Pay {amount} from balance
      </ActionButton>
      {error && (
        <span role="alert" className="max-w-xs text-right text-xs text-signal">
          {error}{' '}
          {short && (
            <Link href="/brand/billing" className="underline underline-offset-4">
              Add funds
            </Link>
          )}
        </span>
      )}
    </div>
  )
}
