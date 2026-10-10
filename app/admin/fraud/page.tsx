import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { FraudTable } from '@/components/app/admin-tables'

export const metadata: Metadata = { title: 'Fraud flags — logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <PageHeader title="Fraud flags" sub="Clips the automatic checks marked as suspicious." />
      <FraudTable />
    </>
  )
}
