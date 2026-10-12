import type { Metadata } from 'next'
import { BrandCalculator } from '@/components/marketing/calculators'

import { CtaBand, FeatureGrid } from '@/components/marketing/blocks'
import { Principles, StatRow, Steps } from '@/components/marketing/layouts'
import { PageHero } from '@/components/marketing/page-hero'
import { PillLink } from '@/components/motion/cta'
import { ScrollText } from '@/components/motion/scroll-text'
import { SITE } from '@/lib/site'
import { CONTAINER } from '@/lib/layout'

export const metadata: Metadata = {
  title: 'For brands | logoless',
  description: 'Launch a clipping campaign and pay only for verified views.',
}

export default function Page() {
  return (
    <main>
      <PageHero
        eyebrow="For brands, artists and streamers"
        title="Pay for views you can trust"
        lede="Turn one piece of content into hundreds of clips across TikTok, YouTube and Instagram. Set the budget, set the rate, and only pay when views are verified."
      >
        <PillLink href="/onboarding?role=brand">Launch a campaign</PillLink>
        <PillLink href="/contact" variant="ghost">
          Talk to us
        </PillLink>
      </PageHero>

      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <ScrollText
          className="max-w-[24ch] font-display text-4xl leading-[1] tracking-[-0.04em] md:text-[4.5rem]"
          text="You bring the content. A crowd of editors brings the reach. Nobody is paid until the views are real."
        />
      </section>

      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <FeatureGrid
          features={[
            { title: 'Live in minutes', body: 'Write the brief, set the rate, fund it and go live. No contracts, no minimum term.' },
            { title: 'Fraud checked', body: 'Bot detection and re-checks run on every clip. Likely fraud is rejected and never billed.' },
            { title: 'Brief compliance', body: 'Clips are checked against your rules before they count. Approve automatically or review by hand.' },
            { title: 'Real analytics', body: 'Views, spend, effective CPM, engagement and top clips per campaign, updated as data arrives.' },
            { title: 'Budget control', body: 'Cap spend per campaign, pause at any time and keep whatever you do not use.' },
            { title: 'Agency ready', body: 'Run several clients from one account, each with their own budget and billing.' },
          ]}
        />
      </section>

      <StatRow
        stats={[
          { value: `${SITE.platformFeePct}%`, label: 'Platform fee', note: 'On paid-out views only' },
          { value: '3', label: 'Platforms', note: 'TikTok, YouTube and Instagram' },
          { value: `$${SITE.minTopUpUsd}`, label: 'Minimum top-up', note: 'No contract, no minimum term' },
        ]}
      />
      <Steps
        title="Four steps to live"
        steps={[
          { title: 'Write the brief', body: 'Say what to clip, which platforms count and what is off limits, in plain language.' },
          { title: 'Set rate and budget', body: 'Choose what 1,000 verified views are worth, and how much you want to spend at most. You can change the rate on a live campaign.' },
          { title: 'Fund and go live', body: 'Add funds through Stripe and launch. Budget is reserved when a campaign launches, and clippers can join straight away.' },
          { title: 'Pay for what is real', body: 'Clips are checked, views are verified and only then does money move. Whatever is left when a campaign ends goes back to your balance.' },
        ]}
      />
      <BrandCalculator />
      <Principles
        title="How the money works"
        items={[
          { title: 'You set the rate', body: 'You decide what 1,000 verified views are worth for your content. Higher rates attract more clippers faster.' },
          { title: 'You pay on delivery', body: 'Budget is released to clippers only as views are verified. The budget you set is the most you will ever spend on views.' },
          { title: 'Fees are simple', body: `No subscription. A ${SITE.platformFeePct}% platform fee applies to payouts. See pricing for the full picture.` },
        ]}
      />
      <CtaBand title="Launch your first campaign" href="/onboarding?role=brand" label="Get started" secondaryHref="/how-it-works" secondaryLabel="How it works" />
    </main>
  )
}
