import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/app/ui'
import { CampaignBuilder } from '@/components/campaign-builder/builder'
import { draftFor } from '@/lib/campaign-edit'
import { pendingAsks } from '@/lib/campaign-review'
import { campaignRow } from '@/lib/campaigns-db'
import { campaignIsFeeFree } from '@/lib/fee-free'
import { featureOn } from '@/lib/features'
import { pageUser } from '@/lib/user'

export const metadata: Metadata = { title: 'Fix your campaign | logoless', robots: { index: false } }

/** The same step-by-step builder, opened on a request that is still in review, with what it said and what the team asked for. */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await pageUser()
  const { id } = await params
  const row = await campaignRow(id)
  if (!row || row.brand_user_id !== user.id) notFound()
  if (row.status !== 'requested' || !(await featureOn('campaign-builder'))) redirect('/brand/campaigns')
  const ask = (await pendingAsks([id]))[id]
  return (
    <>
      <PageHeader title="Fix your campaign" sub="Change what you need to, then send it back. It stays in review and nothing is charged." />
      <CampaignBuilder balanceCents={0} paypalReady={false} edit={{ id, note: ask }} initial={await draftFor(row)} feeFree={await campaignIsFeeFree(id)} />
    </>
  )
}
