import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/blocks'
import { Breadcrumbs, Related } from '@/components/marketing/breadcrumbs'
import { BrandCalculator } from '@/components/marketing/calculators'
import { Principles, Steps } from '@/components/marketing/layouts'
import { PageHero } from '@/components/marketing/page-hero'
import { PillLink } from '@/components/motion/cta'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Launch a clipping campaign | logoless',
  description: 'Turn one song, stream or launch into hundreds of clips. You set the budget and the rate, and pay only for views we verify.',
  alternates: { canonical: '/for-brands' },
}

export default function Page() {
  return (
    <main>
      <Breadcrumbs trail={[{ name: 'For brands' }]} />
      <PageHero eyebrow="For brands and artists" title="Pay for the views you actually get" lede="Turn one song, stream or launch into hundreds of clips on TikTok, YouTube and Instagram. You set the budget and the rate, and we only pay clippers for views we have verified.">
        <PillLink href="/onboarding?role=brand">Launch a campaign</PillLink>
      </PageHero>

      <Steps
        title="How it works"
        steps={[
          { title: 'Write a brief', body: "Say what to clip, which platforms count and what's off limits. Set a rate per 1,000 views and a budget." },
          { title: 'We review it, you pay', body: "We read your brief and get back to you. Once we've said yes, you fund it and we launch it." },
          { title: 'Clips come in', body: 'Clippers post. We check every clip and its views, and you only pay for what is verified.' },
        ]}
      />
      <BrandCalculator />
      <Principles
        title="Good to know"
        items={[
          { title: 'Your budget is the ceiling', body: `You will never spend more than you fund. We keep ${SITE.platformFeePct}% of what is paid out to clippers, never on top.` },
          { title: 'You can say no', body: "If a clip isn't right, turn it down from your dashboard before it is paid." },
          { title: 'Money back', body: 'If a campaign ends with budget left over, you can ask for it back.' },
        ]}
      />
      <CtaBand title="Launch your first campaign" href="/onboarding?role=brand" label="Launch a campaign" />
      <Related links={[{ href: '/pricing', label: 'Pricing' }, { href: '/faq', label: 'Questions' }, { href: '/case-studies', label: 'Case studies' }]} />
    </main>
  )
}
