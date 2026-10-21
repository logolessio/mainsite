'use client'

import { Check, Loader2, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useFeature } from '@/components/shell/features-provider'
import { Field, Input } from '@/components/ui/fields'
import { cents, type Finance, getFinance, withdraw } from '@/lib/finance-client'
import { cn } from '@/lib/utils'
import { SITE } from '@/lib/site'
import { WithdrawSheet } from './payout-flow'
import { PaypalEmails } from './paypal-emails'
import { Badge, DataTable, EmptyState } from './table'
import { ActionButton, Card } from './ui'

const date = (s: number) => new Date(s * 1000).toLocaleDateString('en-GB')
const LABEL: Record<string, string> = { sent: 'Sent', pending: 'Processing', review: 'Being checked', failed: 'Failed', reversed: 'Returned' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Withdrawing, and the PayPal emails you can be paid at. It lives on the Earnings page. */
export function PayoutsPanel() {
  const [fin, setFin] = useState<Finance | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [emails, setEmails] = useState<string[]>([])
  const [pick, setPick] = useState('')
  const [amount, setAmount] = useState('')
  const ceremony = useFeature('payout-ceremony')
  const receipts = useFeature('payout-receipts')
  const [sheet, setSheet] = useState(false)

  const load = useCallback(async () => {
    try {
      const f = await getFinance()
      setFin(f)
      setEmails(f.paypalEmails ?? [])
      setPick((cur) => (cur && f.paypalEmails?.includes(cur) ? cur : f.paypalEmail || f.paypalEmails?.[0] || ''))
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
  const can = Boolean(fin?.ready) && available >= minCents && EMAIL_RE.test(pick) && !busy

  const doWithdraw = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const n = amount.trim() ? Number(amount) : undefined
      const r = await withdraw(pick, n)
      setNotice(r.review ? `${cents(r.amount)} is being checked first. It will go to ${pick} as soon as it is cleared.` : `${cents(r.amount)} is on its way to ${pick}. We covered PayPal's fee, so the whole amount arrives.`)
      setAmount('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Withdrawal failed.')
    }
    setBusy(false)
  }

  return (
    <div id="withdraw" className="grid scroll-mt-24 gap-6">
      {fin?.testMode && <p className="rounded-2xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-200">PayPal sandbox. No real money moves.</p>}
      {fin && !fin.ready && <p className="rounded-2xl border border-line-strong px-4 py-3 text-sm text-mute">Withdrawals are not open yet. Your earnings are kept and will be here when they are.</p>}
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

      <Card title="Withdraw to PayPal" sub={`We pay PayPal's fees. Whatever you withdraw is what arrives. From $${SITE.minPayoutUsd}.`}>
        {ceremony ? (
          <div className="grid gap-8">
            <div className="flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="text-sm text-mute">Available to withdraw</p>
                <p className="mt-1 font-display text-[clamp(2.4rem,8vw,3.4rem)] leading-none tabular-nums">{cents(available)}</p>
                {available < minCents && <p className="mt-2 text-sm text-mute">You can withdraw once you have ${SITE.minPayoutUsd} available.</p>}
              </div>
              <ActionButton onClick={() => setSheet(true)} disabled={!fin?.ready || available < minCents || emails.length === 0} className="h-12 px-7">
                Withdraw
              </ActionButton>
            </div>
            {emails.length === 0 && available >= minCents && <p className="-mt-4 text-sm text-mute">Add a PayPal email below first. That is where the money goes.</p>}
            <div>
              <h3 className="mb-3 font-sans text-[15px] font-medium">Your PayPal emails</h3>
              <PaypalEmails
                emails={emails}
                defaultEmail={fin?.paypalEmail ?? ''}
                onChange={(r) => {
                  setEmails(r.emails)
                  setPick((cur) => (cur && r.emails.includes(cur) ? cur : r.email || r.emails[0] || ''))
                  setFin((f) => (f ? { ...f, paypalEmail: r.email, paypalEmails: r.emails } : f))
                }}
              />
            </div>
            <WithdrawSheet
              open={sheet}
              onClose={() => setSheet(false)}
              availableCents={available}
              minCents={minCents}
              emails={emails}
              defaultEmail={fin?.paypalEmail ?? ''}
              initialPick={pick}
              onSent={() => void load()}
              onSaved={(r) => {
                setEmails(r.emails)
                setFin((f) => (f ? { ...f, paypalEmail: r.email, paypalEmails: r.emails } : f))
              }}
            />
          </div>
        ) : (
        <div className="grid gap-6">
          <fieldset>
            {emails.length > 0 && <legend className="mb-3 text-sm text-mute">Send it to</legend>}
            <PaypalEmails
              emails={emails}
              defaultEmail={fin?.paypalEmail ?? ''}
              pick={pick}
              onPick={setPick}
              onChange={(r) => {
                setEmails(r.emails)
                setFin((f) => (f ? { ...f, paypalEmail: r.email, paypalEmails: r.emails } : f))
              }}
            />
          </fieldset>

          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (can) void doWithdraw()
            }}
          >
            <Field label="Amount" hint={available >= minCents ? `Leave empty to withdraw all ${cents(available)}.` : `You can withdraw once you have $${SITE.minPayoutUsd} available.`}>
              <span className="relative block">
                <span className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-mute">$</span>
                <Input aria-label="Amount to withdraw" inputMode="decimal" enterKeyHint="send" autoComplete="off" value={amount} placeholder="All" disabled={available < minCents} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} className="w-36 pl-7" />
              </span>
            </Field>
            <ActionButton type="submit" disabled={!can}>
              {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {amount.trim() ? `Withdraw $${amount}` : available >= minCents ? `Withdraw ${cents(available)}` : 'Withdraw'}
            </ActionButton>
            {available >= minCents && (
              <div className="flex basis-full flex-wrap gap-2" role="group" aria-label="Quick amounts">
                <button type="button" aria-pressed={!amount.trim()} onClick={() => setAmount('')} className={cn('h-9 rounded-pill border px-4 text-sm transition-colors', !amount.trim() ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
                  All
                </button>
                {[10, 25, 50, 100].filter((v) => v * 100 >= minCents && v * 100 < available).map((v) => (
                  <button key={v} type="button" aria-pressed={amount === String(v)} onClick={() => setAmount(String(v))} className={cn('h-9 rounded-pill border px-4 text-sm transition-colors', amount === String(v) ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
                    ${v}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
        )}
      </Card>

      <div>
        <h2 className="mb-4 font-display text-3xl">Withdrawals</h2>
        <DataTable
          rows={(fin?.payouts ?? []).map((p) => ({ ...p }))}
          columns={[
            { key: 'd', header: 'Date', render: (r) => date(r.created_at) },
            { key: 's', header: 'Status', render: (r) => <Badge tone={r.status === 'sent' ? 'good' : r.status === 'pending' || r.status === 'review' ? 'warn' : 'bad'}>{LABEL[r.status] ?? r.status}</Badge> },
            { key: 'a', header: 'Amount', render: (r) => cents(r.amount_cents), className: 'text-right' },
            ...(receipts ? [{ key: 'r', header: '', render: (r: { id: string }) => <a href={`/dashboard/payouts/receipt/${r.id}`} className="text-sm text-mute underline underline-offset-4 hover:text-paper">Receipt</a>, className: 'text-right' }] : []),
          ]}
          empty={<EmptyState title="No withdrawals yet" body="Completed payouts show here." />}
        />
      </div>
    </div>
  )
}
