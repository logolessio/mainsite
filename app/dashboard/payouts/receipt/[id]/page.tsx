import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PrintButton } from '@/components/extras/print-button'
import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Receipt | logoless', robots: { index: false } }

/** A receipt for one withdrawal, laid out to print or save as a PDF. Only the person it was paid to can open it. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await pageUser()
  if (!(await featureOn('payout-receipts'))) notFound()
  const { id } = await params
  if (!/^[\w-]{6,64}$/.test(id)) notFound()
  const d = await db()
  const p = await d.prepare('SELECT id, amount_cents, status, created_at FROM payouts WHERE id = ?1 AND user_id = ?2').bind(id, user.id).first<{ id: string; amount_cents: number; status: string; created_at: number }>()
  if (!p) notFound()
  const when = new Date(p.created_at * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  const state: Record<string, string> = { sent: 'Paid', pending: 'Being sent', review: 'Being checked', failed: 'Failed, the money was returned', reversed: 'Returned' }
  return (
    <div className="mx-auto max-w-xl rounded-card border border-line-strong bg-white/[0.03] p-8 print:border-0 print:bg-white print:text-black md:p-10">
      <p className="font-display text-3xl">logoless</p>
      <h1 className="mt-10 text-sm text-mute print:text-black/60">Receipt for a withdrawal</h1>
      <p className="mt-1 font-display text-6xl leading-none tabular-nums">${(p.amount_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
      <dl className="mt-10 grid gap-4 border-t border-line pt-6 text-[15px] print:border-black/20">
        <Row k="Paid to" v={user.name ?? user.email} />
        <Row k="Date" v={when} />
        <Row k="Status" v={state[p.status] ?? p.status} />
        <Row k="How" v="PayPal. We cover PayPal's fees, so the whole amount is sent." />
        <Row k="Reference" v={p.id} mono />
      </dl>
      <p className="mt-8 text-xs leading-relaxed text-mute print:text-black/60">This is a record of a payment made by logoless. It is not an invoice, and it is not tax advice.</p>
      <div className="mt-8 print:hidden">
        <PrintButton />
      </div>
    </div>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-6 gap-y-1">
      <dt className="text-mute print:text-black/60">{k}</dt>
      <dd className={mono ? 'font-mono text-sm break-all' : 'text-right'}>{v}</dd>
    </div>
  )
}
