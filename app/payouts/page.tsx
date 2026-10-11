import type { Metadata } from 'next'

import { CtaBand, FeatureGrid, SectionTitle } from '@/components/marketing/blocks'
import { PageHero, Section } from '@/components/marketing/page-hero'
import { Principles, StatRow, Ticker, Timeline } from '@/components/marketing/layouts'
import { SITE } from '@/lib/site'
import { T } from '@/components/shell/copy-provider'

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
      <Timeline
        eyebrow="Getting paid"
        title="Four steps"
        items={[
          { tag: 'Step 1', title: 'Connect Stripe', body: 'From your dashboard, start Stripe onboarding. You confirm your identity and add a bank account on Stripe.' },
          { tag: 'Step 2', title: 'Earn as views verify', body: 'Your balance updates as views pass our checks. Pending views are shown separately until they clear.' },
          { tag: 'Step 3', title: 'Request a withdrawal', body: `Once your available balance reaches $${SITE.minPayoutUsd}, withdraw in one click.` },
          { tag: 'Step 4', title: 'Receive funds', body: 'Stripe sends the transfer to your bank. Timing depends on your country and bank.' },
        ]}
      />
      <StatRow
        stats={[
          { value: `$${SITE.minPayoutUsd}`, label: 'Minimum payout', note: 'Withdraw as soon as you pass it' },
          { value: '1', label: 'Click to withdraw', note: 'Once Stripe is connected' },
          { value: '0', label: 'Bank details we keep', note: 'Stripe holds them, not us' },
        ]}
      />
      <Ticker words={['Verified', 'Cleared', 'Withdrawn', 'In your bank']} />
      <Principles
        eyebrow="Good to know"
        title="The small print"
        items={[
          { title: 'Taxes are yours', body: 'You are responsible for taxes on your earnings. Stripe may collect tax information.' },
          { title: 'Fraud can be reversed', body: 'Payouts for clips later found to be fraudulent may be reversed.' },
          { title: 'Read the full terms', body: 'The full rules are in Payments & Payouts, under Legal on this site.' },
        ]}
      />
      <CtaBand title="Connect Stripe" href="/onboarding?role=clipper" label="Get started" />
    </main>
  )
}
