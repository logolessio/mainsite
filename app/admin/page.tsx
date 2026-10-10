import type { Metadata } from 'next'
import { ActionLink } from '@/components/app/action-link'
import { Checklist } from '@/components/app/checklist'
import { Card, PageHeader, StatCard } from '@/components/app/ui'

export const metadata: Metadata = { title: 'Admin — logoless', robots: { index: false } }

export default function Page() {
  // TODO(backend): replace with live counts.
  return (
    <>
      <PageHeader title="Admin" sub="What needs a human right now." actions={<ActionLink href="/admin/submissions">Open review queue</ActionLink>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Awaiting review" value="0" />
        <StatCard label="Fraud flags" value="0" />
        <StatCard label="Payouts to check" value="0" />
        <StatCard label="Open appeals" value="0" />
      </div>
      <Card title="Queues" className="mt-6">
        <Checklist
          items={[
            { label: 'Review queue', body: 'Clips waiting for a decision', href: '/admin/submissions' },
            { label: 'Fraud flags', body: 'Suspicious view patterns', href: '/admin/fraud' },
            { label: 'Payouts', body: 'Failed or held withdrawals', href: '/admin/payouts' },
            { label: 'Users', body: 'Search, suspend, verify', href: '/admin/users' },
          ]}
        />
      </Card>
    </>
  )
}
