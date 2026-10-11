import type { Metadata } from 'next'

import { CtaBand, FeatureGrid, SectionTitle } from '@/components/marketing/blocks'
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
        <ScrollText
          className="max-w-[22ch] font-display text-5xl leading-[0.95] md:text-8xl"
          text="Submit it. Scan it. Check it again tomorrow. Then decide."
        />
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
      <Section className="py-16 md:py-28">
        <p className="max-w-2xl text-lg leading-snug text-mute">
          If you think a decision on your clip is wrong, you can appeal from the submission page. To report abuse or
          botting, contact{' '}
          <a href="mailto:abuse@logoless.com" className="text-paper underline underline-offset-4">
            abuse@logoless.com
          </a>
          .
        </p>
      </Section>
      <CtaBand title="Clip with confidence" href="/" label="Browse campaigns" />
    </main>
  )
}
