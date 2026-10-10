import type { Metadata } from 'next'

import { ActionLink } from '@/components/app/action-link'
import { PageHeader } from '@/components/app/ui'
import { Badge, DataTable, EmptyState } from '@/components/app/table'

export const metadata: Metadata = { title: 'Campaigns — logoless', robots: { index: false } }

type Row = { id: string; title: string; status: 'draft' | 'live' | 'paused' | 'ended'; budget: number; spent: number; views: number; clips: number }

export default function Page() {
  const rows: Row[] = [] // TODO(backend): campaigns owned by this brand
  return (
    <>
      <PageHeader title="Campaigns" actions={<ActionLink href="/brand/campaigns/new">New campaign</ActionLink>} />
      <DataTable
        rows={rows}
        columns={[
          { key: 't', header: 'Campaign', render: (r) => r.title },
          { key: 's', header: 'Status', render: (r) => <Badge tone={r.status === 'live' ? 'good' : 'neutral'}>{r.status}</Badge> },
          { key: 'b', header: 'Budget', render: (r) => `$${r.budget.toLocaleString()}`, className: 'text-right' },
          { key: 'sp', header: 'Spent', render: (r) => `$${r.spent.toLocaleString()}`, className: 'text-right' },
          { key: 'v', header: 'Views', render: (r) => r.views.toLocaleString(), className: 'text-right' },
          { key: 'c', header: 'Clips', render: (r) => r.clips, className: 'text-right' },
        ]}
        empty={<EmptyState icon="Megaphone" title="No campaigns" body="Your campaigns will be listed here." action={<ActionLink href="/brand/campaigns/new">Create a campaign</ActionLink>} />}
      />
    </>
  )
}
