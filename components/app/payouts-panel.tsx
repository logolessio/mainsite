'use client'

import { Landmark, Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { SITE } from '@/lib/site'
import { ActionButton, Card, StatCard } from './ui'
import { Badge, DataTable, EmptyState } from './table'

type Payout = { id: string; date: string; amount: number; status: 'paid' | 'in_transit' | 'failed' }
type StripeState = 'not_connected' | 'incomplete' | 'ready'

export function PayoutsPanel() {
  // TODO(backend): load Connect account status from Stripe (accounts.retrieve -> details_submitted / payouts_enabled)
  const [stripe] = useState<StripeState>('not_connected')
  const [busy, setBusy] = useState(false)
  const available = 0
  const payouts: Payout[] = []

  const connect = async () => {
    setBusy(true)
    // TODO(backend): POST /api/stripe/connect/onboard -> create Account + AccountLink, then window.location = link.url
    await new Promise((r) => setTimeout(r, 600))
    setBusy(false)
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Available" value={`$${available.toFixed(2)}`} note={`Withdraw from $${SITE.minPayoutUsd}`} />
        <StatCard label="Pending" value="$0.00" />
        <StatCard label="Withdrawn" value="$0.00" />
      </div>

      <Card title="Stripe account" action={<Badge tone={stripe === 'ready' ? 'good' : 'warn'}>{stripe === 'ready' ? 'Connected' : stripe === 'incomplete' ? 'Action needed' : 'Not connected'}</Badge>}>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <span className="grid size-12 shrink-0 place-items-center border border-line-strong rounded-full">
              <Landmark aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="font-medium">Bank payouts via Stripe</p>
              <p className="mt-1 max-w-md text-sm text-mute">
                Stripe verifies your identity and holds your bank details. We never see your full account number.
              </p>
              <p className="mt-3 flex items-center gap-2 text-xs text-mute">
                <ShieldCheck aria-hidden="true" className="size-4" />
                Takes about five minutes
              </p>
            </div>
          </div>
          <ActionButton onClick={connect} disabled={busy || stripe === 'ready'} className="shrink-0">
            {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            {stripe === 'incomplete' ? 'Finish setup' : 'Connect with Stripe'}
          </ActionButton>
        </div>
      </Card>

      <Card title="Withdraw">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="max-w-md text-sm text-mute">
            {stripe !== 'ready'
              ? 'Connect Stripe first.'
              : available < SITE.minPayoutUsd
                ? `You can withdraw once your available balance reaches $${SITE.minPayoutUsd}.`
                : 'Funds are sent to your connected bank account.'}
          </p>
          {/* TODO(backend): POST /api/payouts/withdraw */}
          <ActionButton disabled={stripe !== 'ready' || available < SITE.minPayoutUsd}>Withdraw ${available.toFixed(2)}</ActionButton>
        </div>
      </Card>

      <div>
        <h2 className="mb-4 font-display text-3xl">History</h2>
        <DataTable
          rows={payouts}
          columns={[
            { key: 'd', header: 'Date', render: (r) => r.date },
            { key: 's', header: 'Status', render: (r) => <Badge tone={r.status === 'paid' ? 'good' : r.status === 'failed' ? 'bad' : 'warn'}>{r.status.replace('_', ' ')}</Badge> },
            { key: 'a', header: 'Amount', render: (r) => `$${r.amount.toFixed(2)}`, className: 'text-right' },
          ]}
          empty={<EmptyState title="No withdrawals yet" body="Completed payouts and receipts will show here." />}
        />
      </div>
    </div>
  )
}
