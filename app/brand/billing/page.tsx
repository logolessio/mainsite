import type { Metadata } from 'next'
import { Badge, DataTable, EmptyState } from '@/components/app/table'
import { PageHeader } from '@/components/app/ui'
import { db } from '@/lib/db'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Billing — logoless', robots: { index: false } }

type Row = { id: string; title: string | null; amount_cents: number; status: string; receipt_url: string | null; created_at: number }

export default async function Page() {
  const user = await pageUser()
  const d = await db()
  const rows = (
    await d
      .prepare(
        `SELECT t.id, c.title, t.amount_cents, t.status, t.receipt_url, t.created_at
         FROM topups t LEFT JOIN campaigns c ON c.id = t.campaign_id WHERE t.user_id = ?1 AND t.status <> 'open' ORDER BY t.created_at DESC LIMIT 100`,
      )
      .bind(user.id)
      .all<Row>()
  ).results
  return (
    <>
      <PageHeader title="Billing" sub="Every payment you have made for a campaign, with the Stripe receipt." />
      <DataTable
        rows={rows}
        columns={[
          { key: 'd', header: 'Date', render: (r) => new Date(r.created_at * 1000).toLocaleDateString('en-US', { dateStyle: 'medium' }) },
          { key: 'c', header: 'Campaign', render: (r) => r.title ?? 'Balance' },
          { key: 'a', header: 'Amount', render: (r) => `$${(r.amount_cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, className: 'text-right' },
          { key: 's', header: 'Status', render: (r) => <Badge tone={r.status === 'paid' ? 'good' : r.status === 'disputed' ? 'bad' : 'neutral'}>{r.status}</Badge> },
          { key: 'r', header: 'Receipt', render: (r) => (r.receipt_url ? <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">View</a> : '—') },
        ]}
        empty={<EmptyState icon="CreditCard" title="No payments yet" body="Payments appear here once you pay for an approved campaign." />}
      />
    </>
  )
}
