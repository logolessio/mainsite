'use client'

import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Field, Input } from '@/components/ui/fields'
import { cents, type Finance, getFinance, withdraw } from '@/lib/finance-client'
import { SITE } from '@/lib/site'
import { Badge, DataTable, EmptyState } from './table'
import { ActionButton, Card, StatCard } from './ui'

const date = (s: number) => new Date(s * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
const LABEL: Record<string, string> = { sent: 'Sent', pending: 'Processing', review: 'Being checked', failed: 'Failed', reversed: 'Returned' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function PayoutsPanel() {
  const [fin, setFin] = useState<Finance | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('')

  const load = useCallback(async () => {
    try {
      const f = await getFinance()
      setFin(f)
      setEmail((cur) => cur || f.paypalEmail)
      setError('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your payouts.')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const available = fin?.balances.available ?? 0
  const minCents = SITE.minPayoutUsd * 100
  const emailOk = EMAIL_RE.test(email.trim())
  const can = Boolean(fin?.ready) && available >= minCents && emailOk && !busy

  const doWithdraw = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const n = amount.trim() ? Number(amount) : undefined
      const r = await withdraw(email.trim(), n)
      setNotice(r.review ? `${cents(r.amount)} is being checked first. It will go to ${email.trim()} as soon as it is cleared.` : `${cents(r.amount)} is on its way to ${email.trim()} on PayPal.`)
      setAmount('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed.')
    }
    setBusy(false)
  }

  return (
    <div className="grid gap-6">
      {fin?.testMode && <p className="rounded-2xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-200">PayPal sandbox. No real money moves.</p>}
      {fin && !fin.ready && <p className="rounded-2xl border border-line-strong px-4 py-3 text-sm text-mute">Withdrawals are not open yet. Your earnings are safe and will be here when they are.</p>}
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

      <Card title="Withdraw to PayPal">
        <form
          className="grid gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (can) void doWithdraw()
          }}
        >
          <Field label="Send it to this PayPal email" hint="Any PayPal email you can sign in to. We remember it for next time.">
            <Input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Amount" hint={available >= minCents ? `Leave empty to withdraw all ${cents(available)}.` : `You can withdraw once you have $${SITE.minPayoutUsd} available.`}>
              <span className="relative block">
                <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-mute">$</span>
                <Input aria-label="Amount to withdraw" inputMode="decimal" value={amount} placeholder="All" disabled={available < minCents} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} className="w-36 pl-7" />
              </span>
            </Field>
            <ActionButton type="submit" disabled={!can}>
              {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              Withdraw
            </ActionButton>
          </div>
        </form>
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
