import type { Metadata } from 'next'
import { CampaignBuilder } from '@/components/campaign-builder/builder'
import { CampaignWizard } from '@/components/app/campaign-wizard'
import { PageHeader } from '@/components/app/ui'
import { featureOn } from '@/lib/features'
import { balances } from '@/lib/ledger'
import { paypalReady } from '@/lib/paypal'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'New campaign | logoless', robots: { index: false } }

export default async function Page({ searchParams }: { searchParams: Promise<{ step?: string; paid?: string }> }) {
  const user = await pageUser()
  const [b, builder, q] = await Promise.all([balances(user.id), featureOn('campaign-builder'), searchParams])
  if (builder) {
    return (
      <>
        <PageHeader title="New campaign" sub="A few short steps. Nothing is charged: creators are paid from your balance as they earn." />
        {q.paid && (
          <p role="status" className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.05] px-4 py-3 text-sm">
            Payment received. Your balance is updated, so carry on where you were.
          </p>
        )}
        <CampaignBuilder balanceCents={b.brand} paypalReady={await paypalReady()} startAt={q.step} />
      </>
    )
  }
  return (
    <>
      <PageHeader title="New campaign" sub="One short page. Nothing is charged: creators are paid from your balance as they earn." />
      <CampaignWizard balanceCents={b.brand} />
    </>
  )
}
