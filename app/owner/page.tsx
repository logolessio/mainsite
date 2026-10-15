import type { Metadata } from 'next'
import { Hub } from '@/components/app/hub'
import { counts } from '@/lib/admin-stats'
import { ADMIN_HUB, DEV_HUB, type HubGroup } from '@/lib/hubs'
import { newInquiryCount } from '@/lib/inquiries'
import { getSession } from '@/lib/session'
import { connection } from 'next/server'

export const metadata: Metadata = { title: 'Owner | logoless', robots: { index: false } }

/** Everything the team can open, as one grid. Admin sections show a number when something is waiting there. */
export default async function Page() {
  await connection()
  const roles = (await getSession())?.user?.roles ?? []
  const admin = roles.includes('admin')
  const dev = roles.includes('dev')
  const groups: HubGroup[] = [...(admin ? [ADMIN_HUB] : []), ...(dev ? [DEV_HUB] : [])]
  const waiting: Record<string, number> = {}
  if (admin) {
    const [c, inbox] = await Promise.all([counts(), newInquiryCount()])
    waiting['/admin/campaigns'] = (c.requests ?? 0) + (c.readyToLaunch ?? 0)
    waiting['/admin/submissions'] = c.pendingClips ?? 0
    waiting['/admin/payouts'] = c.payoutsInReview ?? 0
    waiting['/admin/users'] = c.flagged ?? 0
    waiting['/admin/inbox'] = inbox
  }
  return <Hub title="Owner dashboard" sub="Everything you can run, in one place." groups={groups} counts={waiting} />
}
