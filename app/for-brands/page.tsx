import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/blocks'
import { Breadcrumbs, Related } from '@/components/marketing/breadcrumbs'
import { BrandCalculator } from '@/components/marketing/calculators'
import { Principles, Steps } from '@/components/marketing/layouts'
import { FeePromise } from '@/components/marketing/fee-promise'
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

      <FeePromise audience="brands" />
      <Steps
        title="How it works"
        steps={[
          { title: 'Write a brief', body: "Say what to clip, which platforms count and what's off limits. Set a rate per 1,000 views and a budget." },
          { title: 'We review it, you add funds', body: "We read your brief and get back to you. Add money to your balance once, and every campaign draws from it as clippers earn. If it covers the start, your campaign goes live as soon as it is approved." },
          { title: 'Clips come in', body: 'Clippers post. We check every clip and its views, and you only pay for what is verified.' },
        ]}
      />
      <BrandCalculator />
      <Principles
        title="Good to know"
        items={[
          { title: 'Your budget is the ceiling', body: `The budget you set is the most a campaign can pay clippers. Money leaves your balance only as clips earn it, and our ${SITE.platformFeePct}% fee is added on top and shown before you start.` },
          { title: 'Pause and move money any time', body: 'One balance means no pots to manage. Pause or start a campaign, change its budget, or move budget from one campaign to another in a click.' },
          { title: 'You can say no', body: "If a clip isn't right, turn it down from your dashboard before it is paid." },
          { title: 'Money stays yours', body: 'What you do not spend stays in your balance, and you can ask for it back.' },
        ]}
      />
      <CtaBand title="Launch your first campaign" href="/onboarding?role=brand" label="Launch a campaign" />
      <Related links={[{ href: '/pricing', label: 'Pricing' }, { href: '/faq', label: 'Questions' }, { href: '/case-studies', label: 'Case studies' }]} />
    </main>
  )
}
