import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { Checklist } from '@/components/app/checklist'
import { Badge, DataTable, EmptyState } from '@/components/app/table'
import { Card, PageHeader, StatCard } from '@/components/app/ui'
import { CAMPAIGN_STATUS } from '@/lib/campaign-status'
import { db } from '@/lib/db'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Brand dashboard | logoless', robots: { index: false } }

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default async function Page() {
  const user = await pageUser()
  const d = await db()
  const [stats, rows] = await Promise.all([
    d
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM campaigns WHERE brand_user_id = ?1 AND status = 'live') AS live,
           (SELECT COALESCE(SUM(views_verified), 0) FROM submissions WHERE campaign_id IN (SELECT id FROM campaigns WHERE brand_user_id = ?1)) AS views,
           (SELECT COALESCE(-SUM(amount_cents), 0) FROM ledger WHERE user_id = ?1 AND account = 'campaign' AND kind = 'spend') AS spent,
           (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger WHERE user_id = ?1 AND account = 'campaign') AS held`,
      )
      .bind(user.id)
      .first<{ live: number; views: number; spent: number; held: number }>(),
    d.prepare('SELECT id, title, status FROM campaigns WHERE brand_user_id = ?1 ORDER BY created_at DESC LIMIT 6').bind(user.id).all<{ id: string; title: string; status: string }>(),
  ])
  return (
    <>
      <PageHeader title="Overview" sub="Spend, reach and what is live." actions={<ActionLink href="/brand/campaigns/new">Request a campaign</ActionLink>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Budget remaining" value={usd(stats?.held ?? 0)} note="Across your campaigns" />
        <StatCard label="Live campaigns" value={String(stats?.live ?? 0)} />
        <StatCard label="Verified views" value={(stats?.views ?? 0).toLocaleString()} />
        <StatCard label="Spent" value={usd(stats?.spent ?? 0)} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card title="Campaigns">
          <DataTable
            rows={rows.results}
            columns={[
              { key: 't', header: 'Campaign', render: (r) => r.title },
              { key: 's', header: 'Status', render: (r) => <Badge tone={CAMPAIGN_STATUS[r.status]?.tone}>{CAMPAIGN_STATUS[r.status]?.brand ?? r.status}</Badge> },
            ]}
            empty={<EmptyState icon="Megaphone" title="No campaigns yet" body="Tell us about your campaign. We review it, you pay, we launch it." action={<ActionLink href="/brand/campaigns/new">Request a campaign</ActionLink>} />}
          />
        </Card>
        <Card title="How it works">
          <Checklist
            items={[
              { label: 'Request a campaign', body: 'Brief, rate, budget and platforms', href: '/brand/campaigns/new' },
              { label: 'We review and confirm', body: 'You will get a notification', href: '/brand/campaigns' },
              { label: 'Pay securely with Stripe', body: 'Your budget is held for clippers', href: '/brand/campaigns' },
              { label: 'We launch it', body: 'Clippers start posting right away', href: '/brand/campaigns' },
            ]}
          />
        </Card>
      </div>
    </>
  )
}
