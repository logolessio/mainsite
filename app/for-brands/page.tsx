import type { Metadata } from 'next'

import { CtaBand, FeatureGrid, SectionTitle, Split } from '@/components/marketing/blocks'
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

      <Section className="py-16 md:py-28">
        <Split label="Set your own rate">
          <p><T>
            You decide what 1,000 verified views are worth for your content. Higher rates attract more clippers faster.
            You can change the rate on a live campaign.
          </T></p>
        </Split>
        <Split label="Pay on delivery" flip>
          <p><T>
            Budget is reserved when a campaign launches and released to clippers only as views are verified. Whatever
            is left when a campaign ends goes back to your balance.
          </T></p>
        </Split>
        <Split label="Simple fees">
          <p>
            No subscription. A {SITE.platformFeePct}% platform fee applies to payouts.{' '}
            <a href="/pricing" className="text-paper underline underline-offset-4">
              See pricing
            </a>
            .
          </p>
        </Split>
      </Section>

      <CtaBand title="Launch your first campaign" href="/onboarding?role=brand" label="Get started" secondaryHref="/how-it-works" secondaryLabel="How it works" />
    </main>
  )
}
