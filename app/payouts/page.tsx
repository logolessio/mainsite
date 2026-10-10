import type { Metadata } from 'next'

import { CtaBand, FeatureGrid, SectionTitle } from '@/components/marketing/blocks'
import { PageHero, Section } from '@/components/marketing/page-hero'
import { StickyStory } from '@/components/motion/sticky-story'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Payouts — logoless',
  description: 'How logoless pays clippers through Stripe.',
}

export default function Page() {
  return (
    <main>
      <PageHero
        align="right"
        eyebrow="Payouts"
        title="Straight to your bank"
        lede="logoless uses Stripe for every payment. Brands fund with Stripe, clippers withdraw with Stripe."
      />
      <Section className="py-16 md:py-28">
        <FeatureGrid
          features={[
            { icon: 'Landmark', title: 'Bank transfers', body: 'Withdraw to a bank account in a supported country, in your local currency.' },
            { icon: 'Lock', title: 'Verified by Stripe', body: 'Stripe handles identity and bank verification. We never see your full bank details.' },
            { icon: 'Receipt', title: 'Full history', body: 'Every earning, withdrawal and fee is itemised in your dashboard.' },
          ]}
        />
      </Section>
      <Section>
        <StickyStory
          eyebrow="Getting paid"
          title="Four steps"
          steps={[
            { title: 'Connect Stripe', body: 'From your dashboard, start Stripe onboarding. You confirm your identity and add a bank account on Stripe.' },
            { title: 'Earn as views verify', body: 'Your balance updates as views pass our checks. Pending views are shown separately until they clear.' },
            { title: 'Request a withdrawal', body: `Once your available balance reaches $${SITE.minPayoutUsd}, withdraw in one click.` },
            { title: 'Receive funds', body: 'Stripe sends the transfer to your bank. Timing depends on your country and bank.' },
          ]}
        />
      </Section>
      <Section className="py-16 md:py-28">
        <SectionTitle eyebrow="Good to know" title="The small print" />
        <ul className="max-w-2xl space-y-4 text-mute">
          <li>You are responsible for taxes on your earnings. Stripe may collect tax information.</li>
          <li>Payouts for clips later found to be fraudulent may be reversed.</li>
          <li>
            Read the full terms in{' '}
            <a href="/legal/payments" className="text-paper underline underline-offset-4">
              Payments &amp; Payouts
            </a>
            .
          </li>
        </ul>
      </Section>
      <CtaBand title="Connect Stripe" href="/onboarding?role=clipper" label="Get started" />
    </main>
  )
}
