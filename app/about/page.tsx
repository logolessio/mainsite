import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/blocks'
import { Principles, StatRow } from '@/components/marketing/layouts'
import { PageHero } from '@/components/marketing/page-hero'
import { ScrollText } from '@/components/motion/scroll-text'
import { CONTAINER } from '@/lib/layout'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'About | logoless', description: 'Why logoless exists.' }

export default function Page() {
  return (
    <main>
      <PageHero eyebrow="About" title="Clips should pay" lede="logoless is a marketplace where the people who cut clips get paid for the views those clips earn." />
      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <ScrollText
          className="max-w-[26ch] font-display text-4xl leading-[1] tracking-[-0.04em] md:text-[4.5rem]"
          text="The best clips already spread on their own, and the people who cut them usually see nothing from it. We'd like to change that."
        />
      </section>
      <Principles
        title="Why we made it"
        items={[
          { title: 'Credit goes missing', body: "A good clip gets reshared a thousand times and the person who made it sees none of the money. Brands have the opposite problem: it's hard to tell real reach from bought reach." },
          { title: 'One rule', body: 'Money moves when real views happen. Briefs are in plain words, we check clips the same way every time, and payouts go out through Stripe.' },
          { title: 'The name', body: 'logoless is about the work, not the badge. The clip speaks for itself, and the person behind it gets paid for it.' },
        ]}
      />
      <StatRow
        stats={[
          { value: `${SITE.platformFeePct}%`, label: 'Our fee', note: 'Taken from payouts, never added on top' },
          { value: `$${SITE.minPayoutUsd}`, label: 'Minimum payout', note: 'Withdraw whenever your balance is past it' },
          { value: '0', label: 'Followers needed', note: 'Campaigns pay for views, not audience size' },
        ]}
      />
      <Principles
        title="What we hold ourselves to"
        items={[
          { title: 'We pay for real views', body: 'Every clip is checked before it earns, and views are checked again while a campaign is running.' },
          { title: 'We say why', body: "If we turn a clip down, you'll see the reason." },
          { title: 'We keep it plain', body: 'Briefs, rules and policies are written so anyone can follow them.' },
          { title: 'You keep your work', body: 'Clippers keep their accounts, their audience and their content. We only pay for what they make.' },
        ]}
      />
      <CtaBand title="Come and join us" href="/onboarding" label="Make an account" secondaryHref="/careers" secondaryLabel="Careers" />
    </main>
  )
}
