import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CampaignCard } from '@/components/campaign/campaign-card'
import { CampaignTour } from '@/components/campaign/campaign-tour'
import { connection } from 'next/server'
import { liveCampaign, liveCampaigns } from '@/lib/campaigns-db'
import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection()
  const campaign = await liveCampaign((await params).id)
  if (!campaign) return {}
  return {
    title: `${campaign.title} by ${campaign.creator} — logoless`,
    description: campaign.summary,
    openGraph: { title: `${campaign.title} by ${campaign.creator}`, description: campaign.summary, images: [campaign.cover] },
    twitter: { card: 'summary_large_image', title: `${campaign.title} by ${campaign.creator}`, description: campaign.summary, images: [campaign.cover] },
  }
}

export default async function CampaignPage({ params }: Props) {
  await connection()
  const campaign = await liveCampaign((await params).id)
  if (!campaign) notFound()
  const others = (await liveCampaigns()).filter((c) => c.id !== campaign.id).slice(0, 4)
  // How much of the pool is left, from the real ledger. Only for funded campaigns, and only once the feature is pushed.
  let poolLeftCents: number | null = null
  if (await featureOn('pool-meter')) {
    const d = await db()
    const row = await d.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(amount_cents), 0) AS left FROM ledger WHERE account = 'campaign' AND campaign_id = ?1").bind(campaign.id).first<{ n: number; left: number }>()
    if (row && row.n > 0) poolLeftCents = row.left
  }

  return (
    <main className="relative px-4 pt-28 pb-40 md:px-8 md:pt-36">
      <CampaignCard campaign={campaign} others={others} poolLeftCents={poolLeftCents} />
      <CampaignTour />
    </main>
  )
}
