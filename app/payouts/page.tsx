import type { Metadata } from 'next'

import { CtaBand, FeatureGrid } from '@/components/marketing/blocks'
import { PageHero } from '@/components/marketing/page-hero'
import { Principles, StatRow, Steps } from '@/components/marketing/layouts'
import { CONTAINER } from '@/lib/layout'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Payouts | logoless',
  description: 'How logoless pays clippers through Stripe.',
}

export default function Page() {
  return (
    <main>
      <PageHero
        eyebrow="Payouts"
        title="Straight to your bank"
        lede="logoless uses Stripe for every payment. Brands fund with Stripe, clippers withdraw with Stripe."
      />
      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <FeatureGrid
          features={[
            { title: 'Bank transfers', body: 'Withdraw to a bank account in a supported country, in your local currency.' },
            { title: 'Verified by Stripe', body: 'Stripe handles identity and bank verification. We never see your full bank details.' },
            { title: 'Full history', body: 'Every earning, withdrawal and fee is itemised in your dashboard.' },
          ]}
        />
      </section>
      <Steps
        title="Getting paid"
        steps={[
          { title: 'Connect Stripe', body: 'From your dashboard, start Stripe onboarding. You confirm your identity and add a bank account on Stripe.' },
          { title: 'Earn as views verify', body: 'Your balance updates as views pass our checks. Pending views are shown separately until they clear.' },
          { title: 'Request a withdrawal', body: `Once your available balance reaches $${SITE.minPayoutUsd}, withdraw in one click.` },
          { title: 'Receive funds', body: 'Stripe sends the transfer to your bank. Timing depends on your country and bank.' },
        ]}
      />
      <StatRow
        stats={[
          { value: `$${SITE.minPayoutUsd}`, label: 'Minimum payout', note: 'Withdraw as soon as you pass it' },
          { value: '1', label: 'Click to withdraw', note: 'Once Stripe is connected' },
          { value: '0', label: 'Bank details we keep', note: 'Stripe holds them, not us' },
        ]}
      />
      <Principles
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
