import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/blocks'
import { Principles, SplitBeat, StatRow, Ticker } from '@/components/marketing/layouts'
import { PageHero, Section } from '@/components/marketing/page-hero'
import { ScrollText } from '@/components/motion/scroll-text'
import { T } from '@/components/shell/copy-provider'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'About — logoless', description: 'Why logoless exists.' }

export default function Page() {
  return (
    <main>
      <PageHero align="right" eyebrow="About" title="Names fade. Views stay" lede="A marketplace for clips, where the people who cut them are paid for views that are real." />
      <Section className="py-16 md:py-28">
        <ScrollText
          className="max-w-[22ch] font-display text-5xl leading-[0.95] md:text-8xl"
          text="The internet already rewards the best clips. We are making sure the people who cut them are paid too."
        />
      </Section>
      <Ticker words={['Real views', 'Real people', 'Real pay', 'No logos']} />
      <SplitBeat n="01" label="The problem" title="Credit goes missing">
        <p>
          <T>
            Great content gets reshared a thousand times and the people doing the work see none of it. Brands, on the other side, struggle to tell real reach from bought reach.
          </T>
        </p>
      </SplitBeat>
      <SplitBeat n="02" label="The fix" title="One simple rule" flip list={['Money moves when real views happen', 'Briefs are clear and checks are consistent', 'Payouts are automatic']}>
        <p>
          <T>A simple marketplace with one rule: money moves when real views happen.</T>
        </p>
      </SplitBeat>
      <SplitBeat n="03" label="The name" title="About the work">
        <p>
          <T>
            logoless is about the work, not the badge. The clip speaks for itself, and the person behind it gets credit where it counts: in their balance.
          </T>
        </p>
      </SplitBeat>
      <StatRow
        stats={[
          { value: `${SITE.platformFeePct}%`, label: 'Platform fee', note: 'Taken from payouts, never added on top' },
          { value: `$${SITE.minPayoutUsd}`, label: 'Minimum payout', note: 'Withdraw whenever you pass it' },
          { value: '0', label: 'Follower minimum', note: 'Campaigns pay for views, not audience size' },
        ]}
      />
      <Principles
        eyebrow="What we hold to"
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
