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
        title="Pay for the views you actually get"
        lede="Turn one song, stream or launch into hundreds of clips across TikTok, YouTube and Instagram. You set the budget and the rate, and clippers are only paid for views we've verified."
      >
        <PillLink href="/onboarding?role=brand">Launch a campaign</PillLink>
        <PillLink href="/contact" variant="ghost">
          Talk to us
        </PillLink>
      </PageHero>

      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <ScrollText
          className="max-w-[26ch] font-display text-4xl leading-[1] tracking-[-0.04em] md:text-[4.5rem]"
          text="People already cut clips from your music, streams and launches. This lets you pay them for the ones that work, based on real views."
        />
      </section>

      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <FeatureGrid
          features={[
            { title: 'A brief in plain words', body: "Tell clippers what to clip, which platforms count and what's off limits. Write it the way you'd explain it to a friend." },
            { title: 'We look at every clip', body: 'Someone on our team checks each clip against your brief before it earns anything, and checks the view count on the platform itself.' },
            { title: 'You can say no', body: "If a clip isn't right for your campaign, you can turn it down from your dashboard before it's paid." },
            { title: 'You choose the rate', body: 'Decide what 1,000 verified views are worth for your content. A higher rate tends to bring in more clippers, sooner.' },
            { title: 'Your budget is a ceiling', body: "The budget you fund is the most you'll ever spend on views. If a campaign ends with money left, you can ask for it back." },
            { title: 'Paid through Stripe', body: 'You pay by card or bank transfer, and clippers withdraw through Stripe too, so there is a clean record on both sides.' },
          ]}
        />
      </section>

      <StatRow
        stats={[
          { value: `${SITE.platformFeePct}%`, label: 'Our fee', note: "Taken from clipper payouts, never added on top of your budget" },
          { value: '3', label: 'Platforms', note: 'TikTok, YouTube and Instagram' },
          { value: `$${SITE.minTopUpUsd}`, label: 'Minimum top-up', note: 'No contract and no minimum term' },
        ]}
      />
      <Steps
        title="How a campaign starts"
        steps={[
          { title: 'Write the brief', body: "Say what to clip, which platforms count and what's off limits." },
          { title: 'Set a rate and a budget', body: 'Choose what 1,000 verified views are worth and the most you want to spend.' },
          { title: 'We read it, then you pay', body: "We look over your brief and get back to you. Once we've said yes, you fund the campaign through Stripe." },
          { title: 'We launch it', body: 'Your campaign goes live and clippers can start posting. We check their clips and views, and money only moves for views that are verified.' },
        ]}
      />
      <BrandCalculator />
      <Principles
        title="How the money works"
        items={[
          { title: 'You set the rate', body: 'You decide what 1,000 verified views are worth for your content.' },
          { title: 'You pay as views are verified', body: 'Your budget is reserved when the campaign launches and paid out to clippers only as their views are verified.' },
          { title: 'The fee is simple', body: `There's no subscription. We keep ${SITE.platformFeePct}% of what's paid out to clippers. The pricing page has the full picture.` },
        ]}
      />
      <CtaBand title="Launch your first campaign" href="/onboarding?role=brand" label="Get started" secondaryHref="/how-it-works" secondaryLabel="How it works" />
    </main>
  )
}
