import type { Metadata } from 'next'

import { CtaBand, FeatureGrid, SectionTitle } from '@/components/marketing/blocks'
import { PageHero, Section } from '@/components/marketing/page-hero'
import { PillLink } from '@/components/motion/cta'
import { Reveal } from '@/components/motion/reveal'
import { StickyStory } from '@/components/motion/sticky-story'

export const metadata: Metadata = {
  title: 'For clippers — logoless',
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

      <Section>
        <SectionTitle eyebrow="Why clippers stay" title="Keep what you make" align="right" />
        <FeatureGrid
          features={[
            { icon: 'Unlock', title: 'No gatekeeping', body: 'No follower minimum and no application. Join a live campaign and start.' },
            { icon: 'Clapperboard', title: 'Your account, your clip', body: 'Post on your own channels. You keep your audience and your content.' },
            { icon: 'Banknote', title: 'Clear rates', body: 'The rate per 1,000 views is on every campaign before you start.' },
            { icon: 'Link2', title: 'Link once', body: 'Connect TikTok, YouTube and Instagram a single time and submit clips in seconds.' },
            { icon: 'Sparkles', title: 'Fair checks', body: 'Rejections come with a reason, and honest edits are never penalised.' },
            { icon: 'Smartphone', title: 'Track from anywhere', body: 'Watch clips move from review to paid on your dashboard.' },
          ]}
        />
      </Section>

      <Section>
        <StickyStory
          eyebrow="Your first clip"
          title="Zero to paid"
          steps={[
            { title: 'Create your account', body: 'Sign in with Discord, Google or email. It takes less than a minute.' },
            { title: 'Link where you post', body: 'Connect the accounts you will publish from so we can read view counts on your clips.' },
            { title: 'Join a campaign and post', body: 'Read the brief, make the clip and paste the link into the campaign page.' },
            { title: 'Withdraw through Stripe', body: 'Add a payout method once. When your balance passes the minimum, withdraw.' },
          ]}
        />
      </Section>

      <Reveal>
        <CtaBand title="Find your first campaign" href="/" label="Browse campaigns" secondaryHref="/onboarding?role=clipper" secondaryLabel="Create account" />
      </Reveal>
    </main>
  )
}
