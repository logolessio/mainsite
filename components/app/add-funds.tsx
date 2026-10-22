'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { startDeposit } from '@/lib/finance-client'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { ActionButton } from './ui'

const PRESETS = [100, 250, 500, 1000, 2500]

/** A brand adds money to their balance with PayPal. They are sent to PayPal to pay, then land back on the funding page. */
export function AddFunds({ ready }: { ready: boolean }) {
  const [amount, setAmount] = useState('250')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const n = Number(amount)
  const ok = Number.isInteger(n) && n >= SITE.minTopUpUsd && n <= SITE.maxTopUpUsd

  const go = async () => {
    setBusy(true)
    setError('')
    try {
      const { url } = await startDeposit(n)
      window.location.href = url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open PayPal.')
      setBusy(false)
    }
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (ok && !busy && ready) void go()
      }}
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Amount">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => setAmount(String(p))} aria-pressed={n === p} className={cn('h-10 rounded-pill border px-5 text-sm transition-colors', n === p ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
            ${p.toLocaleString()}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex h-12 w-44 items-center rounded-pill border border-line-strong bg-ink/80 px-5 focus-within:border-paper/60">
          <span className="text-mute">$</span>
          <input inputMode="numeric" enterKeyHint="go" autoComplete="off" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 5))} aria-label="Amount in dollars" className="ml-1 h-full w-full bg-transparent outline-none" />
        </label>
        <ActionButton type="submit" disabled={!ok || busy || !ready} className="h-12 px-7">
          {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          Add ${ok ? n.toLocaleString() : '…'} with PayPal
        </ActionButton>
      </div>
      {!ready && <p className="text-sm text-mute">Adding funds is not open yet. It will be here very soon.</p>}
      {!ok && amount && <p className="text-xs text-mute">Between ${SITE.minTopUpUsd} and ${SITE.maxTopUpUsd.toLocaleString()}.</p>}
      {error && (
        <p role="alert" className="text-sm text-signal">
          {error}
        </p>
      )}
      <p className="text-xs leading-relaxed text-mute">
        This goes into your logoless balance, one pot for all your campaigns. Creators are paid out of it as they earn, plus our {SITE.platformFeePct}% fee on top (none on your first {SITE.freeFeeCampaigns} campaigns). <span className="text-paper/80">We cover PayPal&apos;s fees, so every dollar you add is a dollar you can spend.</span>
      </p>
    </form>
  )
}
