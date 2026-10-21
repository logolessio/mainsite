import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { CampaignSheet } from '@/components/campaign/campaign-sheet'
import { CampaignBackdrop, CampaignExtrasBlock } from '@/components/campaign/campaign-extras'
import { getExtras } from '@/lib/campaign-extras'
import { Breadcrumbs, Related } from '@/components/marketing/breadcrumbs'
import { endedCampaign, liveCampaign } from '@/lib/campaigns-db'
import { agoText } from '@/lib/time-ago'
import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { getSession } from '@/lib/session'
import { TransitionLink } from '@/components/shell/transition-link'
import { SITE } from '@/lib/site'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ preview?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection()
  const campaign = await liveCampaign((await params).id)
  if (!campaign) {
    const gone = await endedCampaign((await params).id)
    return { title: gone ? `${gone.title} has ended | logoless` : 'Campaign not found | logoless', robots: { index: false } }
  }
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
  if (!campaign) {
    // a campaign that closed does not vanish: it says that it ended, and how long ago
    const gone = await endedCampaign((await params).id)
    if (!gone) notFound()
    return (
      <main>
        <Breadcrumbs trail={[{ name: 'Campaigns', href: '/' }, { name: gone.title }]} />
        <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-16 pb-32 text-center md:pt-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gone.cover} alt="" className="size-40 rounded-[calc(2rem*var(--round,1))] object-cover opacity-60 grayscale" />
          <h1 className="mt-8 font-display text-4xl tracking-[-0.03em]">{gone.title}</h1>
          <p className="mt-2 text-mute">by {gone.creator}</p>
          <p className="mt-8 text-xl">This campaign ended {agoText(gone.endedAt)}.</p>
          <p className="mt-2 text-[15px] text-mute">It is no longer taking submissions. There are more campaigns to try.</p>
          <TransitionLink href="/" className="mt-8 inline-flex h-12 items-center rounded-pill bg-paper px-7 text-[15px] font-medium text-ink transition-colors hover:bg-paper/85">
            See live campaigns
          </TransitionLink>
        </div>
      </main>
    )
  }
  // How much of the budget is left, from what has really been paid out. Only once the feature is pushed.
  const leftPct = (await featureOn('pool-meter')) ? (campaign.budgetLeftPct ?? 100) : null
  // the music links, sound, background and bio from the step-by-step builder or a client link
  const extras = (await featureOn('campaign-builder')) || (await featureOn('client-links')) ? await getExtras(campaign.id) : null
  const ld = { '@context': 'https://schema.org', '@type': 'WebPage', name: `${campaign.title} by ${campaign.creator}`, url: `${SITE.url}/campaign/${campaign.id}`, image: `${SITE.url}${campaign.cover}`, description: campaign.summary }
  return (
    <main className="relative isolate">
      {extras?.background && <CampaignBackdrop id={extras.background} />}
      <Breadcrumbs trail={[{ name: 'Campaigns', href: '/' }, { name: campaign.title }]} />
      <h1 className="sr-only">
        {campaign.title} by {campaign.creator}
      </h1>
      <div className="px-4 pt-8 pb-16 md:pt-12">
        <CampaignSheet campaign={campaign} leftPct={leftPct} preview={dry} inline extra={extras ? <CampaignExtrasBlock x={extras} /> : undefined} />
      </div>
      <Related links={[{ href: '/', label: 'All campaigns' }, { href: '/for-creators', label: 'How creators earn' }, { href: '/faq', label: "Q&A" }]} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
    </main>
  )
}
