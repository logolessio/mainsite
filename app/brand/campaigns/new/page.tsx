import type { Metadata } from 'next'
import { CampaignWizard } from '@/components/app/campaign-wizard'
import { PageHeader } from '@/components/app/ui'

export const metadata: Metadata = { title: 'New campaign | logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <PageHeader title="New campaign" sub="Four quick steps. You can edit everything except the budget floor once it is live." />
      <CampaignWizard />
    </>
  )
}
