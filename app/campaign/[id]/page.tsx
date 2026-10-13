import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { CampaignSheet } from '@/components/campaign/campaign-sheet'
import { Breadcrumbs, Related } from '@/components/marketing/breadcrumbs'
import { liveCampaign } from '@/lib/campaigns-db'
import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { getSession } from '@/lib/session'
import { SITE } from '@/lib/site'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ preview?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection()
  const campaign = await liveCampaign((await params).id)
  if (!campaign) return { title: 'Campaign not found | logoless', robots: { index: false } }
  const title = `${campaign.title} by ${campaign.creator} | logoless`
  return {
    title,
    description: campaign.summary.slice(0, 200),
    alternates: { canonical: `/campaign/${campaign.id}` },
    openGraph: { title: `${campaign.title} by ${campaign.creator}`, description: campaign.summary.slice(0, 200), images: [campaign.cover] },
    twitter: { card: 'summary_large_image', title: `${campaign.title} by ${campaign.creator}`, description: campaign.summary.slice(0, 200), images: [campaign.cover] },
  }
}

export default async function CampaignPage({ params, searchParams }: Props) {
  await connection()
  // an admin's dry run of the submit flow: ?preview=approved, declined or review. Nothing is sent.
  const asked = (await searchParams).preview
  const dry = asked === 'approved' || asked === 'declined' || asked === 'review' ? ((await getSession())?.user?.role === 'admin' ? asked : undefined) : undefined
  const campaign = await liveCampaign((await params).id)
  if (!campaign) notFound()
  // How much of the pool is left, from the real ledger. Only for funded campaigns, and only once the feature is pushed.
  let poolLeftCents: number | null = null
  if (await featureOn('pool-meter')) {
    const d = await db()
    const row = await d.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(amount_cents), 0) AS left FROM ledger WHERE account = 'campaign' AND campaign_id = ?1").bind(campaign.id).first<{ n: number; left: number }>()
    if (row && row.n > 0) poolLeftCents = row.left
  }
  const ld = { '@context': 'https://schema.org', '@type': 'WebPage', name: `${campaign.title} by ${campaign.creator}`, url: `${SITE.url}/campaign/${campaign.id}`, image: `${SITE.url}${campaign.cover}`, description: campaign.summary }
  return (
    <main>
      <Breadcrumbs trail={[{ name: 'Campaigns', href: '/' }, { name: campaign.title }]} />
      <h1 className="sr-only">
        {campaign.title} by {campaign.creator}
      </h1>
      <div className="px-4 pt-8 pb-16 md:pt-12">
        <CampaignSheet campaign={campaign} poolLeftCents={poolLeftCents} preview={dry} inline />
      </div>
      <Related links={[{ href: '/', label: 'All campaigns' }, { href: '/for-clippers', label: 'How creators earn' }, { href: '/faq', label: 'Questions' }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </main>
  )
}
