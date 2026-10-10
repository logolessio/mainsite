import type { Metadata } from 'next'
import { BillingPanel } from '@/components/app/billing-panel'
import { PageHeader } from '@/components/app/ui'

export const metadata: Metadata = { title: 'Billing — logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <PageHeader title="Billing & funds" sub="Add funds with Stripe and keep track of every charge." />
      <BillingPanel />
    </>
  )
}
