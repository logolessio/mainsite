'use client'

import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/ui/fields'
import { PayoutAccount } from '@/components/app/payout-account'
import { cents, type Finance, getFinance, withdraw } from '@/lib/stripe-client'
import { SITE } from '@/lib/site'
import { Badge, DataTable, EmptyState } from './table'
import { ActionButton, Card, StatCard } from './ui'

const date = (s: number) => new Date(s * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
const LABEL: Record<string, string> = { sent: 'Sent', pending: 'Processing', review: 'Being checked', failed: 'Failed', reversed: 'Reversed' }

export function PayoutsPanel() {
  const [fin, setFin] = useState<Finance | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<'withdraw' | null>(null)
  const [amount, setAmount] = useState('')

  const load = useCallback(async () => {
    try {
      setFin(await getFinance())
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your payouts.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const state = fin?.connect.status ?? 'not_connected'
  const available = fin?.balances.available ?? 0
  const minCents = SITE.minPayoutUsd * 100

  const doWithdraw = async () => {
    setBusy('withdraw')
    setError('')
    setNotice('')
    try {
      const n = amount.trim() ? Number(amount) : undefined
      const r = await withdraw(n)
      setNotice(`${cents(r.amount)} is on its way. It reaches your bank within a few working days.`)
      setAmount('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed.')
    }
    setBusy(null)
  }

  return (
    <div className="grid gap-6">
      {fin?.testMode && (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-200">Stripe test mode. No real money moves.</p>
      )}
      {notice && (
        <p role="status" className="rounded-2xl border border-line-strong px-4 py-3 text-sm">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-2xl border border-signal/40 px-4 py-3 text-sm text-signal">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Available" value={fin ? cents(available) : '…'} note={`Withdraw from $${SITE.minPayoutUsd}`} />
        <StatCard label="Pending" value={fin ? cents(fin.balances.pending) : '…'} note={`Earnings clear after ${SITE.holdDays} days`} />
        <StatCard label="Withdrawn" value={fin ? cents(fin.balances.withdrawn) : '…'} />
      </div>

      <PayoutAccount onChanged={load} />

      <Card title="Withdraw">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md text-sm text-mute">
            {state !== 'ready'
              ? 'Set up your payouts above first.'
              : available < minCents
                ? `You can withdraw once your available balance reaches $${SITE.minPayoutUsd}.`
                : `You have ${cents(available)} available. Leave the box empty to withdraw all of it.`}
          </div>
          <div className="flex items-center gap-2">
            <span className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-mute">$</span>
              <Input
                aria-label="Amount to withdraw"
                inputMode="decimal"
                value={amount}
                placeholder="All"
                disabled={state !== 'ready' || available < minCents}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                className="h-10 w-28 pl-7"
              />
            </span>
            <ActionButton onClick={doWithdraw} disabled={busy !== null || state !== 'ready' || available < minCents}>
              {busy === 'withdraw' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              Withdraw
            </ActionButton>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="mb-4 font-display text-3xl">History</h2>
        <DataTable
          rows={(fin?.payouts ?? []).map((p) => ({ ...p }))}
          columns={[
            { key: 'd', header: 'Date', render: (r) => date(r.created_at) },
            { key: 's', header: 'Status', render: (r) => <Badge tone={r.status === 'sent' ? 'good' : r.status === 'pending' || r.status === 'review' ? 'warn' : 'bad'}>{LABEL[r.status] ?? r.status}</Badge> },
            { key: 'a', header: 'Amount', render: (r) => cents(r.amount_cents), className: 'text-right' },
          ]}
          empty={<EmptyState title="No withdrawals yet" body="Completed payouts show here." />}
        />
      </div>
    </div>
  )
}
