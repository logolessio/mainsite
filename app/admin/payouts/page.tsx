import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { PayoutsTable } from '@/components/app/admin-tables'

export const metadata: Metadata = { title: 'Payouts — logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <PageHeader title="Payouts" sub="Withdrawals processed through Stripe." />
      <PayoutsTable />
    </>
  )
}
