import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/blocks'
import { Breadcrumbs, Related } from '@/components/marketing/breadcrumbs'
import { PageHero } from '@/components/marketing/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { CONTAINER } from '@/lib/layout'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Pricing | logoless',
  description: 'No subscription. Clippers join free, and we keep 10% of what is paid out.',
  alternates: { canonical: '/pricing' },
}

export default function Page() {
  return (
    <main>
      <Breadcrumbs trail={[{ name: 'Pricing' }]} />
      <PageHero eyebrow="Pricing" title="No subscription" lede={`You fund a campaign, clippers earn from verified views, and we keep ${SITE.platformFeePct}% of what is paid out. There is nothing else to pay.`} />
      <section className={`${CONTAINER} pb-24 md:pb-36`}>
        <div className="grid gap-12 md:grid-cols-2 md:gap-10">
          {[
            { who: 'Brands', big: `${SITE.platformFeePct}%`, line: 'of what we pay out to clippers', points: ['You set the budget and the rate', 'You only pay for verified views', 'Unspent budget comes back to you', `Minimum top-up of $${SITE.minTopUpUsd}`] },
            { who: 'Clippers', big: 'Free', line: 'to join and to submit clips', points: ['No joining or submission fee', `Withdraw from $${SITE.minPayoutUsd}`, 'The payment provider may charge its own transfer fees'] },
          ].map((c, i) => (
            <Reveal key={c.who} delay={i * 0.06} className="rounded-[2rem] border border-line p-8 md:p-10">
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
      <CtaBand title="Make an account" href="/onboarding" label="Get started" />
      <Related links={[{ href: '/for-clippers', label: 'For creators' }, { href: '/for-brands', label: 'For brands' }, { href: '/faq', label: 'Questions' }]} />
    </main>
  )
}
