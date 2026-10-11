'use client'

import { Landmark, Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/app/table'
import { BankForm, PayoutSetup } from '@/components/app/payout-setup'
import { ActionButton, Card } from '@/components/app/ui'
import type { ConnectStatus } from '@/lib/connect-fields'
import { getConnect, getPayoutOverview, type PayoutOverview } from '@/lib/stripe-client'

const money = (amount: number, currency: string) => new Intl.NumberFormat('en', { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100)
const day = (s: number) => new Date(s * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
const PAYOUT_LABEL: Record<string, string> = { paid: 'Paid', pending: 'On its way', in_transit: 'On its way', canceled: 'Cancelled', failed: 'Failed' }

/** Everything about the clipper's payout account, in logoless's own screens: set it up, see the bank, see the money move. */
export function PayoutAccount({ onChanged }: { onChanged?: () => void }) {
  const [status, setStatus] = useState<ConnectStatus | null>(null)
  const [error, setError] = useState('')

  const apply = useCallback(
    (s: ConnectStatus) => {
      setStatus(s)
      onChanged?.()
    },
    [onChanged],
  )
  useEffect(() => {
    getConnect()
      .then(setStatus)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load your payout account.'))
  }, [])

  if (error) return <p role="alert" className="rounded-2xl border border-signal/40 px-4 py-3 text-sm text-signal">{error}</p>
  if (!status)
    return (
      <p className="flex items-center gap-2 text-sm text-mute">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" /> Loading your payout account…
      </p>
    )
  if (status.status !== 'ready') return <PayoutSetup status={status} onChange={apply} />
  return <Ready status={status} onChange={apply} />
}

function Ready({ status, onChange }: { status: ConnectStatus; onChange: (s: ConnectStatus) => void }) {
  const [changing, setChanging] = useState(false)
  const [ov, setOv] = useState<PayoutOverview | null>(null)
  useEffect(() => {
    getPayoutOverview().then(setOv).catch(() => null)
  }, [status.bank?.last4])

  return (
    <div className="grid gap-6">
      <Card title="Bank account" action={<Badge tone="good">Verified</Badge>}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full border border-line-strong">
              <Landmark aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="font-medium">{status.bank ? `${status.bank.name ?? 'Bank account'} ending ${status.bank.last4}` : 'No bank account yet'}</p>
              <p className="mt-1 text-sm text-mute">Payouts arrive in {(status.currency ?? status.bank?.currency ?? '').toUpperCase()}.</p>
            </div>
          </div>
          <ActionButton variant="ghost" onClick={() => setChanging((v) => !v)}>
            {changing ? 'Cancel' : 'Change bank account'}
          </ActionButton>
        </div>
        {changing && (
          <div className="mt-6 border-t border-line pt-6">
            <BankForm status={status} onChange={onChange} onDone={() => setChanging(false)} />
          </div>
        )}
      </Card>

      {ov && (
        <Card title="Where your money is">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="font-mono text-xs text-mute">On its way to your bank</p>
              <p className="mt-1 font-display text-3xl">{ov.pending.length ? ov.pending.map((b) => money(b.amount, b.currency)).join(' · ') : '—'}</p>
            </div>
            <div>
              <p className="font-mono text-xs text-mute">Waiting for the next payout</p>
              <p className="mt-1 font-display text-3xl">{ov.available.length ? ov.available.map((b) => money(b.amount, b.currency)).join(' · ') : '—'}</p>
            </div>
          </div>
          {ov.payouts.length > 0 && (
            <ul className="mt-6 divide-y divide-line text-sm">
              {ov.payouts.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="text-mute">{day(p.created)}</span>
                  <Badge tone={p.status === 'paid' ? 'good' : p.status === 'failed' || p.status === 'canceled' ? 'bad' : 'warn'}>{PAYOUT_LABEL[p.status] ?? p.status}</Badge>
                  <span>{money(p.amount, p.currency)}</span>
                  {p.failure && <span className="w-full text-xs text-signal">{p.failure}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  )
}
