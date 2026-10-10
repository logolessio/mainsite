import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/blocks'
import { PageHero, Section } from '@/components/marketing/page-hero'
import { StickyStory } from '@/components/motion/sticky-story'

export const metadata: Metadata = {
  title: 'How it works — logoless',
  description: 'From brief to payout: how logoless campaigns work for brands and clippers.',
}

export default function Page() {
  return (
    <main>
      <PageHero
        eyebrow="How it works"
        title="Brief. Clip. Verify. Paid."
        lede="Four moves, one honest loop. Here is what happens between a brand having an idea and a clipper getting paid."
      />
      <Section>
        <StickyStory
          eyebrow="The loop"
          title="Start to payout"
          steps={[
            {
              title: 'A brand funds a brief',
              body: 'They set a budget, a rate per 1,000 views, the platforms that count and clear rules for what to clip.',
              detail: ['Budget is held on logoless before the campaign goes live', 'Rules are written in plain language'],
            },
            {
              title: 'Clippers join and post',
              body: 'Anyone can join a live campaign. Make the clip, post it on your own TikTok, YouTube or Instagram account and paste the link.',
              detail: ['No follower minimum', 'Link your accounts once, reuse them everywhere'],
            },
            {
              title: 'We check every clip',
              body: 'Each submission is checked against the brief and scanned for bot traffic. Unclear cases go to a human moderator.',
              detail: ['Automated scan on submission', 'Live posts are re-checked on a schedule'],
            },
            {
              title: 'Verified views turn into money',
              body: 'Approved clips earn at the campaign rate for each 1,000 verified views. Earnings land in your balance as they are confirmed.',
              detail: ['Real-time balance in your dashboard', 'Rejected views are never paid'],
            },
            {
              title: 'Withdraw with Stripe',
              body: 'Connect a bank account through Stripe once. Withdraw whenever your balance passes the minimum.',
              detail: ['Stripe handles identity checks and transfers', 'Payout history and receipts in one place'],
            },
          ]}
        />
      </Section>
      <CtaBand
        title="Ready when you are"
        href="/onboarding"
        label="Create an account"
        secondaryHref="/"
        secondaryLabel="Browse campaigns"
      />
    </main>
  )
}
