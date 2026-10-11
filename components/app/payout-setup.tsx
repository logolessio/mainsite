'use client'

import { Check, ChevronDown, Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { ActionButton, Card } from '@/components/app/ui'
import { Field, Input, Select } from '@/components/ui/fields'
import { COUNTRIES, type ConnectStatus, countryOf, type Section, sectionOf } from '@/lib/connect-fields'
import { createPayoutAccount, savePayoutBank, savePayoutDetails, tokenizeBank, uploadIdPhoto } from '@/lib/stripe-client'
import { cn } from '@/lib/utils'

const msg = (e: unknown, fallback = 'Something went wrong. Please try again.') => (e instanceof Error ? e.message : fallback)

/**
 * Setting up payouts, in logoless's own forms. Stripe tells us which details it still needs, and we show only those,
 * one step at a time. Everything typed goes straight on to Stripe; the bank numbers are swapped for a token in the
 * browser first, so they never reach logoless.
 */
export function PayoutSetup({ status, onChange }: { status: ConnectStatus; onChange: (s: ConnectStatus) => void }) {
  if (status.status === 'not_connected') return <Start onChange={onChange} />

  const needed = new Set<Section>([...status.due, ...status.pastDue].map(sectionOf))
  const pending = status.pending.length > 0
  const order: Section[] = ['details', 'id', 'document', 'bank']
  const current = order.find((s) => needed.has(s)) ?? null
  const otherDue = [...new Set([...status.due, ...status.pastDue].filter((r) => sectionOf(r) === 'other' || sectionOf(r) === 'terms'))]
  const steps: { id: Section; title: string }[] = [
    { id: 'details', title: 'About you' },
    ...(needed.has('id') ? [{ id: 'id' as Section, title: 'ID number' }] : []),
    ...(needed.has('document') ? [{ id: 'document' as Section, title: 'Photo of your ID' }] : []),
    { id: 'bank', title: 'Bank account' },
  ]
  const errFor = (sec: Section) => status.errors.filter((e) => sectionOf(e.requirement) === sec).map((e) => e.message)

  return (
    <div className="grid gap-4">
      <ol className="grid gap-3">
        {steps.map((st, i) => (
          <Step key={st.id} n={i + 1} title={st.title} done={!needed.has(st.id)} open={current === st.id} errors={errFor(st.id)}>
            {st.id === 'details' && <DetailsForm status={status} onChange={onChange} />}
            {st.id === 'id' && <IdForm status={status} onChange={onChange} />}
            {st.id === 'document' && <DocumentForm onChange={onChange} />}
            {st.id === 'bank' && <BankForm status={status} onChange={onChange} />}
          </Step>
        ))}
      </ol>
      {pending && !current && <p className="rounded-2xl border border-line-strong px-4 py-3 text-sm text-mute">Your details are being checked. This usually takes a few minutes, sometimes a day. You can leave this page.</p>}
      {otherDue.length > 0 && !current && (
        <p className="rounded-2xl border border-signal/40 px-4 py-3 text-sm text-signal">
          We need a little more information that this page cannot collect yet. Please contact support and mention: {otherDue.join(', ')}.
        </p>
      )}
      {status.disabledReason?.startsWith('rejected') && <p className="rounded-2xl border border-signal/40 px-4 py-3 text-sm text-signal">Payouts could not be switched on for this account. Contact support.</p>}
    </div>
  )
}

function Step({ n, title, done, open, errors, children }: { n: number; title: string; done: boolean; open: boolean; errors: string[]; children: React.ReactNode }) {
  const [manual, setManual] = useState(false)
  const show = open || manual
  return (
    <li className={cn('rounded-3xl border p-5 md:p-6', open ? 'border-line-strong bg-white/[0.02]' : 'border-line')}>
      <button type="button" onClick={() => !open && setManual((v) => !v)} className="flex w-full items-center gap-4 text-left" aria-expanded={show}>
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-full border text-sm', done ? 'border-signal/0 bg-paper text-ink' : 'border-line-strong text-mute')}>{done ? <Check className="size-4" /> : n}</span>
        <span className="flex-1 font-medium">{title}</span>
        {done && !open && <ChevronDown className={cn('size-4 text-mute transition-transform', manual && 'rotate-180')} />}
      </button>
      {errors.map((e) => (
        <p key={e} role="alert" className="mt-3 text-sm text-signal">
          {e}
        </p>
      ))}
      {show && <div className="mt-5">{children}</div>}
    </li>
  )
}

function useSubmit(fn: () => Promise<void>) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (err) {
      setError(msg(err))
    }
    setBusy(false)
  }
  return { busy, error, run }
}

function Submit({ busy, error, label }: { busy: boolean; error: string; label: string }) {
  return (
    <div className="mt-5 grid gap-3">
      {error && (
        <p role="alert" className="text-sm text-signal">
          {error}
        </p>
      )}
      <div>
        <ActionButton type="submit" disabled={busy} className="rounded-full">
          {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {label}
        </ActionButton>
      </div>
    </div>
  )
}

function Start({ onChange }: { onChange: (s: ConnectStatus) => void }) {
  const [country, setCountry] = useState('')
  const [ok, setOk] = useState(false)
  const { busy, error, run } = useSubmit(async () => {
    if (!country) throw new Error('Choose the country your bank is in.')
    onChange(await createPayoutAccount(country, ok))
  })
  return (
    <Card title="Get paid">
      <form onSubmit={run} className="grid max-w-lg gap-5">
        <p className="text-sm text-mute">It takes about five minutes: who you are, an ID number, and where to send the money. Your details go to our payment partner, Stripe, who checks them and holds them. logoless never keeps your ID or bank numbers.</p>
        <Field label="Country of your bank account" hint="You cannot change this later.">
          <Select value={country} onChange={(e) => setCountry(e.target.value)} required>
            <option value="">Choose a country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <label className="flex items-start gap-3 text-sm text-mute">
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 size-4 accent-white" />
          <span>
            I agree to Stripe&apos;s{' '}
            <a href="https://stripe.com/legal/connect-account" target="_blank" rel="noopener noreferrer" className="text-paper underline">
              Connected Account Agreement
            </a>{' '}
            and{' '}
            <a href="https://stripe.com/legal/ssa" target="_blank" rel="noopener noreferrer" className="text-paper underline">
              Services Agreement
            </a>
            , which cover how my payouts are handled.
          </span>
        </label>
        <Submit busy={busy} error={error} label="Continue" />
      </form>
    </Card>
  )
}

function DetailsForm({ status, onChange }: { status: ConnectStatus; onChange: (s: ConnectStatus) => void }) {
  const c = countryOf(status.country)
  const [f, setF] = useState({ firstName: '', lastName: '', day: '', month: '', year: '', line1: '', line2: '', city: '', state: '', postalCode: '', phone: '' })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((v) => ({ ...v, [k]: e.target.value }))
  const { busy, error, run } = useSubmit(async () => {
    onChange(
      await savePayoutDetails({
        firstName: f.firstName,
        lastName: f.lastName,
        dob: { day: Number(f.day), month: Number(f.month), year: Number(f.year) },
        address: { line1: f.line1, line2: f.line2, city: f.city, state: f.state, postalCode: f.postalCode },
        phone: f.phone,
      }),
    )
  })
  return (
    <form onSubmit={run} className="grid max-w-lg gap-4">
      <p className="text-sm text-mute">Use your legal name and home address, exactly as on your ID.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name"><Input value={f.firstName} onChange={set('firstName')} autoComplete="given-name" required /></Field>
        <Field label="Last name"><Input value={f.lastName} onChange={set('lastName')} autoComplete="family-name" required /></Field>
      </div>
      <Field label="Date of birth">
        <div className="grid grid-cols-3 gap-3">
          <Input value={f.day} onChange={set('day')} inputMode="numeric" placeholder="DD" maxLength={2} aria-label="Day" required />
          <Input value={f.month} onChange={set('month')} inputMode="numeric" placeholder="MM" maxLength={2} aria-label="Month" required />
          <Input value={f.year} onChange={set('year')} inputMode="numeric" placeholder="YYYY" maxLength={4} aria-label="Year" required />
        </div>
      </Field>
      <Field label="Address"><Input value={f.line1} onChange={set('line1')} autoComplete="address-line1" required /></Field>
      <Field label="Flat, suite (optional)"><Input value={f.line2} onChange={set('line2')} autoComplete="address-line2" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City"><Input value={f.city} onChange={set('city')} autoComplete="address-level2" required /></Field>
        <Field label={c?.state ? 'State or province' : 'Region (optional)'}><Input value={f.state} onChange={set('state')} autoComplete="address-level1" required={c?.state} /></Field>
      </div>
      <Field label="Postcode"><Input value={f.postalCode} onChange={set('postalCode')} autoComplete="postal-code" required /></Field>
      <Field label="Phone" hint="With the country code, for example +44 7700 900000."><Input value={f.phone} onChange={set('phone')} type="tel" autoComplete="tel" required /></Field>
      <Submit busy={busy} error={error} label="Save and continue" />
    </form>
  )
}

function IdForm({ status, onChange }: { status: ConnectStatus; onChange: (s: ConnectStatus) => void }) {
  const wants = [...status.due, ...status.pastDue]
  const last4 = wants.includes('individual.ssn_last_4')
  const [v, setV] = useState('')
  const label = last4 ? 'Last 4 digits of your Social Security number' : status.country === 'US' ? 'Social Security number' : status.country === 'CA' ? 'Social Insurance Number' : 'National ID number'
  const { busy, error, run } = useSubmit(async () => {
    onChange(await savePayoutDetails(last4 ? { ssnLast4: v.trim() } : { idNumber: v.trim() }))
  })
  if (!wants.some((r) => sectionOf(r) === 'id')) return <p className="text-sm text-mute">Nothing more needed here.</p>
  return (
    <form onSubmit={run} className="grid max-w-lg gap-4">
      <p className="text-sm text-mute">Stripe uses this to confirm you are who you say you are. It is sent to Stripe and not kept by logoless.</p>
      <Field label={label}>
        <Input value={v} onChange={(e) => setV(e.target.value.replace(/[^\dA-Za-z-]/g, ''))} maxLength={last4 ? 4 : 20} inputMode={last4 ? 'numeric' : 'text'} autoComplete="off" required />
      </Field>
      <Submit busy={busy} error={error} label="Save and continue" />
    </form>
  )
}

function DocumentForm({ onChange }: { onChange: (s: ConnectStatus) => void }) {
  const [front, setFront] = useState<File | null>(null)
  const [back, setBack] = useState<File | null>(null)
  const { busy, error, run } = useSubmit(async () => {
    if (!front) throw new Error('Choose a photo of the front of your ID.')
    const documentFront = await uploadIdPhoto(front)
    const documentBack = back ? await uploadIdPhoto(back) : undefined
    onChange(await savePayoutDetails({ documentFront, documentBack }))
  })
  return (
    <form onSubmit={run} className="grid max-w-lg gap-4">
      <p className="text-sm text-mute">Passport, driving licence or national ID card. A clear colour photo with all four corners visible, JPG, PNG or PDF, under 9 MB. It goes to Stripe and is not kept by logoless.</p>
      <Field label="Front"><input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => setFront(e.target.files?.[0] ?? null)} className="block w-full text-sm text-mute file:mr-4 file:rounded-full file:border-0 file:bg-paper file:px-4 file:py-2 file:text-sm file:text-ink" /></Field>
      <Field label="Back (cards only)"><input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => setBack(e.target.files?.[0] ?? null)} className="block w-full text-sm text-mute file:mr-4 file:rounded-full file:border-0 file:bg-paper file:px-4 file:py-2 file:text-sm file:text-ink" /></Field>
      <Submit busy={busy} error={error} label="Upload" />
    </form>
  )
}

export function BankForm({ status, onChange, onDone }: { status: ConnectStatus; onChange: (s: ConnectStatus) => void; onDone?: () => void }) {
  const c = countryOf(status.country)
  const [name, setName] = useState('')
  const [a, setA] = useState('')
  const [b, setB] = useState('')
  const { busy, error, run } = useSubmit(async () => {
    if (!c) throw new Error('Pick your country first.')
    if (!status.publishableKey) throw new Error('Bank details are not switched on yet. Please contact support.')
    const clean = (x: string) => x.replace(/[\s-]/g, '')
    const token = await tokenizeBank(status.publishableKey, { country: c.code, currency: c.currency, name: name.trim(), routing: c.bank === 'iban' ? undefined : clean(b), account: clean(c.bank === 'iban' ? a.toUpperCase() : a) })
    onChange(await savePayoutBank(token))
    onDone?.()
  })
  if (!c) return null
  const labels: Record<string, [string, string]> = { us: ['Account number', 'Routing number (9 digits)'], gb: ['Account number (8 digits)', 'Sort code (6 digits)'], ca: ['Account number', 'Transit and institution number (5 + 3 digits)'], au: ['Account number', 'BSB (6 digits)'], iban: ['IBAN', ''] }
  const [aLabel, bLabel] = labels[c.bank]
  return (
    <form onSubmit={run} className="grid max-w-lg gap-4">
      <p className="flex items-start gap-2 text-sm text-mute">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Your numbers go straight to Stripe from this page. logoless only gets a one-time token, never the account number. Payouts are in {c.currency.toUpperCase()}.
      </p>
      <Field label="Name on the account"><Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" required /></Field>
      {c.bank !== 'iban' && <Field label={bLabel}><Input value={b} onChange={(e) => setB(e.target.value)} inputMode="numeric" autoComplete="off" required /></Field>}
      <Field label={aLabel}><Input value={a} onChange={(e) => setA(e.target.value)} inputMode={c.bank === 'iban' ? 'text' : 'numeric'} autoComplete="off" required /></Field>
      <Submit busy={busy} error={error} label="Save bank account" />
    </form>
  )
}
