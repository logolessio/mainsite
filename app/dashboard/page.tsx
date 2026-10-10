import type { Metadata } from 'next'

import { ActionLink } from '@/components/app/action-link'
import { Checklist } from '@/components/app/checklist'
import { Card, PageHeader, StatCard } from '@/components/app/ui'
import { EmptyState } from '@/components/app/table'

export const metadata: Metadata = { title: 'Dashboard — logoless', robots: { index: false } }

export default function Page() {
  // TODO(backend): load real totals for the signed-in clipper.
  return (
    <>
      <PageHeader
        title="Overview"
        sub="Your balance, clips and what to do next."
        actions={<ActionLink href="/">Find a campaign</ActionLink>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Available" value="$0.00" note="Ready to withdraw" />
        <StatCard label="Pending" value="$0.00" note="Waiting on verification" />
        <StatCard label="Total earned" value="$0.00" />
        <StatCard label="Verified views" value="0" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card title="Recent clips">
          <EmptyState
            icon="Clapperboard"
            title="No clips yet"
            body="Join a campaign, post your clip and submit the link. It will show up here."
            action={<ActionLink href="/">Browse campaigns</ActionLink>}
          />
        </Card>
        <Card title="Get set up">
          <Checklist
            items={[
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
