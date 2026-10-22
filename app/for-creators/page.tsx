import type { Metadata } from 'next'
import { connection } from 'next/server'
import { ArchSection, PageToc } from '@/components/marketing/anubis'
import { CtaBand } from '@/components/marketing/blocks'
import { Breadcrumbs, Related } from '@/components/marketing/breadcrumbs'
import { ClipperCalculator } from '@/components/marketing/calculators'
import { CoverStrip } from '@/components/marketing/cover-strip'
import { Principles, Steps } from '@/components/marketing/layouts'
import { FeePromise } from '@/components/marketing/fee-promise'
import { PageHero } from '@/components/marketing/page-hero'
import { RolePreview } from '@/components/marketing/role-preview'
import { PillLink } from '@/components/motion/cta'
import { liveCampaigns } from '@/lib/campaigns-db'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Get paid for your content | logoless',
  description: 'Join a campaign, post content on your own account and earn for every 1,000 verified views. No follower minimum, no fee to join.',
  alternates: { canonical: '/for-creators' },
}

const TOC = [
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'how', label: 'How we work' },
  { id: 'fees', label: 'Fees' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'good', label: 'Good to know' },
]

/** Pictures for the arch when nothing is live: the site's own sample covers. */
const ARTWORK = ['06', '07', '08', '09', '10'].map((n) => ({ src: `/covers/${n}.jpg` }))

export default async function Page() {
  await connection()
  const live = await liveCampaigns().catch(() => [])
  // real, live campaigns when there are some (each opens its campaign), the sample covers when there are not
  const covers = live
    .filter((c, n, all) => c.cover && all.findIndex((x) => x.cover === c.cover) === n)
    .slice(0, 5)
    .map((c) => ({ src: c.cover, label: c.title, href: `/campaign/${c.id}` }))
  return (
    <main>
      <PageToc items={TOC} />
      <Breadcrumbs trail={[{ name: 'For creators' }]} />
      <PageHero eyebrow="For creators" title="Get paid for your content" lede="Pick one of our many campaigns, get the resources to post, we verify your content and then you get paid for your views. No followers or fees needed to join." badges={{ solid: { href: '/onboarding?role=clipper', top: 'Creators', bottom: 'Start earning' }, outline: { href: '/for-brands', label: 'Brands' } }}>
        <PillLink href="/onboarding?role=clipper">Start earning</PillLink>
      </PageHero>

      <div id="campaigns">
        <CoverStrip campaigns={live} heading="Browse our active campaigns." browse={false} />
        <RolePreview role="creator" />
      </div>

      <ArchSection id="posts" title="Posts that pay" items={covers.length > 0 ? covers : ARTWORK} caption={covers.length > 0 ? undefined : 'sample artwork'}>
        Campaigns come from artists, streamers and brands you may already follow. Read the brief, post on your own account and submit the link. Everything you post stays yours.
      </ArchSection>

      <div id="how">
      <Steps
        title="How we work"
        steps={[
          { title: 'Join a campaign', body: 'Choose from many high-quality campaigns that we offer.' },
          { title: 'Post your content', body: 'Post the content on any allowed platforms the campaign accepts, then submit and we verify your media with our automated systems and real human-intelligence :)' },
          { title: 'Get paid', body: `Once your content has been verified, you can withdraw your cash via PayPal and get paid as soon and as frequently as you like. We do have a ${SITE.minPayoutUsd}USD minimum due to PayPal transaction fees (otherwise you would hardly get paid anything).` },
        ]}
      />
      </div>
      <div id="fees">
        <FeePromise audience="clippers" />
      </div>
      <div id="calculator">
        <ClipperCalculator />
      </div>
      <div id="good">
      <Principles
        title="Good to know"
        items={[
          { title: 'It costs nothing', body: "Joining and submitting are free, and you keep everything a campaign pays you. Brands pay our fee on top, and we cover PayPal's fees too." },
          { title: 'You keep your views', body: 'All content is yours to keep and post on your own accounts. We just track your views.' },
          { title: 'Rejections have reasons', body: "If we turn your submission down, you'll see why." },
        ]}
      />
      </div>
      <CtaBand title="Ready to start?" href="/onboarding?role=clipper" label="Start earning" />
      <Related links={[{ href: '/pricing', label: 'Pricing' }, { href: '/faq', label: "Q&A" }, { href: '/for-brands', label: 'For brands' }]} />
    </main>
  )
}
