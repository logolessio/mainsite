'use client'

import { Badge, type Column, DataTable } from './table'

export type SubmissionRow = {
  id: string
  campaign: string
  platform: string
  url: string
  status: 'pending' | 'approved' | 'rejected'
  views: number
  earned: number
  submittedAt: string
}

const cols: Column<SubmissionRow>[] = [
  { key: 'c', header: 'Campaign', render: (r) => r.campaign },
  { key: 'p', header: 'Platform', render: (r) => r.platform },
  {
    key: 'l',
    header: 'Link',
    render: (r) => (
      <a href={r.url} className="underline underline-offset-4 hover:text-paper" target="_blank" rel="noreferrer">
        Open
      </a>
    ),
  },
  {
    key: 's',
    header: 'Status',
    render: (r) => <Badge tone={r.status === 'approved' ? 'good' : r.status === 'rejected' ? 'bad' : 'warn'}>{r.status}</Badge>,
  },
  { key: 'v', header: 'Verified views', render: (r) => r.views.toLocaleString(), className: 'text-right' },
  { key: 'e', header: 'Earned', render: (r) => `$${r.earned.toFixed(2)}`, className: 'text-right' },
]

export function SubmissionsTable({ rows, empty }: { rows: SubmissionRow[]; empty: React.ReactNode }) {
  return <DataTable columns={cols} rows={rows} empty={empty} />
}
