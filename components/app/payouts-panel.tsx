'use client'

import { ExternalLink, Landmark, Loader2, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/ui/fields'
import { cents, type Finance, getConnectStatus, getFinance, openStripeDashboard, startConnect, withdraw } from '@/lib/stripe-client'
import { SITE } from '@/lib/site'
import { Badge, DataTable, EmptyState } from './table'
import { ActionButton, Card, StatCard } from './ui'

const date = (s: number) => new Date(s * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
const LABEL: Record<string, string> = { sent: 'Sent', pending: 'Processing', review: 'Being checked', failed: 'Failed', reversed: 'Reversed' }

export function PayoutsPanel() {
  const [fin, setFin] = useState<Finance | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<'connect' | 'withdraw' | 'dash' | null>(null)
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
    // coming back from Stripe onboarding: ask Stripe for the latest state first, then reload
    const returning = new URLSearchParams(window.location.search).get('stripe') === 'return'
    ;(async () => {
      if (returning) {
        await getConnectStatus().catch(() => null)
        window.history.replaceState(null, '', window.location.pathname)
      }
      await load()
    })()
  }, [load])

  const state = fin?.connect.status ?? 'not_connected'
  const available = fin?.balances.available ?? 0
  const minCents = SITE.minPayoutUsd * 100

  const connect = async () => {
    setBusy('connect')
    setError('')
    try {
      await startConnect('/dashboard/payouts')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open Stripe.')
      setBusy(null)
    }
  }
  const dash = async () => {
    setBusy('dash')
    setError('')
    try {
      await openStripeDashboard()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open Stripe.')
    }
    setBusy(null)
  }
  const doWithdraw = async () => {
    setBusy('withdraw')
    setError('')
    setNotice('')
    try {
      const n = amount.trim() ? Number(amount) : undefined
      const r = await withdraw(n)
      setNotice(`${cents(r.amount)} is on its way to your Stripe account. Stripe pays it to your bank on its normal schedule.`)
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

      <Card title="Stripe account" action={<Badge tone={state === 'ready' ? 'good' : 'warn'}>{state === 'ready' ? 'Connected' : state === 'incomplete' ? 'Action needed' : 'Not connected'}</Badge>}>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-full border border-line-strong">
              <Landmark aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="font-medium">Bank payouts via Stripe</p>
              <p className="mt-1 max-w-md text-sm text-mute">
                {state === 'ready'
                  ? 'Your account is verified. Stripe sends your withdrawals to the bank you added.'
                  : state === 'incomplete'
                    ? 'Stripe still needs a few details before it can pay you. Finish setup to continue.'
                    : 'Stripe verifies your identity and holds your bank details. We never see your full account number.'}
              </p>
              <p className="mt-3 flex items-center gap-2 text-xs text-mute">
                <ShieldCheck aria-hidden="true" className="size-4" />
                Takes about five minutes
              </p>
            </div>
          </div>
          {state === 'ready' ? (
            <ActionButton variant="ghost" onClick={dash} disabled={busy !== null} className="shrink-0">
              {busy === 'dash' ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <ExternalLink aria-hidden="true" className="size-4" />}
              Open Stripe
            </ActionButton>
          ) : (
            <ActionButton onClick={connect} disabled={busy !== null} className="shrink-0">
              {busy === 'connect' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {state === 'incomplete' ? 'Finish setup' : 'Connect with Stripe'}
            </ActionButton>
          )}
        </div>
      </Card>

      <Card title="Withdraw">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md text-sm text-mute">
            {state !== 'ready'
              ? 'Connect Stripe first.'
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
