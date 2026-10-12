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
        lede="Brands pay in through Stripe and clippers withdraw through Stripe. We never handle your bank details."
      />
      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <FeatureGrid
          features={[
            { title: 'Bank transfers', body: 'Withdraw to a bank account in a supported country, in your own currency.' },
            { title: 'Checked by Stripe', body: 'Stripe handles identity and bank verification. We never see your full bank details.' },
            { title: 'A full history', body: 'Every earning, withdrawal and fee is listed in your dashboard.' },
          ]}
        />
      </section>
      <Steps
        title="How you get paid"
        steps={[
          { title: 'Connect Stripe', body: "From your dashboard, start Stripe's setup. You confirm who you are and add a bank account on Stripe's side." },
          { title: 'Earn as views are verified', body: "Your balance grows as we verify views. Anything still clearing is shown separately." },
          { title: 'Withdraw', body: `Once your available balance is $${SITE.minPayoutUsd} or more, you can withdraw in a click.` },
          { title: 'Receive the money', body: 'Stripe sends it to your bank. How long it takes depends on your country and your bank.' },
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
          { title: 'Taxes are yours', body: "You're responsible for tax on what you earn. Stripe may ask you for tax details." },
          { title: 'Fraud can be reversed', body: "If a clip turns out to be fraudulent after it's been paid, we can take the payout back." },
          { title: 'The full terms', body: 'The detailed rules are in Payments & Payouts, under Legal.' },
        ]}
      />
      <CtaBand title="Set up payouts" href="/onboarding?role=clipper" label="Get started" />
    </main>
  )
}
