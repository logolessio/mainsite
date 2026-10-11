import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/blocks'
import { Compare, HorizontalStory, Principles, Ticker } from '@/components/marketing/layouts'
import { EarnDemo } from '@/components/marketing/earn-demo'
import { PageHero } from '@/components/marketing/page-hero'

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
      <HorizontalStory
        eyebrow="The loop"
        title="Start to payout"
        steps={[
          { title: 'A brand funds a brief', body: 'They set a budget, a rate per 1,000 views, the platforms that count and clear rules for what to clip.', detail: ['Budget is held before the campaign goes live', 'Rules are written in plain language'] },
          { title: 'Clippers join and post', body: 'Anyone can join a live campaign. Make the clip, post it on your own TikTok, YouTube or Instagram account and paste the link.', detail: ['No follower minimum', 'Link your accounts once'] },
          { title: 'We check every clip', body: 'Each submission is checked against the brief and scanned for bot traffic. Unclear cases go to a human moderator.', detail: ['Automated scan on submission', 'Live posts are re-checked'] },
          { title: 'Verified views turn into money', body: 'Approved clips earn at the campaign rate for each 1,000 verified views. Earnings land in your balance as they are confirmed.', detail: ['Real-time balance in your dashboard', 'Rejected views are never paid'] },
          { title: 'Withdraw with Stripe', body: 'Connect a bank account through Stripe once. Withdraw whenever your balance passes the minimum.', detail: ['Stripe handles identity checks', 'Payout history and receipts in one place'] },
        ]}
      />
      <EarnDemo />
      <Compare
        left={{ title: 'If you are a brand', items: ['Write the brief and the rules', 'Set a budget and a rate per 1,000 views', 'Fund the campaign and go live', 'Watch verified views and spend in real time'] }}
        right={{ title: 'If you are a clipper', items: ['Join a live campaign, no application', 'Cut the clip and post it on your own account', 'Paste the link and let the checks run', 'Withdraw your balance through Stripe'] }}
      />
      <Ticker words={['Brief', 'Clip', 'Verify', 'Paid']} />
      <Principles
        eyebrow="Behind the loop"
        title="What keeps it fair"
        items={[
          { title: 'Money is reserved first', body: 'A brand funds the budget before a campaign goes live, so clippers are never promised money that is not there.' },
          { title: 'Only verified views pay', body: 'A view counts once it has passed the checks. Views that fail are not paid and not billed.' },
          { title: 'Every decision has a reason', body: 'Approvals and rejections come with a note, and you can appeal anything from the submission page.' },
        ]}
      />
      <CtaBand title="Ready when you are" href="/onboarding" label="Create an account" secondaryHref="/" secondaryLabel="Browse campaigns" />
    </main>
  )
}
