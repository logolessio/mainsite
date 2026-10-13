'use client'

import { Loader2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { SITE } from '@/lib/site'
import { costFor } from '@/lib/ledger-math'
import { cn } from '@/lib/utils'

const PRESETS = [50, 100, 250, 500, 1000]

/** Adds money for clippers to a running campaign from the balance. The 15% fee is charged on top of what you pick. */
export function FundCampaign({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('250')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const n = Number(amount)
  const ok = Number.isInteger(n) && n >= 25 && n <= SITE.maxTopUpUsd

  const go = async () => {
    setBusy(true)
    setError('')
    const res = await fetch(`/api/campaigns/${id}/fund`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ amount: n }) }).catch(() => null)
    const j = (await res?.json().catch(() => ({}))) as { error?: string; ok?: boolean }
    setBusy(false)
    if (!res?.ok || !j.ok) return setError(j.error ?? 'Could not add the funds.')
    setOpen(false)
    router.refresh()
  }

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-full bg-paper px-5 text-sm font-medium text-ink transition-colors hover:bg-paper/85">
        <Plus className="size-4" /> Add funds
      </button>
    )
  return (
    <div className="flex w-full flex-col gap-3 rounded-2xl border border-line-strong bg-white/[0.03] p-4 sm:w-80" aria-label={`Add funds to ${title}`}>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => setAmount(String(p))} aria-pressed={n === p} className={cn('h-9 rounded-full border px-3.5 text-sm transition-colors', n === p ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
            ${p}
          </button>
        ))}
      </div>
      <label className="flex h-11 items-center rounded-full border border-line-strong bg-ink/80 px-4 text-sm focus-within:border-paper/60">
        <span className="text-mute">$</span>
        <input inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 5))} aria-label="Amount in dollars" className="ml-1 h-full w-full bg-transparent outline-none" />
      </label>
      <div className="flex items-center gap-2">
        <button type="button" disabled={!ok || busy} onClick={go} className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-paper text-sm font-medium text-ink transition-colors hover:bg-paper/85 disabled:opacity-40">
          {busy && <Loader2 className="size-4 animate-spin" />} Add ${ok ? `$${n.toLocaleString()}` : '…'} from balance
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-full px-3 text-sm text-mute hover:text-paper">
          Cancel
        </button>
      </div>
      {ok && <p className="text-xs text-mute">${n.toLocaleString()} for clippers + {SITE.platformFeePct}% fee = <span className="text-paper">${(costFor(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}</span> from your balance.</p>}
      {!ok && amount && <p className="text-xs text-mute">Between $25 and ${SITE.maxTopUpUsd.toLocaleString()}.</p>}
      {error && (
        <p role="alert" className="text-xs text-signal">
          {error}
        </p>
      )}
    </div>
  )
}
