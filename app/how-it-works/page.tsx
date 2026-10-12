import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/blocks'
import { EarnDemo } from '@/components/marketing/earn-demo'
import { Compare, Principles, Steps } from '@/components/marketing/layouts'
import { PageHero } from '@/components/marketing/page-hero'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'How it works | logoless',
  description: 'From brief to payout: how logoless campaigns work for brands and clippers.',
}

export default function Page() {
  return (
    <main>
      <PageHero
        eyebrow="How it works"
        title="From brief to payout"
        lede="Here's what happens between a brand having an idea and a clipper getting paid."
      />
      <Steps
        title="Start to finish"
        steps={[
          { title: 'A brand writes a brief', body: 'They set a budget, a rate per 1,000 views, which platforms count, and what to clip and what to leave alone.', detail: ['We read every brief before it goes live', 'The budget is paid in first'] },
          { title: 'Clippers join and post', body: 'Anyone can join a live campaign. Cut a clip, post it on your own TikTok, YouTube or Instagram account and paste the link.', detail: ['No follower minimum', 'Add your accounts once'] },
          { title: 'We review every clip', body: "Someone on our team checks each clip against the brief. If it doesn't fit, it's turned down with a reason.", detail: ['Brands can turn down clips too', "Nothing is paid until we've approved it"] },
          { title: 'Verified views become money', body: "We look up the clip's real view count on the platform. Approved clips earn the campaign's rate for each 1,000 verified views, added to your balance as we confirm them.", detail: ['Your balance is in your dashboard', "Views that don't check out aren't paid"] },
          { title: 'Withdraw with Stripe', body: `Connect a bank account through Stripe once. After your earnings clear, you can withdraw whenever your balance is past $${SITE.minPayoutUsd}.`, detail: ['Stripe checks your identity', 'Your payout history is kept in your dashboard'] },
        ]}
      />
      <EarnDemo />
      <Compare
        left={{ title: "If you're a brand", items: ['Write the brief and the rules', 'Pick a rate per 1,000 views and a budget', 'Pay once we have said yes, then go live', 'Follow clips and spend from your dashboard'] }}
        right={{ title: "If you're a clipper", items: ['Join any live campaign, no application', 'Cut the clip and post it on your own account', 'Paste the link and wait for our review', 'Withdraw to your bank through Stripe'] }}
      />
      <Principles
        title="What keeps it fair"
        items={[
          { title: "The money's there first", body: "A brand pays in the budget before a campaign goes live, so you're never promised money that doesn't exist." },
          { title: 'Only verified views are paid', body: "A view counts once we've checked it. Views that don't check out aren't paid, and the brand isn't billed for them." },
          { title: 'Rejections have reasons', body: "If a clip is turned down, you'll see why." },
        ]}
      />
      <CtaBand title="Ready to start?" href="/onboarding" label="Make an account" secondaryHref="/" secondaryLabel="Browse campaigns" />
    </main>
  )
}
