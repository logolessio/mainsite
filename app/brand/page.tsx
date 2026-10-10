import type { Metadata } from 'next'

import { ActionLink } from '@/components/app/action-link'
import { Checklist } from '@/components/app/checklist'
import { Card, PageHeader, StatCard } from '@/components/app/ui'
import { EmptyState } from '@/components/app/table'

export const metadata: Metadata = { title: 'Brand dashboard — logoless', robots: { index: false } }

export default function Page() {
  // TODO(backend): load real totals for the signed-in brand workspace.
  return (
    <>
      <PageHeader title="Overview" sub="Spend, reach and what is live." actions={<ActionLink href="/brand/campaigns/new">New campaign</ActionLink>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Balance" value="$0.00" />
        <StatCard label="Active campaigns" value="0" />
        <StatCard label="Verified views" value="0" />
        <StatCard label="Spent" value="$0.00" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card title="Campaigns">
          <EmptyState
            icon="Megaphone"
            title="No campaigns yet"
            body="Write a brief, set a rate and fund it. Clippers can start posting right away."
            action={<ActionLink href="/brand/campaigns/new">Create a campaign</ActionLink>}
          />
        </Card>
        <Card title="Launch checklist">
          <Checklist
            items={[
              { label: 'Add funds', body: 'Fund your balance with Stripe', href: '/brand/billing' },
              { label: 'Create a campaign', body: 'Brief, rate, budget and platforms', href: '/brand/campaigns/new' },
              { label: 'Review clips', body: 'Approve or let the checks do it', href: '/brand/campaigns' },
            ]}
          />
        </Card>
      </div>
    </>
  )
}
