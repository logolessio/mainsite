'use client'

import { Check, Loader2, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Field, Input } from '@/components/ui/fields'
import { cents, type Finance, getFinance, withdraw } from '@/lib/finance-client'
import { cn } from '@/lib/utils'
import { SITE } from '@/lib/site'
import { Badge, DataTable, EmptyState } from './table'
import { ActionButton, Card } from './ui'

const date = (s: number) => new Date(s * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
const LABEL: Record<string, string> = { sent: 'Sent', pending: 'Processing', review: 'Being checked', failed: 'Failed', reversed: 'Returned' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

async function emailsApi(method: 'POST' | 'DELETE', email: string, makeDefault?: boolean) {
  const res = await fetch('/api/me/paypal', { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, ...(makeDefault === undefined ? {} : { makeDefault }) }) })
  const j = (await res.json().catch(() => ({}))) as { error?: string; email?: string; emails?: string[] }
  if (!res.ok) throw new Error(j.error ?? 'Could not save that.')
  return j
}

/** Withdrawing, and the PayPal emails you can be paid at. It lives on the Earnings page. */
export function PayoutsPanel() {
  const [fin, setFin] = useState<Finance | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [emails, setEmails] = useState<string[]>([])
  const [pick, setPick] = useState('')
  const [adding, setAdding] = useState('')
  const [amount, setAmount] = useState('')

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

  const add = async () => {
    const e = adding.trim().toLowerCase()
    if (!EMAIL_RE.test(e) || busy) return
    setBusy(true)
    setError('')
    try {
      const j = await emailsApi('POST', e, emails.length === 0)
      setEmails(j.emails ?? [])
      setPick(e)
      setAdding('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.')
    }
    setBusy(false)
  }
  const remove = async (e: string) => {
    if (busy) return
    setBusy(true)
    try {
      const j = await emailsApi('DELETE', e)
      setEmails(j.emails ?? [])
      if (pick === e) setPick(j.email ?? j.emails?.[0] ?? '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that.')
    }
    setBusy(false)
  }
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
        <div className="grid gap-6">
          <fieldset>
            <legend className="mb-2 text-sm text-mute">Send it to</legend>
            {emails.length > 0 && (
              <div className="grid gap-2" role="radiogroup" aria-label="PayPal email">
                {emails.map((e) => (
                  <div key={e} className="flex items-center gap-2">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={pick === e}
                      tabIndex={pick === e || (!emails.includes(pick) && e === emails[0]) ? 0 : -1}
                      onClick={() => setPick(e)}
                      className={cn('flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl border px-4 text-left text-[15px] transition-colors', pick === e ? 'border-paper bg-white/[0.06]' : 'border-line-strong text-paper/80 hover:border-paper/50')}
                    >
                      <span className={cn('grid size-5 shrink-0 place-items-center rounded-full border', pick === e ? 'border-paper bg-paper text-ink' : 'border-line-strong')}>{pick === e && <Check className="size-3" />}</span>
                      <span className="truncate">{e}</span>
                    </button>
                    <button type="button" onClick={() => remove(e)} aria-label={`Remove ${e}`} className="grid size-10 shrink-0 place-items-center rounded-full text-mute transition-colors hover:bg-white/[0.07] hover:text-paper">
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {emails.length < 5 && (
              <form
                className={cn('flex flex-wrap items-center gap-2', emails.length > 0 && 'mt-3')}
                onSubmit={(e) => {
                  e.preventDefault()
                  void add()
                }}
              >
                <Input type="email" autoComplete="email" aria-label="Add a PayPal email" placeholder={emails.length ? 'Add another PayPal email' : 'you@example.com'} value={adding} onChange={(e) => setAdding(e.target.value)} className="min-w-0 flex-1 sm:max-w-xs" />
                <ActionButton type="submit" variant="ghost" disabled={busy || !EMAIL_RE.test(adding.trim())}>
                  <Plus aria-hidden="true" className="size-4" /> Add
                </ActionButton>
              </form>
            )}
            <p className="mt-2 text-xs text-mute">Any PayPal email you can sign in to. No bank details needed.</p>
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
                <button type="button" aria-pressed={!amount.trim()} onClick={() => setAmount('')} className={cn('h-9 rounded-full border px-4 text-sm transition-colors', !amount.trim() ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
                  All
                </button>
                {[10, 25, 50, 100].filter((v) => v * 100 >= minCents && v * 100 < available).map((v) => (
                  <button key={v} type="button" aria-pressed={amount === String(v)} onClick={() => setAmount(String(v))} className={cn('h-9 rounded-full border px-4 text-sm transition-colors', amount === String(v) ? 'border-paper bg-paper text-ink' : 'border-line-strong text-mute hover:text-paper')}>
                    ${v}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </Card>

      <div>
        <h2 className="mb-4 font-display text-3xl">Withdrawals</h2>
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
