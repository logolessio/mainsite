import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/blocks'
import { Principles } from '@/components/marketing/layouts'
import { PageHero } from '@/components/marketing/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { T } from '@/components/shell/copy-provider'
import { CONTAINER } from '@/lib/layout'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Pricing | logoless',
  description: 'No subscriptions. Pay for verified views plus a simple platform fee.',
}

export default function Page() {
  return (
    <main>
      <PageHero
        eyebrow="Pricing"
        title="No subscription"
        lede="You fund a campaign, clippers earn from verified views, and we take a platform fee on payouts. That is all."
      />
      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <div className="grid gap-16 md:grid-cols-2 md:gap-10">
          <Reveal className="border-t border-line pt-6">
            <p className="text-xl"><T>Brands</T></p>
            <p className="mt-10 font-display text-[clamp(5.5rem,13vw,12rem)] leading-[0.85] tracking-[-0.055em]">{SITE.platformFeePct}%</p>
            <p className="mt-6 text-xl text-paper/60"><T>platform fee on paid-out views</T></p>
            <ul className="mt-12 border-b border-line">
              {[
                'Set your own budget and rate per 1,000 views',
                'Pay only for verified views',
                'Unspent budget returns to your balance',
                `Minimum top-up of $${SITE.minTopUpUsd}`,
              ].map((t) => (
                <li key={t} className="border-t border-line py-4 text-lg text-paper/75"><T>{t}</T></li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="border-t border-line pt-6">
            <p className="text-xl"><T>Clippers</T></p>
            <p className="mt-10 font-display text-[clamp(5.5rem,13vw,12rem)] leading-[0.85] tracking-[-0.055em]">Free</p>
            <p className="mt-6 text-xl text-paper/60"><T>to join, submit and earn</T></p>
            <ul className="mt-12 border-b border-line">
              {['No joining or submission fees', `Withdraw from $${SITE.minPayoutUsd}`, 'Stripe may apply its own transfer or currency conversion fees'].map((t) => (
                <li key={t} className="border-t border-line py-4 text-lg text-paper/75"><T>{t}</T></li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
      <Principles
        title="The small print"
        items={[
          { title: 'Add funds your way', body: 'Add funds by card or bank transfer through Stripe. Funds are assigned to campaigns as you create them.' },
          { title: 'The budget is the cap', body: 'Clippers are paid from campaign budget as views are verified. The platform fee is taken from the payout amount, so the budget you set is the most you will ever spend on views.' },
          { title: 'Keep what you do not use', body: 'Unspent campaign budget can be refunded to your original payment method. See our refund policy under Legal.' },
        ]}
      />
      <CtaBand title="Start for free" href="/onboarding" label="Create an account" />
    </main>
  )
}
