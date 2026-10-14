import type { Metadata } from 'next'
import { CampaignWizard } from '@/components/app/campaign-wizard'
import { PageHeader } from '@/components/app/ui'
import { balances } from '@/lib/ledger'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'New campaign | logoless', robots: { index: false } }

export default async function Page() {
  const user = await pageUser()
  const b = await balances(user.id)
  return (
    <>
      <PageHeader title="New campaign" sub="One short page. Nothing is charged: clippers are paid from your balance as they earn." />
      <CampaignWizard balanceCents={b.brand} />
    </>
  )
}
