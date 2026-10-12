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
        lede={`You fund a campaign, clippers earn from verified views, and we keep ${SITE.platformFeePct}% of what's paid out. There's nothing else to pay.`}
      />
      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <div className="grid gap-16 md:grid-cols-2 md:gap-10">
          <Reveal className="border-t border-line pt-6">
            <p className="text-xl"><T>Brands</T></p>
            <p className="mt-10 font-display text-[clamp(5.5rem,13vw,12rem)] leading-[0.85] tracking-[-0.055em]">{SITE.platformFeePct}%</p>
            <p className="mt-6 text-xl text-paper/60"><T>of what we pay out to clippers</T></p>
            <ul className="mt-12 border-b border-line">
              {[
                'You set the budget and the rate per 1,000 views',
                'You only pay for verified views',
                'Anything unspent comes back to you',
                `Minimum top-up of $${SITE.minTopUpUsd}`,
              ].map((t) => (
                <li key={t} className="border-t border-line py-4 text-lg text-paper/75"><T>{t}</T></li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="border-t border-line pt-6">
            <p className="text-xl"><T>Clippers</T></p>
            <p className="mt-10 font-display text-[clamp(5.5rem,13vw,12rem)] leading-[0.85] tracking-[-0.055em]">Free</p>
            <p className="mt-6 text-xl text-paper/60"><T>to join and to submit clips</T></p>
            <ul className="mt-12 border-b border-line">
              {['No joining fee, no submission fee', `Withdraw from $${SITE.minPayoutUsd}`, 'Stripe can charge its own transfer or currency fees'].map((t) => (
                <li key={t} className="border-t border-line py-4 text-lg text-paper/75"><T>{t}</T></li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
      <Principles
        title="The details"
        items={[
          { title: 'Adding funds', body: 'Pay by card or bank transfer through Stripe. The money is assigned to a campaign when you create it.' },
          { title: 'Your budget is the cap', body: "Clippers are paid out of the campaign budget as views are verified. Our fee comes out of their payout, so the budget you set is the most you'll spend." },
          { title: 'Getting money back', body: 'If a campaign ends with budget left, you can ask for it back. The refund policy under Legal has the details.' },
        ]}
      />
      <CtaBand title="Make an account" href="/onboarding" label="Get started" />
    </main>
  )
}
