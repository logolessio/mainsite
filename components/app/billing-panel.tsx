'use client'

import { Loader2, Lock } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/fields'
import { SITE } from '@/lib/site'
import { cn } from '@/lib/utils'
import { ActionButton, Card, StatCard } from './ui'
import { DataTable, EmptyState } from './table'

type Invoice = { id: string; date: string; description: string; amount: number }
const PRESETS = [250, 500, 1000, 5000]

export function BillingPanel() {
  const [amount, setAmount] = useState(500)
  const [busy, setBusy] = useState(false)
  const invoices: Invoice[] = []

  const checkout = async () => {
    setBusy(true)
    // TODO(backend): POST /api/stripe/checkout { amount } -> Stripe Checkout session, then redirect to session.url
    await new Promise((r) => setTimeout(r, 600))
    setBusy(false)
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Balance" value="$0.00" note="Unassigned funds" />
        <StatCard label="Reserved" value="$0.00" note="Held for live campaigns" />
        <StatCard label="Spent" value="$0.00" />
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
              Secure checkout by Stripe. Card or bank transfer. Minimum ${SITE.minTopUpUsd}.
            </p>
          </div>
          <ActionButton onClick={checkout} disabled={busy || amount < SITE.minTopUpUsd} className="h-12 px-6">
            {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            Add ${amount.toLocaleString()}
          </ActionButton>
        </div>
      </Card>

      <Card title="Payment methods" action={<ActionButton variant="ghost">Manage in Stripe</ActionButton>}>
        <EmptyState icon="CreditCard" title="No payment method" body="Add funds to save a payment method with Stripe." />
      </Card>

      <div>
        <h2 className="mb-4 font-display text-3xl">Invoices</h2>
        <DataTable
          rows={invoices}
          columns={[
            { key: 'd', header: 'Date', render: (r) => r.date },
            { key: 'x', header: 'Description', render: (r) => r.description },
            { key: 'a', header: 'Amount', render: (r) => `$${r.amount.toFixed(2)}`, className: 'text-right' },
          ]}
          empty={<EmptyState title="No invoices" body="Receipts for every top-up appear here." />}
        />
      </div>
    </div>
  )
}
