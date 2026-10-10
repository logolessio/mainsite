import type { Metadata } from 'next'
import { EarningForm } from '@/components/app/earning-form'
import { DataTable, EmptyState } from '@/components/app/table'
import { PageHeader } from '@/components/app/ui'
import { db } from '@/lib/db'

export const metadata: Metadata = { title: 'Earnings — logoless', robots: { index: false } }

type Row = { id: string; brand: string; clipper: string; campaign: string | null; gross_cents: number; fee_cents: number; net_cents: number; created_at: number }

async function recent(): Promise<Row[]> {
  try {
    const d = await db()
    const r = await d
      .prepare(
        `SELECT e.id, b.email AS brand, c.email AS clipper, e.campaign, e.gross_cents, e.fee_cents, e.net_cents, e.created_at
         FROM earnings e JOIN users b ON b.id = e.brand_user_id JOIN users c ON c.id = e.clipper_user_id
         ORDER BY e.created_at DESC LIMIT 50`,
      )
      .all<Row>()
    return r.results
  } catch {
    return []
  }
}

const usd = (c: number) => `$${(c / 100).toFixed(2)}`

export default async function Page() {
  const rows = await recent()
  return (
    <>
      <PageHeader title="Earnings" sub="Pay clippers from a brand's balance. Use this until views are verified automatically." />
      <div className="grid gap-8">
        <EarningForm />
        <div>
          <h2 className="mb-4 font-display text-3xl">Recent</h2>
          <DataTable
            rows={rows}
            columns={[
              { key: 'd', header: 'Date', render: (r) => new Date(r.created_at * 1000).toLocaleDateString('en-US', { dateStyle: 'medium' }) },
              { key: 'b', header: 'Brand', render: (r) => r.brand },
              { key: 'c', header: 'Clipper', render: (r) => r.clipper },
              { key: 'g', header: 'Gross', render: (r) => usd(r.gross_cents), className: 'text-right' },
              { key: 'f', header: 'Fee', render: (r) => usd(r.fee_cents), className: 'text-right' },
              { key: 'n', header: 'Net', render: (r) => usd(r.net_cents), className: 'text-right' },
            ]}
            empty={<EmptyState title="Nothing credited yet" />}
          />
        </div>
      </div>
    </>
  )
}
