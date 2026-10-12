import type { Metadata } from 'next'
import { connection } from 'next/server'

import { CtaBand, FeatureGrid } from '@/components/marketing/blocks'
import { ClipperCalculator } from '@/components/marketing/calculators'
import { Principles, StatRow, Steps } from '@/components/marketing/layouts'
import { PageHero } from '@/components/marketing/page-hero'
import { CoverStrip } from '@/components/marketing/cover-strip'
import { PillLink } from '@/components/motion/cta'
import { liveCampaigns } from '@/lib/campaigns-db'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'For clippers | logoless',
  description: 'Get paid for every 1,000 verified views your clips earn.',
}

export default async function Page() {
  await connection()
  const live = await liveCampaigns().catch(() => [])
  return (
    <main>
      <PageHero
        eyebrow="For clippers and editors"
        title="Get paid for your edits"
        lede="Pick a campaign from an artist, streamer or brand you like. Cut a clip, post it on your own account, and earn a set rate for every 1,000 views we verify."
      >
        <PillLink href="/onboarding?role=clipper">Start clipping</PillLink>
        <PillLink href="/" variant="ghost">
          Browse campaigns
        </PillLink>
      </PageHero>

      <CoverStrip campaigns={live} />

      <section className="mx-auto w-full max-w-[1400px] px-5 pb-24 md:px-10 md:pb-40">
        <FeatureGrid
          features={[
            { title: 'No audience needed', body: "There's no follower minimum and no application. If a campaign is live, you can join it." },
            { title: 'Post on your own accounts', body: 'Your clips stay on your TikTok, YouTube or Instagram, so you keep your audience and your content. We only look at the view counts so we can pay you for them.' },
            { title: 'You see the rate first', body: 'Every campaign shows its rate per 1,000 views before you join, so you know what a clip can earn.' },
            { title: 'Add your accounts once', body: 'Put in your TikTok, YouTube and Instagram usernames one time. After that, submitting a clip is just pasting a link.' },
            { title: 'Rejections come with a reason', body: "If we turn a clip down, you'll see why on the clip in your dashboard." },
            { title: 'Follow it in your dashboard', body: 'Each clip shows where it is: waiting for review, approved, or paid.' },
          ]}
        />
      </section>

      <StatRow
        stats={[
          { value: '$0', label: 'To join', note: 'No fee and no application' },
          { value: '0', label: 'Followers needed', note: 'Campaigns pay for views, not audience size' },
          { value: `$${SITE.minPayoutUsd}`, label: 'Minimum payout', note: 'Withdrawn to your bank through Stripe' },
        ]}
      />
      <Steps
        title="From signing up to getting paid"
        steps={[
          { title: 'Make an account', body: 'Sign in with Google, Discord or email. It takes about a minute.' },
          { title: 'Add where you post', body: 'Add your TikTok, YouTube or Instagram username so we know which accounts are yours.' },
          { title: 'Join a campaign and post a clip', body: 'Read the brief, cut the clip, post it on your own account, then paste the link on the campaign page.' },
          { title: 'Get paid', body: `We check your clip and its views. Approved earnings clear after ${SITE.holdDays} days, and you can withdraw to your bank through Stripe once you're past $${SITE.minPayoutUsd}.` },
        ]}
      />
      <ClipperCalculator />
      <Principles
        title="Common questions"
        items={[
          { title: 'What if a clip is rejected?', body: "You'll see the reason on the clip in your dashboard. If you think we got it wrong, email support and we'll take another look." },
          { title: 'When do views count?', body: "Once we've approved the clip. We look up its real view count on the platform and pay you for it, then check again while the campaign is running." },
          { title: 'Which platforms work?', body: 'TikTok, YouTube (Shorts and longer videos) and Instagram Reels. Each campaign says which ones it accepts.' },
        ]}
      />
      <CtaBand title="Find your first campaign" href="/" label="Browse campaigns" secondaryHref="/onboarding?role=clipper" secondaryLabel="Make an account" />
    </main>
  )
}
