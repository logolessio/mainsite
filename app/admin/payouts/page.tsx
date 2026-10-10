import type { Metadata } from 'next'
import { PayoutsTable, type PayoutRow } from '@/components/app/admin-tables'
import { PageHeader } from '@/components/app/ui'
import { db } from '@/lib/db'

export const metadata: Metadata = { title: 'Payouts — logoless', robots: { index: false } }

async function load(): Promise<{ rows: PayoutRow[]; error?: string }> {
  try {
    const d = await db()
    const r = await d
      .prepare(
        `SELECT p.id, p.amount_cents, p.status, p.stripe_transfer_id, p.failure, p.created_at, u.email
         FROM payouts p JOIN users u ON u.id = p.user_id ORDER BY p.created_at DESC LIMIT 200`,
      )
      .all<{ id: string; amount_cents: number; status: PayoutRow['status']; stripe_transfer_id: string | null; failure: string | null; created_at: number; email: string }>()
    return {
      rows: r.results.map((p) => ({
        id: p.id,
        clipper: p.email,
        amount: p.amount_cents / 100,
        status: p.status,
        date: new Date(p.created_at * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
        stripeId: p.stripe_transfer_id ?? '',
        note: p.failure ?? '',
      })),
    }
  } catch (e) {
    return { rows: [], error: e instanceof Error ? e.message : 'Could not load payouts.' }
  }
}

export default async function Page() {
  const { rows, error } = await load()
  return (
    <>
      <PageHeader title="Payouts" sub="Withdrawals sent through Stripe." />
      {error && <p className="mb-4 rounded-2xl border border-signal/40 px-4 py-3 text-sm text-signal">{error}</p>}
      <PayoutsTable rows={rows} />
    </>
  )
}
