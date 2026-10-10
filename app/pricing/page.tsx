import type { Metadata } from 'next'
import { CtaBand, SectionTitle, Split } from '@/components/marketing/blocks'
import { PageHero, Section } from '@/components/marketing/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { SITE } from '@/lib/site'
import { T } from '@/components/shell/copy-provider'

export const metadata: Metadata = {
  title: 'Pricing — logoless',
  description: 'No subscriptions. Pay for verified views plus a simple platform fee.',
}

export default function Page() {
  return (
    <main>
      <PageHero
        align="center"
        eyebrow="Pricing"
        title="No subscription"
        lede="You fund a campaign, clippers earn from verified views, and we take a platform fee on payouts. That is all."
      />
      <Section className="py-16 md:py-28">
        <div className="grid gap-px bg-line md:grid-cols-2 rounded-3xl overflow-hidden">
          <Reveal className="bg-ink p-12 text-center md:p-20">
            <p className="font-mono text-xs text-mute"><T>Brands</T></p>
            <p className="mt-6 font-display text-8xl leading-none md:text-[9rem]">{SITE.platformFeePct}%</p>
            <p className="mt-2 text-mute"><T>platform fee on paid-out views</T></p>
            <ul className="mt-12 flex flex-col items-center gap-3 text-sm text-paper/85">
              <li><T>Set your own budget and rate per 1,000 views</T></li>
              <li><T>Pay only for verified views</T></li>
              <li><T>Unspent budget returns to your balance</T></li>
              <li>Minimum top-up of ${SITE.minTopUpUsd}</li>
            </ul>
          </Reveal>
          <Reveal delay={0.12} className="bg-ink p-12 text-center md:p-20">
            <p className="font-mono text-xs text-mute"><T>Clippers</T></p>
            <p className="mt-6 font-display text-8xl leading-none md:text-[9rem]">Free</p>
            <p className="mt-2 text-mute"><T>to join, submit and earn</T></p>
            <ul className="mt-12 flex flex-col items-center gap-3 text-sm text-paper/85">
              <li><T>No joining or submission fees</T></li>
              <li>Withdraw from ${SITE.minPayoutUsd}</li>
              <li><T>Stripe may apply its own transfer or currency conversion fees</T></li>
            </ul>
          </Reveal>
        </div>
      </Section>
      <Section>
        <SectionTitle eyebrow="The detail" title="How billing works" />
        <Split label="Funding">
          <p><T>Add funds by card or bank transfer through Stripe. Funds are assigned to campaigns as you create them.</T></p>
        </Split>
        <Split label="Payouts" flip>
          <p><T>
            Clippers are paid from campaign budget as views are verified. The platform fee is taken from the payout
            amount, so the budget you set is the most you will ever spend on views.
          </T></p>
        </Split>
        <Split label="Refunds">
          <p>
            Unspent campaign budget can be refunded to your original payment method. See our{' '}
            <a href="/legal/refunds" className="text-paper underline underline-offset-4">
              refund policy
            </a>
            .
          </p>
        </Split>
      </Section>
      <CtaBand title="Start for free" href="/onboarding" label="Create an account" />
    </main>
  )
}
