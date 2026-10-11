import type { Metadata } from 'next'
import { BrandCalculator } from '@/components/marketing/calculators'

import { CtaBand, FeatureGrid, SectionTitle } from '@/components/marketing/blocks'
import { SplitBeat, StatRow, Ticker, Timeline } from '@/components/marketing/layouts'
import { PageHero, Section } from '@/components/marketing/page-hero'
import { PillLink } from '@/components/motion/cta'
import { ScrollText } from '@/components/motion/scroll-text'
import { SITE } from '@/lib/site'
import { T } from '@/components/shell/copy-provider'

export const metadata: Metadata = {
  title: 'For brands — logoless',
  description: 'Launch a clipping campaign and pay only for verified views.',
}

export default function Page() {
  return (
    <main>
      <PageHero
        align="right"
        eyebrow="For brands, artists and streamers"
        title="Pay for views you can trust"
        lede="Turn one piece of content into hundreds of clips across TikTok, YouTube and Instagram. Set the budget, set the rate, and only pay when views are verified."
      >
        <PillLink href="/onboarding?role=brand">Launch a campaign</PillLink>
        <PillLink href="/contact" variant="ghost">
          Talk to us
        </PillLink>
      </PageHero>

      <Section className="py-16 md:py-28">
        <ScrollText
          className="max-w-[24ch] font-display text-5xl leading-[0.95] md:text-8xl"
          text="You bring the content. A crowd of editors brings the reach. Nobody is paid until the views are real."
        />
      </Section>

      <Ticker words={['Briefs', 'Budgets', 'Clips', 'Verified views']} />
      <Section>
        <SectionTitle eyebrow="What you get" title="Built for control" align="center" />
        <FeatureGrid
          features={[
            { icon: 'Rocket', title: 'Live in minutes', body: 'Write the brief, set the rate, fund it and go live. No contracts, no minimum term.' },
            { icon: 'ShieldCheck', title: 'Fraud checked', body: 'Bot detection and re-checks run on every clip. Likely fraud is rejected and never billed.' },
            { icon: 'FileCheck2', title: 'Brief compliance', body: 'Clips are checked against your rules before they count. Approve automatically or review by hand.' },
            { icon: 'BarChart3', title: 'Real analytics', body: 'Views, spend, effective CPM, engagement and top clips per campaign, updated as data arrives.' },
            { icon: 'Gauge', title: 'Budget control', body: 'Cap spend per campaign, pause at any time and keep whatever you do not use.' },
            { icon: 'Layers', title: 'Agency ready', body: 'Run several clients from one account, each with their own budget and billing.' },
          ]}
        />
      </Section>

      <StatRow
        stats={[
          { value: `${SITE.platformFeePct}%`, label: 'Platform fee', note: 'On paid-out views only' },
          { value: '3', label: 'Platforms', note: 'TikTok, YouTube and Instagram' },
          { value: `$${SITE.minTopUpUsd}`, label: 'Minimum top-up', note: 'No contract, no minimum term' },
        ]}
      />
      <SplitBeat n="01" label="Your rate" title="Set your own rate">
        <p>
          <T>
            You decide what 1,000 verified views are worth for your content. Higher rates attract more clippers faster. You can change the rate on a live campaign.
          </T>
        </p>
      </SplitBeat>
      <SplitBeat n="02" label="Your risk" title="Pay on delivery" flip>
        <p>
          <T>
            Budget is reserved when a campaign launches and released to clippers only as views are verified. Whatever is left when a campaign ends goes back to your balance.
          </T>
        </p>
      </SplitBeat>
      <SplitBeat n="03" label="Your cost" title="Simple fees">
        <p>
          No subscription. A {SITE.platformFeePct}% platform fee applies to payouts.{' '}
          <a href="/pricing" className="text-paper underline underline-offset-4">
            See pricing
          </a>
          .
        </p>
      </SplitBeat>
      <Timeline
        eyebrow="Your first campaign"
        title="Four steps to live"
        items={[
          { tag: 'Step 1', title: 'Write the brief', body: 'Say what to clip, which platforms count and what is off limits, in plain language.' },
          { tag: 'Step 2', title: 'Set rate and budget', body: 'Choose what 1,000 verified views are worth, and how much you want to spend at most.' },
          { tag: 'Step 3', title: 'Fund and go live', body: 'Add funds through Stripe and launch. Clippers can join straight away.' },
          { tag: 'Step 4', title: 'Pay for what is real', body: 'Clips are checked, views are verified and only then does money move.' },
        ]}
      />
      <BrandCalculator />
      <CtaBand title="Launch your first campaign" href="/onboarding?role=brand" label="Get started" secondaryHref="/how-it-works" secondaryLabel="How it works" />
    </main>
  )
}
