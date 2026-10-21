import type { Metadata } from 'next'
import { AdminButton } from '@/components/admin/ui'
import { Badge, EmptyState } from '@/components/app/table'
import { Card, PageHeader, StatCard } from '@/components/app/ui'
import { ClientTour } from '@/components/brand/client-tour'
import { FirstSubmissionGuide } from '@/components/brand/first-submission-guide'
import { guidesSeen } from '@/lib/client-guide'
import { featureOn } from '@/lib/features'
import { db } from '@/lib/db'
import { money, when } from '@/lib/format'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Submissions | logoless', robots: { index: false } }

type Row = {
  id: string
  campaign: string
  platform: string
  url: string
  status: string
  views_verified: number
  earned_cents: number
  reject_reason: string | null
  created_at: number
  handle: string | null
  display_name: string | null
}

export default async function Page() {
  const user = await pageUser()
  const d = await db()
  const rows = (
    await d
      .prepare(
        `SELECT s.id, c.title AS campaign, s.platform, s.url, s.status, s.views_verified, s.earned_cents, s.reject_reason, s.created_at, p.handle, p.display_name
         FROM submissions s JOIN campaigns c ON c.id = s.campaign_id LEFT JOIN profiles p ON p.user_id = s.user_id
         WHERE c.brand_user_id = ?1 AND s.status != 'removed' ORDER BY CASE s.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, s.created_at DESC LIMIT 200`,
      )
      .bind(user.id)
      .all<Row>()
  ).results
  const pending = rows.filter((r) => r.status === 'pending')
  const views = rows.reduce((a, r) => a + r.views_verified, 0)
  // the walkthrough points at the first card on the page, and at the first "Turn down" there is
  const shown = [...pending, ...rows.filter((r) => r.status !== 'pending')]
  const firstCard = shown[0]?.id
  const firstTurnDown = shown.find((r) => r.status !== 'rejected' && r.views_verified === 0)?.id
  // removed submissions are hidden here, but they still count as "a first submission arrived"
  const tourOn = await featureOn('client-tour')
  const firstSub = tourOn && rows.length > 0 && !(await guidesSeen(user.id))['first-submission']

  const list = (items: Row[], empty: string) =>
    items.length === 0 ? (
      <Card>
        <EmptyState icon="Clapperboard" title={empty} />
      </Card>
    ) : (
      <div className="grid gap-3">
        {items.map((r) => (
          <div key={r.id} data-tour={r.id === firstCard ? 'submission' : undefined}>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2">
                  {r.handle ? (
                    <a href={`/@${r.handle}`} className="hover:underline">
                      {r.display_name ?? `@${r.handle}`}
                    </a>
                  ) : (
                    'A creator'
                  )}
                  <span className="text-sm text-mute">on {r.campaign}</span>
                  <Badge tone={r.status === 'approved' ? 'good' : r.status === 'rejected' ? 'bad' : 'warn'}>{r.status === 'pending' ? 'waiting for a check' : r.status}</Badge>
                </p>
                <p className="mt-1 text-xs text-mute">
                  {r.platform} · posted {when(r.created_at)} · {r.views_verified.toLocaleString()} verified views · {money(r.earned_cents)} paid to the creator
                </p>
                {r.reject_reason && <p className="mt-1 text-xs text-mute">Reason given: {r.reject_reason}</p>}
                <a href={r.url} data-tour={r.id === firstCard ? 'watch' : undefined} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-block max-w-full truncate text-sm underline underline-offset-4 hover:text-paper">
                  Watch the submission
                </a>
              </div>
              {r.status !== 'rejected' && r.views_verified === 0 && (
                <span data-tour={r.id === firstTurnDown ? 'turn-down' : undefined} className="inline-flex">
                <AdminButton variant="danger" url={`/api/brand/submissions/${r.id}`} data={{ action: 'reject' }} ask={{ label: 'Why? The creator will see this', key: 'reason', required: true }}>
                  Turn down
                </AdminButton>
                </span>
              )}
            </div>
          </Card>
          </div>
        ))}
      </div>
    )

  return (
    <>
      <PageHeader title="Submissions" sub="Every submission made for your campaigns. We check the real views before anyone is paid, and you can turn down anything off-brief." />
      {tourOn && <ClientTour />}
      {firstSub && <FirstSubmissionGuide />}
      <div data-tour="submission-stats" className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Submissions made" value={String(rows.length)} />
        <StatCard label="Waiting for a check" value={String(pending.length)} />
        <StatCard label="Verified views" value={views.toLocaleString()} />
      </div>
      <h2 className="mt-10 mb-4 font-display text-2xl">Waiting for a check</h2>
      {list(pending, 'Nothing waiting')}
      <h2 className="mt-10 mb-4 font-display text-2xl">Everything else</h2>
      {list(rows.filter((r) => r.status !== 'pending'), 'No other submissions yet')}
    </>
  )
}
