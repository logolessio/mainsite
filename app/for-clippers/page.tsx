import type { Metadata } from 'next'

import { CtaBand, FeatureGrid } from '@/components/marketing/blocks'
import { ClipperCalculator } from '@/components/marketing/calculators'
import { Principles, StatRow, Steps } from '@/components/marketing/layouts'
import { PageHero } from '@/components/marketing/page-hero'
import { PillLink } from '@/components/motion/cta'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'For clippers | logoless',
  description: 'Get paid for every 1,000 verified views your clips earn.',
}

export default function Page() {
  return (
    <main>
      <PageHero
        eyebrow="For clippers and editors"
        title="Get paid for your edits"
        lede="Pick a campaign from an artist, streamer or brand you like. Cut it, post it, and earn for every 1,000 verified views."
      >
        <PillLink href="/onboarding?role=clipper">Start clipping</PillLink>
        <PillLink href="/" variant="ghost">
          Browse campaigns
        </PillLink>
      </PageHero>

      <section className="mx-auto w-full max-w-[1400px] px-5 pb-24 md:px-10 md:pb-40">
        <FeatureGrid
          features={[
            { title: 'No gatekeeping', body: 'No follower minimum and no application. Join a live campaign and start.' },
            { title: 'Your account, your clip', body: 'Post on your own channels. You keep your audience and your content. We only read the view counts so you can be paid for them.' },
            { title: 'Clear rates', body: 'The rate per 1,000 views is on every campaign before you start, so you always know what a clip could earn.' },
            { title: 'Link once', body: 'Connect TikTok, YouTube and Instagram a single time and submit clips in seconds.' },
            { title: 'Fair checks', body: 'Rejections come with a reason, and honest edits are never penalised.' },
            { title: 'Track from anywhere', body: 'Watch clips move from review to paid on your dashboard.' },
          ]}
        />
      </section>

      <StatRow
        stats={[
          { value: '0', label: 'To join', note: 'No fee, no application' },
          { value: '0', label: 'Follower minimum', note: 'Campaigns pay for views, not audience size' },
          { value: `$${SITE.minPayoutUsd}`, label: 'Minimum payout', note: 'Withdraw through Stripe' },
        ]}
      />
      <Steps
        title="Zero to paid"
        steps={[
          { title: 'Create your account', body: 'Sign in with Discord, Google or email. It takes less than a minute.' },
          { title: 'Link where you post', body: 'Connect the accounts you will publish from so we can read view counts on your clips.' },
          { title: 'Join a campaign and post', body: 'Read the brief, make the clip and paste the link into the campaign page.' },
          { title: 'Withdraw through Stripe', body: 'Add a payout method once. When your balance passes the minimum, withdraw.' },
        ]}
      />
      <ClipperCalculator />
      <Principles
        title="Straight answers"
        items={[
          { title: 'What if a clip is rejected?', body: 'You will see the reason on the submission, and you can appeal or resubmit a fixed version when the campaign allows it.' },
          { title: 'When do views count?', body: 'After your clip is approved against the brief. Views are then re-checked on a schedule, and only verified views are paid.' },
          { title: 'Which platforms work?', body: 'TikTok, YouTube (Shorts and long-form) and Instagram Reels. Each campaign lists the platforms it accepts.' },
        ]}
      />
      <CtaBand title="Find your first campaign" href="/" label="Browse campaigns" secondaryHref="/onboarding?role=clipper" secondaryLabel="Create account" />
    </main>
  )
}
