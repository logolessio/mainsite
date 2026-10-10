'use client'

import { CreditCard, Loader2, Lock } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Input } from '@/components/ui/fields'
import { cents, type Finance, getFinance, openBillingPortal, startTopup } from '@/lib/stripe-client'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { Badge, DataTable, EmptyState } from './table'
import { ActionButton, Card, StatCard } from './ui'

const PRESETS = [250, 500, 1000, 5000]
const date = (s: number) => new Date(s * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

export function BillingPanel() {
  const [fin, setFin] = useState<Finance | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [amount, setAmount] = useState(500)
  const [busy, setBusy] = useState<'pay' | 'portal' | null>(null)

  const load = useCallback(async () => {
    try {
      setFin(await getFinance())
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your billing.')
    }
  }, [])

  useEffect(() => {
    load()
    const q = new URLSearchParams(window.location.search).get('topup')
    if (q === 'cancelled') setNotice('Checkout was cancelled. You were not charged.')
    if (q === 'success') {
      setNotice('Payment received. Your balance updates in a few seconds.')
      // Stripe tells us about the payment a moment after you return, so check a few times.
      let tries = 0
      const id = setInterval(async () => {
        tries += 1
        await load()
        if (tries >= 8) clearInterval(id)
      }, 2500)
      window.history.replaceState(null, '', window.location.pathname)
      return () => clearInterval(id)
    }
  }, [load])

  const pay = async () => {
    setBusy('pay')
    setError('')
    try {
      await startTopup(amount, '/brand/billing')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start checkout.')
      setBusy(null)
    }
  }
  const portal = async () => {
    setBusy('portal')
    setError('')
    try {
      await openBillingPortal()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open billing.')
      setBusy(null)
    }
  }

  const paid = fin?.topups.filter((t) => t.status === 'paid' || t.status === 'disputed') ?? []
  const added = paid.reduce((n, t) => n + t.amount_cents, 0)

  return (
    <div className="grid gap-6">
      {fin?.testMode && (
        <p className="rounded-2xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-200">
          Stripe test mode. No real money moves. Use card 4242 4242 4242 4242 with any future date and any CVC.
        </p>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Balance" value={fin ? cents(fin.balances.brand) : '…'} note="Ready to assign to campaigns" />
        <StatCard label="Added so far" value={fin ? cents(added) : '…'} />
      </div>

      <Card title="Add funds">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={amount === p}
                  onClick={() => setAmount(p)}
                  className={cn('h-11 border px-5 text-sm transition-colors', amount === p ? 'border-paper bg-paper/10' : 'border-line-strong text-mute hover:text-paper')}
                >
                  ${p.toLocaleString()}
                </button>
              ))}
              <span className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-mute">$</span>
                <Input
                  aria-label="Custom amount"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
                  className="h-11 w-32 pl-7"
                />
              </span>
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-mute">
              <Lock aria-hidden="true" className="size-3.5" />
              Secure checkout by Stripe. Between ${SITE.minTopUpUsd} and ${SITE.maxTopUpUsd.toLocaleString()} per top-up.
            </p>
          </div>
          <ActionButton onClick={pay} disabled={busy !== null || amount < SITE.minTopUpUsd || amount > SITE.maxTopUpUsd} className="h-12 px-6">
            {busy === 'pay' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            Add ${amount.toLocaleString()}
          </ActionButton>
        </div>
      </Card>

      <Card
        title="Payment methods and receipts"
        action={
          <ActionButton variant="ghost" onClick={portal} disabled={busy !== null || !fin?.hasCustomer}>
            {busy === 'portal' && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            Manage in Stripe
          </ActionButton>
        }
      >
        <EmptyState
          icon="CreditCard"
          title={fin?.hasCustomer ? 'Managed by Stripe' : 'No payment method yet'}
          body={fin?.hasCustomer ? 'Update your saved cards and download receipts in Stripe.' : 'Add funds once and your billing details will show up here.'}
        />
      </Card>

      <div>
        <h2 className="mb-4 font-display text-3xl">Top-ups</h2>
        <DataTable
          rows={(fin?.topups ?? []).map((t) => ({ ...t }))}
          columns={[
            { key: 'd', header: 'Date', render: (r) => date(r.created_at) },
            { key: 'x', header: 'Description', render: () => 'Balance top-up' },
            { key: 's', header: 'Status', render: (r) => <Badge tone={r.status === 'paid' ? 'good' : r.status === 'disputed' ? 'bad' : 'warn'}>{r.status}</Badge> },
            { key: 'a', header: 'Amount', render: (r) => cents(r.amount_cents), className: 'text-right' },
            {
              key: 'r',
              header: 'Receipt',
              render: (r) =>
                r.receipt_url ? (
                  <a href={r.receipt_url} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-paper">
                    View
                  </a>
                ) : (
                  '-'
                ),
              className: 'text-right',
            },
          ]}
          empty={<EmptyState title="No top-ups yet" body="Receipts for every payment appear here." />}
        />
      </div>
    </div>
  )
}
