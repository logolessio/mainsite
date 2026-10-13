import type { Metadata } from 'next'
import { SectionTabs } from '@/components/app/section-tabs'
import { PageHeader } from '@/components/app/ui'
import { PayoutsPanel } from '@/components/app/payouts-panel'

export const metadata: Metadata = { title: 'Payouts | logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <SectionTabs group="earnings" />
      <PageHeader title="Payouts" sub="Connect Stripe to withdraw your earnings to your bank." />
      <PayoutsPanel />
    </>
  )
}
