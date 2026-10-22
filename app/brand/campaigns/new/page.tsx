import type { Metadata } from 'next'
import { CampaignBuilder } from '@/components/campaign-builder/builder'
import { CampaignWizard } from '@/components/app/campaign-wizard'
import { PageHeader } from '@/components/app/ui'
import { draftFor } from '@/lib/campaign-edit'
import { campaignRow } from '@/lib/campaigns-db'
import { feeFreeLeft } from '@/lib/fee-free'
import { featureOn } from '@/lib/features'
import { balances } from '@/lib/ledger'
import { paypalReady } from '@/lib/paypal'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'New campaign | logoless', robots: { index: false } }

export default async function Page({ searchParams }: { searchParams: Promise<{ step?: string; paid?: string; from?: string }> }) {
  const user = await pageUser()
  const [b, builder, q, left] = await Promise.all([balances(user.id), featureOn('campaign-builder'), searchParams, feeFreeLeft(user.id)])
  const feeFree = left > 0 // the campaign they are about to make is one of their first few: no fee on it
  // a copy of an earlier campaign of theirs: the builder opens already filled in, with "(copy)" on the name
  const from = builder && q.from && (await featureOn('campaign-duplicate')) ? await campaignRow(q.from) : null
  const initial = from && from.brand_user_id === user.id ? { ...(await draftFor(from)), title: `${from.title} (copy)`.slice(0, 60) } : undefined
  if (builder) {
    return (
      <>
        <PageHeader title="New campaign" sub="A few short steps. Nothing is charged: creators are paid from your balance as they earn." />
        {q.paid && (
          <p role="status" className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.05] px-4 py-3 text-sm">
            Payment received. Your balance is updated, so carry on where you were.
          </p>
        )}
        <CampaignBuilder balanceCents={b.brand} paypalReady={await paypalReady()} startAt={q.step} initial={initial} feeFree={feeFree} />
      </>
    )
  }
  return (
    <>
      <PageHeader title="New campaign" sub="One short page. Nothing is charged: creators are paid from your balance as they earn." />
      <CampaignWizard balanceCents={b.brand} feeFree={feeFree} />
    </>
  )
}
