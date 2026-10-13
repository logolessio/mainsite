import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { PayCampaignButton } from '@/components/app/pay-campaign-button'
import { costFor } from '@/lib/ledger-math'
import { Badge, DataTable, EmptyState } from '@/components/app/table'
import { PageHeader } from '@/components/app/ui'
import { CAMPAIGN_STATUS } from '@/lib/campaign-status'
import { db } from '@/lib/db'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Campaigns | logoless', robots: { index: false } }

type Row = {
  id: string
  title: string
  status: string
  budget_cents: number
  admin_note: string | null
  spent: number
  clips: number
  views: number
}

export default async function Page({ searchParams }: { searchParams: Promise<{ requested?: string; paid?: string; cancelled?: string }> }) {
  const user = await pageUser()
  const q = await searchParams
  const d = await db()
  const rows = (
    await d
      .prepare(
        `SELECT c.id, c.title, c.status, c.budget_cents, c.admin_note,
           COALESCE((SELECT -SUM(amount_cents) FROM ledger WHERE campaign_id = c.id AND account = 'campaign' AND kind = 'spend'), 0) AS spent,
           (SELECT COUNT(*) FROM submissions WHERE campaign_id = c.id) AS clips,
           COALESCE((SELECT SUM(views_verified) FROM submissions WHERE campaign_id = c.id), 0) AS views
         FROM campaigns c WHERE c.brand_user_id = ?1 ORDER BY c.created_at DESC`,
      )
      .bind(user.id)
      .all<Row>()
  ).results
  const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

  return (
    <>
      <PageHeader title="Campaigns" sub="Request a campaign, pay once we confirm it, and we launch it." actions={<ActionLink href="/brand/campaigns/new">Request a campaign</ActionLink>} />
      {q.requested && <p role="status" className="mb-4 rounded-2xl border border-line-strong px-4 py-3 text-sm">Request sent. We will review it and tell you the next step here and in your notifications.</p>}
      {q.paid && <p role="status" className="mb-4 rounded-2xl border border-line-strong px-4 py-3 text-sm">Payment received. We will launch your campaign shortly.</p>}
      {q.cancelled && <p role="status" className="mb-4 rounded-2xl border border-line px-4 py-3 text-sm text-mute">Payment cancelled. You have not been charged.</p>}
      <DataTable
        rows={rows}
        columns={[
          { key: 't', header: 'Campaign', render: (r) => <span>{r.title}{r.admin_note && r.status !== 'live' ? <span className="mt-0.5 block text-xs text-mute">{r.admin_note}</span> : null}</span> },
          { key: 's', header: 'Status', render: (r) => <Badge tone={CAMPAIGN_STATUS[r.status]?.tone ?? 'neutral'}>{CAMPAIGN_STATUS[r.status]?.brand ?? r.status}</Badge> },
          { key: 'b', header: 'Budget', render: (r) => usd(r.budget_cents), className: 'text-right' },
          { key: 'sp', header: 'Spent', render: (r) => usd(r.spent), className: 'text-right' },
          { key: 'v', header: 'Views', render: (r) => r.views.toLocaleString(), className: 'text-right' },
          { key: 'c', header: 'Clips', render: (r) => r.clips, className: 'text-right' },
          { key: 'a', header: '', render: (r) => (r.status === 'awaiting_payment' ? <PayCampaignButton id={r.id} amount={usd(costFor(r.budget_cents))} /> : null), className: 'text-right' },
        ]}
        empty={<EmptyState icon="Megaphone" title="No campaigns" body="Request a campaign and we will walk you through the rest." action={<ActionLink href="/brand/campaigns/new">Request a campaign</ActionLink>} />}
      />
    </>
  )
}
