import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { CampaignsTable } from '@/components/app/admin-tables'

export const metadata: Metadata = { title: 'Campaigns — logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <PageHeader title="Campaigns" sub="Every campaign on the platform." />
      <CampaignsTable />
    </>
  )
}
