import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CampaignCard } from '@/components/campaign/campaign-card'
import { CampaignTour } from '@/components/campaign/campaign-tour'
import { connection } from 'next/server'
import { liveCampaign, liveCampaigns } from '@/lib/campaigns-db'

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

  return (
    <main className="relative px-4 pt-28 pb-40 md:px-8 md:pt-36">
      <CampaignCard campaign={campaign} others={others} />
      <CampaignTour />
    </main>
  )
}
