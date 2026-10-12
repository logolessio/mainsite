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
      <PageHero eyebrow="About" title="Names fade. Views stay" lede="A marketplace for clips, where the people who cut them are paid for views that are real." />
      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <ScrollText
          className="max-w-[26ch] font-display text-4xl leading-[1] tracking-[-0.04em] md:text-[4.5rem]"
          text="The internet already rewards the best clips. We are making sure the people who cut them are paid too."
        />
      </section>
      <Principles
        title="Why we exist"
        items={[
          { title: 'Credit goes missing', body: 'Great content gets reshared a thousand times and the people doing the work see none of it. Brands, on the other side, struggle to tell real reach from bought reach.' },
          { title: 'One simple rule', body: 'A simple marketplace with one rule: money moves when real views happen. Briefs are clear, checks are consistent and payouts are automatic.' },
          { title: 'About the work', body: 'logoless is about the work, not the badge. The clip speaks for itself, and the person behind it gets credit where it counts: in their balance.' },
        ]}
      />
      <StatRow
        stats={[
          { value: `${SITE.platformFeePct}%`, label: 'Platform fee', note: 'Taken from payouts, never added on top' },
          { value: `$${SITE.minPayoutUsd}`, label: 'Minimum payout', note: 'Withdraw whenever you pass it' },
          { value: '0', label: 'Follower minimum', note: 'Campaigns pay for views, not audience size' },
        ]}
      />
      <Principles
        title="Four promises"
        items={[
          { title: 'Pay for real views', body: 'Every clip is checked before it earns, and checked again later. Fake views are never paid.' },
          { title: 'Say why', body: 'If a clip is rejected you see the reason, and you can appeal from the submission page.' },
          { title: 'Keep it plain', body: 'Briefs, rules and policies are written in plain language that anyone can follow.' },
          { title: 'Credit the work', body: 'Clippers keep their accounts, their audience and their content. We only pay for what they make.' },
        ]}
      />
      <CtaBand title="Join in" href="/onboarding" label="Create an account" secondaryHref="/careers" secondaryLabel="Careers" />
    </main>
  )
}
