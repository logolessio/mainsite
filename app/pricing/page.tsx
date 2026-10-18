import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/blocks'
import { Breadcrumbs, Related } from '@/components/marketing/breadcrumbs'
import { FeePromise } from '@/components/marketing/fee-promise'
import { PageHero } from '@/components/marketing/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { CONTAINER } from '@/lib/layout'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Pricing | logoless',
  description: "No subscription. Creators join free and keep every cent. Brands pay a small fee on top, and we cover PayPal's fees on deposits and withdrawals.",
  alternates: { canonical: '/pricing' },
}

export default function Page() {
  return (
    <main>
      <Breadcrumbs trail={[{ name: 'Pricing' }]} />
      <PageHero eyebrow="Pricing" title="No subscription" lede="Brands fund the campaigns, creators upload their content and get paid. We fully cover all transaction fees and take a small sum to cover running this platform. What a creator earns is what they get." />
      <FeePromise />
      <section className={`${CONTAINER} pb-24 md:pb-36`}>
        <div className="grid gap-12 md:grid-cols-2 md:gap-10">
          {[
            { who: 'Brands', big: `${SITE.platformFeePct}%`, line: 'added on top of what creators earn', points: ['You set the budget and the rate', `A $1,000 budget costs $${(1000 + (1000 * SITE.platformFeePct) / 100).toLocaleString()}`, 'You only pay for verified views', "We pay PayPal's fees on every deposit", 'A single editable balance for each campaign, unused money is still yours.']},
            { who: 'Creators', big: 'Free', line: 'to join and to submit content', points: ['No joining or submission fee', 'You keep everything a campaign pays you', `Withdraw from $${SITE.minPayoutUsd} to any PayPal email`, "We pay PayPal's fees, so everyone gets what they paid for (literally)"] },
          ].map((c, i) => (
            <Reveal key={c.who} delay={i * 0.06} className="rounded-[calc(2rem*var(--round,1))] border border-line p-8 md:p-10">
              <p className="text-lg text-paper/60">{c.who}</p>
              <p className="mt-6 font-display text-[clamp(4.5rem,10vw,8rem)] leading-[0.9]">{c.big}</p>
              <p className="mt-3 text-lg text-paper/60">{c.line}</p>
              <ul className="mt-8 grid gap-3 text-[17px]">
                {c.points.map((p) => (
                  <li key={p} className="border-t border-line pt-3">
                    {p}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </section>
      <CtaBand title="Create your account now" href="/onboarding" label="Get started" />
      <Related links={[{ href: '/for-creators', label: 'For creators' }, { href: '/for-brands', label: 'For brands' }, { href: '/faq', label: "That's why its called a Q&A :)" }]} />
    </main>
  )
}
