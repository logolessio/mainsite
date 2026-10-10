import type { Metadata } from 'next'

import { Card, PageHeader, StatCard } from '@/components/app/ui'
import { DataTable, EmptyState } from '@/components/app/table'

export const metadata: Metadata = { title: 'Earnings — logoless', robots: { index: false } }

type Row = { id: string; date: string; campaign: string; views: number; amount: number }

export default function Page() {
  const rows: Row[] = [] // TODO(backend): per-campaign earnings ledger
  return (
    <>
      <PageHeader title="Earnings" sub="What your clips have earned, by campaign." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="This month" value="$0.00" />
        <StatCard label="Pending" value="$0.00" note="Clears after verification" />
        <StatCard label="Lifetime" value="$0.00" />
      </div>
      <Card title="Earnings over time" className="mt-6">
        <EmptyState icon="CircleDollarSign" title="No earnings yet" body="Your chart will appear here once your first clip is verified." />
      </Card>
      <h2 className="mt-10 mb-4 font-display text-3xl">Ledger</h2>
      <DataTable
        rows={rows}
        columns={[
          { key: 'd', header: 'Date', render: (r) => r.date },
          { key: 'c', header: 'Campaign', render: (r) => r.campaign },
          { key: 'v', header: 'Views', render: (r) => r.views.toLocaleString(), className: 'text-right' },
          { key: 'a', header: 'Amount', render: (r) => `$${r.amount.toFixed(2)}`, className: 'text-right' },
        ]}
        empty={<EmptyState title="Ledger is empty" />}
      />
    </>
  )
}
