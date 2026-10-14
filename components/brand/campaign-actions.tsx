'use client'

import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PayCampaignButton } from '@/components/app/pay-campaign-button'
import { ActionButton } from '@/components/app/ui'
import { Input } from '@/components/ui/fields'

async function call(path: string, data: object) {
  const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
  const j = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(j.error ?? 'Something went wrong. Please try again.')
  return j
}

export type CampaignInfo = { id: string; title: string; status: string; budget: number; spent: number; poolCents: number; adminPaused: boolean }

/** Start, pause, change the budget cap, or return what is left of an older campaign's own pool. */
export function CampaignActions({ c }: { c: CampaignInfo }) {
  const router = useRouter()
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [edit, setEdit] = useState(false)
  const [budget, setBudget] = useState(String(c.budget))

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key)
    setError('')
    try {
      await fn()
      setEdit(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    }
    setBusy('')
  }
  const link = 'text-sm text-mute underline underline-offset-4 transition-colors hover:text-paper'
  const canEdit = ['live', 'paused', 'paid', 'awaiting_payment', 'ended'].includes(c.status)

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {c.status === 'awaiting_payment' && <PayCampaignButton id={c.id} />}
        {c.status === 'live' && (
          <ActionButton variant="ghost" disabled={Boolean(busy)} onClick={() => run('pause', () => call(`/api/campaigns/${c.id}/control`, { action: 'pause' }))}>
            {busy === 'pause' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Pause
          </ActionButton>
        )}
        {c.status === 'paused' && !c.adminPaused && (
          <ActionButton disabled={Boolean(busy)} onClick={() => run('resume', () => call(`/api/campaigns/${c.id}/control`, { action: 'resume' }))}>
            {busy === 'resume' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Start
          </ActionButton>
        )}
        {c.status === 'live' && (
          <Link href={`/campaign/${c.id}`} className={link}>
            View
          </Link>
        )}
      </div>
      {canEdit && !edit && (
        <button type="button" onClick={() => setEdit(true)} className={link}>
          Change budget
        </button>
      )}
      {edit && (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void run('budget', () => call(`/api/campaigns/${c.id}/budget`, { budget: Math.round(Number(budget)) }))
          }}
        >
          <span className="text-mute">$</span>
          <Input aria-label="Budget cap in dollars" inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, '').slice(0, 7))} className="h-9 w-28" />
          <ActionButton type="submit" disabled={Boolean(busy)} className="h-9">
            {busy === 'budget' ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : 'Save'}
          </ActionButton>
          <button type="button" onClick={() => setEdit(false)} className={link}>
            Cancel
          </button>
        </form>
      )}
      {c.poolCents > 0 && ['ended', 'paused'].includes(c.status) && (
        <button type="button" disabled={Boolean(busy)} onClick={() => run('release', () => call('/api/brand/campaigns/release', { id: c.id }))} className={link}>
          Return ${(c.poolCents / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })} to balance
        </button>
      )}
      {c.adminPaused && c.status === 'paused' && <p className="max-w-[16rem] text-right text-xs text-mute">Paused by the logoless team. Contact us to start it again.</p>}
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-signal">
          {error}
        </p>
      )}
    </div>
  )
}

/** Moves some budget from one campaign to another. Same pot, so only the two caps change. */
export function MoveBudget({ campaigns }: { campaigns: { id: string; title: string; free: number }[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(campaigns[0]?.id ?? '')
  const [to, setTo] = useState(campaigns[1]?.id ?? '')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  if (campaigns.length < 2) return null
  const select = 'h-11 rounded-full border border-line-strong bg-ink/80 px-4 text-sm'
  return (
    <div className="mb-6">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-sm text-mute underline underline-offset-4 hover:text-paper">
          Move budget between campaigns
        </button>
      ) : (
        <form
          className="flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-line p-4"
          onSubmit={async (e) => {
            e.preventDefault()
            setBusy(true)
            setError('')
            setDone('')
            try {
              await call('/api/brand/campaigns/transfer', { from, to, amount: Math.round(Number(amount)) })
              setDone('Moved.')
              setAmount('')
              router.refresh()
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not move it.')
            }
            setBusy(false)
          }}
        >
          <span className="text-sm text-mute">Move</span>
          <span className="flex items-center gap-1">
            <span className="text-mute">$</span>
            <Input aria-label="Amount in dollars" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 6))} className="h-11 w-28" />
          </span>
          <span className="text-sm text-mute">from</span>
          <select aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className={select}>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} (${Math.floor(c.free).toLocaleString()} free)
              </option>
            ))}
          </select>
          <span className="text-sm text-mute">to</span>
          <select aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className={select}>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <ActionButton type="submit" disabled={busy || !amount || from === to}>
            {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />} Move
          </ActionButton>
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-mute underline underline-offset-4 hover:text-paper">
            Close
          </button>
          {done && <span role="status" className="basis-full text-sm text-emerald-300">{done}</span>}
          {error && <span role="alert" className="basis-full text-sm text-signal">{error}</span>}
        </form>
      )}
    </div>
  )
}
