import type { Metadata } from 'next'
import { CtaBand, FeatureGrid, SectionTitle } from '@/components/marketing/blocks'
import { Principles, StatRow, Timeline } from '@/components/marketing/layouts'
import { PageHero, Section } from '@/components/marketing/page-hero'
import { DriftWord } from '@/components/motion/parallax'
import { ScrollText } from '@/components/motion/scroll-text'

export const metadata: Metadata = {
  title: 'Fraud protection — logoless',
  description: 'Every view is checked. Only real ones get paid.',
}

export default function Page() {
  return (
    <main>
      <PageHero
        eyebrow="Trust and safety"
        title="Only real views get paid"
        lede="Fake views hurt brands and honest clippers alike. So every clip goes through the same checks, every time."
      />
      <Section className="py-16 md:py-28">
        <ScrollText className="max-w-[22ch] font-display text-5xl leading-[0.95] md:text-8xl" text="Submit it. Scan it. Check it again tomorrow. Then decide." />
      </Section>
      <DriftWord text="verified" from="5%" to="-45%" />
      <Section>
        <SectionTitle eyebrow="The checks" title="Four layers" align="right" />
        <FeatureGrid
          cols={2}
          features={[
            { icon: 'Bot', title: 'Bot detection', body: 'Automated analysis looks for view patterns that real audiences do not produce.' },
            { icon: 'FileSearch', title: 'Brief compliance', body: 'Each clip is compared with the campaign rules before it can earn.' },
            { icon: 'Eye', title: 'Scheduled re-checks', body: 'Live posts are checked again over time, so a clip that is clean on day one is not assumed clean forever.' },
            { icon: 'UserCheck', title: 'Human review', body: 'Anything unclear goes to a moderator. Likely fraud is rejected automatically.' },
          ]}
        />
      </Section>
      <Timeline
        eyebrow="The life of a clip"
        title="From link to decision"
        items={[
          { tag: 'Step 1', title: 'Submitted', body: 'A clipper pastes the link to a clip they posted on their own account.' },
          { tag: 'Step 2', title: 'Scanned', body: 'Automated checks compare the clip with the brief and look at how its views behave.' },
          { tag: 'Step 3', title: 'Re-checked', body: 'The post is checked again on a schedule, so a clip that was clean once is not assumed clean forever.' },
          { tag: 'Step 4', title: 'Decided', body: 'Clear passes are approved. Unclear cases go to a person. Likely fraud is rejected, with a reason you can see.' },
        ]}
      />
      <StatRow
        stats={[
          { value: '4', label: 'Layers of checks', note: 'On every clip, every time' },
          { value: '3', label: 'Platforms read', note: 'TikTok, YouTube and Instagram' },
          { value: '0', label: 'Paid for fake views', note: 'Rejected views are never billed or paid' },
        ]}
      />
      <Principles
        eyebrow="What gets stopped"
        title="Not paid, not billed"
        items={[
          { title: 'Bots and click farms', body: 'Traffic that real audiences do not produce is rejected, and the views are never paid.' },
          { title: 'Bought or incentivised views', body: 'Views that were purchased or paid for in breach of platform rules do not count.' },
          { title: 'Clips that break the brief', body: 'Each clip is compared with the campaign rules. A clip that breaks them does not earn.' },
          { title: 'Honest edits are safe', body: 'Real work is never penalised. If you think a decision is wrong, you can appeal it.' },
        ]}
      />
      <Section className="py-16 md:py-28">
        <p className="mx-auto max-w-2xl text-lg leading-snug text-mute">
          If you think a decision on your clip is wrong, you can appeal from the submission page. To report abuse or botting, contact{' '}
          <a href="mailto:abuse@logoless.io" className="text-paper underline underline-offset-4">
            abuse@logoless.io
          </a>
          .
        </p>
      </Section>
      <CtaBand title="Clip with confidence" href="/" label="Browse campaigns" />
    </main>
  )
}
