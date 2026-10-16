import type { Metadata } from 'next'
import { connection } from 'next/server'
import { CtaBand } from '@/components/marketing/blocks'
import { Breadcrumbs, Related } from '@/components/marketing/breadcrumbs'
import { ClipperCalculator } from '@/components/marketing/calculators'
import { CoverStrip } from '@/components/marketing/cover-strip'
import { Principles, Steps } from '@/components/marketing/layouts'
import { FeePromise } from '@/components/marketing/fee-promise'
import { PageHero } from '@/components/marketing/page-hero'
import { PillLink } from '@/components/motion/cta'
import { liveCampaigns } from '@/lib/campaigns-db'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Get paid for your clips | logoless',
  description: 'Join a campaign, post a clip on your own account and earn for every 1,000 verified views. No follower minimum, no fee to join.',
  alternates: { canonical: '/for-clippers' },
}

export default async function Page() {
  await connection()
  const live = await liveCampaigns().catch(() => [])
  return (
    <main>
      <Breadcrumbs trail={[{ name: 'For creators' }]} />
      <PageHero eyebrow="For creators" title="Get paid for your clips" lede="Pick a campaign, post a clip on your own account, and earn for every 1,000 views we verify. No followers needed and no fee to join.">
        <PillLink href="/onboarding?role=clipper">Start earning</PillLink>
      </PageHero>

      <CoverStrip campaigns={live} heading="Live right now" browse={false} />

      <Steps
        title="How it works"
        steps={[
          { title: 'Join a campaign', body: 'Choose one you like. There is no application.' },
          { title: 'Post your clip', body: 'Post it on your own TikTok, YouTube or Instagram, then paste the link.' },
          { title: 'Get paid', body: `We check the clip and its views. Once your balance is $${SITE.minPayoutUsd}, withdraw it.` },
        ]}
      />
      <FeePromise audience="clippers" />
      <ClipperCalculator />
      <Principles
        title="Good to know"
        items={[
          { title: 'It costs nothing', body: "Joining and submitting are free, and you keep everything a campaign pays you. Brands pay our fee on top, and we cover PayPal's fees too." },
          { title: 'You keep your accounts', body: 'Clips stay on your own channels. We only read the view counts.' },
          { title: 'Rejections have reasons', body: "If we turn a clip down, you'll see why." },
        ]}
      />
      <CtaBand title="Ready to start?" href="/onboarding?role=clipper" label="Start earning" />
      <Related links={[{ href: '/pricing', label: 'Pricing' }, { href: '/faq', label: 'Questions' }, { href: '/for-brands', label: 'For brands' }]} />
    </main>
  )
}
