import type { Metadata } from 'next'
import { ReviewControls } from '@/components/admin/review-row'
import { when } from '@/lib/format'
import { Badge, EmptyState } from '@/components/app/table'
import { Card, PageHeader } from '@/components/app/ui'
import { db } from '@/lib/db'
import { pageAdmin } from '@/lib/user'
import { ViewChecks } from '@/components/admin/view-checks'
import { Tabbed } from '@/components/admin/tabbed'

export const metadata: Metadata = { title: 'Submissions | logoless', robots: { index: false } }

type Row = {
  id: string
  platform: string
  url: string
  status: string
  views_verified: number
  earned_cents: number
  created_at: number
  campaign: string
  rate_cents: number
  email: string
  handle: string | null
  risk_level: string
}

export default async function Page() {
  await pageAdmin()
  const d = await db()
  const rows = (
    await d
      .prepare(
        `SELECT s.id, s.platform, s.url, s.status, s.views_verified, s.earned_cents, s.created_at, c.title AS campaign, c.rate_cents,
           u.email, p.handle, u.risk_level
         FROM submissions s JOIN campaigns c ON c.id = s.campaign_id JOIN users u ON u.id = s.user_id LEFT JOIN profiles p ON p.user_id = u.id
         ORDER BY CASE s.status WHEN 'pending' THEN 0 ELSE 1 END, s.created_at DESC LIMIT 150`,
      )
      .all<Row>()
  ).results
  const pending = rows.filter((r) => r.status === 'pending')
  const rest = rows.filter((r) => r.status !== 'pending')

  const list = (items: Row[], empty: string) =>
    items.length === 0 ? (
      <Card><EmptyState icon="CheckCircle2" title={empty} /></Card>
    ) : (
      <div className="grid gap-3">
        {items.map((r) => (
          <div key={r.id} data-kb-row>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  {r.handle ? `@${r.handle}` : r.email} <span className="text-sm text-mute">on {r.campaign}</span>
                  <Badge tone={r.status === 'approved' ? 'good' : r.status === 'rejected' ? 'bad' : 'warn'}>{r.status}</Badge>
                  {r.risk_level !== 'low' && <Badge tone="warn">extra checks</Badge>}
                </p>
                <p className="mt-1 text-xs text-mute">
                  {r.platform} · submitted {when(r.created_at)} · {r.views_verified.toLocaleString()} verified views · ${(r.earned_cents / 100).toFixed(2)} earned
                </p>
                <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" data-key="o" data-key-label="Open the clip" aria-keyshortcuts="o" className="mt-1 inline-block max-w-full truncate text-sm underline underline-offset-4 hover:text-paper">
                  {r.url}
                </a>
              </div>
              <ReviewControls id={r.id} status={r.status} views={r.views_verified} rateCents={r.rate_cents} />
            </div>
          </Card>
          </div>
        ))}
      </div>
    )

  const approved = rest.filter((r) => r.status === 'approved')
  const rejected = rest.filter((r) => r.status === 'rejected')

  return (
    <>
      <PageHeader title="Submissions" sub="Open the clip, check the views on the platform, enter the verified number and approve. Paying is the same step." />
      <ViewChecks />
      <Tabbed
        initial={pending.length > 0 ? 'waiting' : 'approved'}
        tabs={[
          { id: 'waiting', label: 'Waiting', count: pending.length, hot: true, node: list(pending, 'Queue is clear') },
          { id: 'approved', label: 'Approved', count: approved.length, node: list(approved, 'Nothing approved yet') },
          { id: 'rejected', label: 'Rejected', count: rejected.length, node: list(rejected, 'Nothing rejected') },
        ]}
      />
    </>
  )
}
