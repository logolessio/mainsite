import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { Checklist } from '@/components/app/checklist'
import { Badge, DataTable, EmptyState } from '@/components/app/table'
import { Card, PageHeader, StatCard } from '@/components/app/ui'
import { db } from '@/lib/db'
import { balances } from '@/lib/ledger'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Dashboard — logoless', robots: { index: false } }

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default async function Page() {
  const user = await pageUser()
  const d = await db()
  const [b, views, recent] = await Promise.all([
    balances(user.id),
    d.prepare('SELECT COALESCE(SUM(views_verified), 0) AS v, COUNT(*) AS n FROM submissions WHERE user_id = ?1').bind(user.id).first<{ v: number; n: number }>(),
    d
      .prepare('SELECT s.id, s.status, s.views_verified, c.title FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1 ORDER BY s.created_at DESC LIMIT 5')
      .bind(user.id)
      .all<{ id: string; status: string; views_verified: number; title: string }>(),
  ])
  return (
    <>
      <PageHeader title="Overview" sub="Your balance, clips and what to do next." actions={<ActionLink href="/">Find a campaign</ActionLink>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available" value={usd(b.available)} note="Ready to withdraw" />
        <StatCard label="Pending" value={usd(b.pending)} note="Clearing" />
        <StatCard label="Total earned" value={usd(b.earned)} />
        <StatCard label="Verified views" value={(views?.v ?? 0).toLocaleString()} note={`${views?.n ?? 0} clips`} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card title="Recent clips">
          <DataTable
            rows={recent.results}
            columns={[
              { key: 'c', header: 'Campaign', render: (r) => r.title },
              { key: 's', header: 'Status', render: (r) => <Badge tone={r.status === 'approved' ? 'good' : r.status === 'rejected' ? 'bad' : 'warn'}>{r.status}</Badge> },
              { key: 'v', header: 'Views', render: (r) => r.views_verified.toLocaleString(), className: 'text-right' },
            ]}
            empty={<EmptyState icon="Clapperboard" title="No clips yet" body="Join a campaign, post your clip and submit the link. It will show up here." action={<ActionLink href="/">Browse campaigns</ActionLink>} />}
          />
        </Card>
        <Card title="Get set up">
          <Checklist
            items={[
              { label: 'Make your profile yours', body: 'Banner, colours, font and links', href: '/dashboard/profile' },
              { label: 'Link a social account', body: 'TikTok, YouTube or Instagram', href: '/dashboard/accounts' },
              { label: 'Connect Stripe', body: 'So you can withdraw your earnings', href: '/dashboard/payouts' },
              { label: 'Join your first campaign', body: 'Pick something you would actually clip', href: '/' },
            ]}
          />
        </Card>
      </div>
    </>
  )
}
