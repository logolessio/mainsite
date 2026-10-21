import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { SubmissionsTable, type SubmissionRow } from '@/components/app/submissions-table'
import { EmptyState } from '@/components/app/table'
import { PageHeader } from '@/components/app/ui'
import { db } from '@/lib/db'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Submissions | logoless', robots: { index: false } }

export default async function Page() {
  const user = await pageUser()
  const d = await db()
  const rows = (
    await d
      .prepare(
        `SELECT s.id, c.title AS campaign, s.platform, s.url, s.status, s.views_verified, s.earned_cents, s.created_at
         FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1 AND s.status != 'removed' ORDER BY s.created_at DESC LIMIT 200`,
      )
      .bind(user.id)
      .all<{ id: string; campaign: string; platform: string; url: string; status: SubmissionRow['status']; views_verified: number; earned_cents: number; created_at: number }>()
  ).results.map((r) => ({
    id: r.id,
    campaign: r.campaign,
    platform: r.platform,
    url: r.url,
    status: r.status,
    views: r.views_verified,
    earned: r.earned_cents / 100,
    submittedAt: new Date(r.created_at * 1000).toLocaleDateString('en-GB'),
  }))
  return (
    <>
      <PageHeader title="Submissions" sub="Every submission you've submitted and where it stands. YouTube and TikTok views are checked about every two hours while a campaign is running." actions={<ActionLink href="/">Submit content</ActionLink>} />
      <SubmissionsTable rows={rows} empty={<EmptyState icon="Clapperboard" title="Nothing submitted" body="Content you submit to campaigns will appear here with their review status." />} />
    </>
  )
}
