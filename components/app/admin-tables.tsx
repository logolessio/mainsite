'use client'

import { AdminList } from './admin-list'
import { ActionButton } from './ui'
import { Badge } from './table'

// TODO(backend): replace the empty arrays with API data. Row shapes are the contract.

type Flag = { id: string; clipper: string; campaign: string; reason: string; severity: 'low' | 'medium' | 'high'; date: string }
export function FraudTable() {
  const rows: Flag[] = []
  return (
    <AdminList
      rows={rows}
      searchKeys={['clipper', 'campaign', 'reason']}
      filterLabel="Severity"
      filterKey="severity"
      filterOptions={['low', 'medium', 'high']}
      emptyTitle="No fraud flags"
      emptyBody="Suspicious clips surfaced by the checks will appear here."
      columns={[
        { key: 'c', header: 'Clipper', render: (r) => `@${r.clipper}` },
        { key: 'ca', header: 'Campaign', render: (r) => r.campaign },
        { key: 'r', header: 'Reason', render: (r) => r.reason },
        { key: 's', header: 'Severity', render: (r) => <Badge tone={r.severity === 'high' ? 'bad' : r.severity === 'medium' ? 'warn' : 'neutral'}>{r.severity}</Badge> },
        { key: 'd', header: 'Date', render: (r) => r.date },
        { key: 'a', header: '', render: () => <ActionButton variant="ghost">Review</ActionButton>, className: 'text-right' },
      ]}
    />
  )
}

type Camp = { id: string; title: string; brand: string; status: 'draft' | 'live' | 'paused' | 'ended'; budget: number; clips: number }
export function CampaignsTable() {
  const rows: Camp[] = []
  return (
    <AdminList
      rows={rows}
      searchKeys={['title', 'brand']}
      filterLabel="Status"
      filterKey="status"
      filterOptions={['draft', 'live', 'paused', 'ended']}
      emptyTitle="No campaigns"
      columns={[
        { key: 't', header: 'Campaign', render: (r) => r.title },
        { key: 'b', header: 'Brand', render: (r) => r.brand },
        { key: 's', header: 'Status', render: (r) => <Badge tone={r.status === 'live' ? 'good' : 'neutral'}>{r.status}</Badge> },
        { key: 'bu', header: 'Budget', render: (r) => `$${r.budget.toLocaleString()}`, className: 'text-right' },
        { key: 'c', header: 'Clips', render: (r) => r.clips, className: 'text-right' },
        { key: 'a', header: '', render: () => <ActionButton variant="ghost">Pause</ActionButton>, className: 'text-right' },
      ]}
    />
  )
}

type User = { id: string; name: string; email: string; role: 'clipper' | 'brand' | 'admin'; status: 'active' | 'suspended'; joined: string }
export function UsersTable() {
  const rows: User[] = []
  return (
    <AdminList
      rows={rows}
      searchKeys={['name', 'email']}
      filterLabel="Roles"
      filterKey="role"
      filterOptions={['clipper', 'brand', 'admin']}
      emptyTitle="No users"
      emptyBody="Accounts will be listed here once people sign up."
      columns={[
        { key: 'n', header: 'Name', render: (r) => r.name },
        { key: 'e', header: 'Email', render: (r) => r.email },
        { key: 'r', header: 'Role', render: (r) => <Badge>{r.role}</Badge> },
        { key: 's', header: 'Status', render: (r) => <Badge tone={r.status === 'active' ? 'good' : 'bad'}>{r.status}</Badge> },
        { key: 'j', header: 'Joined', render: (r) => r.joined },
        { key: 'a', header: '', render: (r) => <ActionButton variant={r.status === 'active' ? 'danger' : 'ghost'}>{r.status === 'active' ? 'Suspend' : 'Restore'}</ActionButton>, className: 'text-right' },
      ]}
    />
  )
}

export type PayoutRow = { id: string; clipper: string; amount: number; status: 'pending' | 'sent' | 'failed' | 'reversed'; date: string; stripeId: string; note: string }
export function PayoutsTable({ rows }: { rows: PayoutRow[] }) {
  return (
    <AdminList
      rows={rows}
      searchKeys={['clipper', 'stripeId']}
      filterLabel="Status"
      filterKey="status"
      filterOptions={['pending', 'sent', 'failed', 'reversed']}
      emptyTitle="No payouts"
      emptyBody="Withdrawals made through Stripe appear here."
      columns={[
        { key: 'c', header: 'Clipper', render: (r) => r.clipper },
        { key: 'a', header: 'Amount', render: (r) => `$${r.amount.toFixed(2)}` },
        { key: 's', header: 'Status', render: (r) => <Badge tone={r.status === 'sent' ? 'good' : r.status === 'pending' ? 'warn' : 'bad'}>{r.status}</Badge> },
        {
          key: 'st',
          header: 'Stripe transfer',
          render: (r) =>
            r.stripeId ? (
              <a href={`https://dashboard.stripe.com/connect/transfers/${r.stripeId}`} target="_blank" rel="noreferrer" className="font-mono text-xs underline underline-offset-4">
                {r.stripeId}
              </a>
            ) : (
              <span className="text-xs text-mute">{r.note || '-'}</span>
            ),
        },
        { key: 'd', header: 'Date', render: (r) => r.date },
      ]}
    />
  )
}

type Log = { id: string; actor: string; action: string; target: string; date: string }
export function AuditTable() {
  const rows: Log[] = []
  return (
    <AdminList
      rows={rows}
      searchKeys={['actor', 'action', 'target']}
      emptyTitle="No activity logged"
      emptyBody="Every admin action is recorded here."
      columns={[
        { key: 'd', header: 'When', render: (r) => r.date },
        { key: 'a', header: 'Admin', render: (r) => r.actor },
        { key: 'ac', header: 'Action', render: (r) => r.action },
        { key: 't', header: 'Target', render: (r) => r.target },
      ]}
    />
  )
}
