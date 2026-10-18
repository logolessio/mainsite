import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/blocks'
import { Breadcrumbs, Related } from '@/components/marketing/breadcrumbs'
import { Principles } from '@/components/marketing/layouts'
import { PageHero } from '@/components/marketing/page-hero'
import { PillLink } from '@/components/motion/cta'

export const metadata: Metadata = {
  title: 'Case studies | logoless',
  description: 'Real campaigns, real numbers. The first case studies are published as soon as our first campaigns finish.',
  alternates: { canonical: '/case-studies' },
}

export default function Page() {
  return (
    <main>
      <Breadcrumbs trail={[{ name: 'Case studies' }]} />
      <PageHero eyebrow="Case studies" title="Real campaigns, real numbers" lede="We only publish results from campaigns that have finished and been paid. The first ones will appear here as soon as they do.">
        <PillLink href="/onboarding?role=brand">Run one of the first</PillLink>
      </PageHero>
      <Principles
        title="What every case study shows"
        items={[
          { title: 'The brief', body: 'What the artist or brand asked for, and the rate they set.' },
          { title: 'The results', body: 'Submissions made, verified views and what the campaign cost.' },
          { title: 'The submissions', body: 'The best submissions, with permission from the people who made them.' },
        ]}
      />
      <CtaBand title="Want to be in the first one?" href="/contact" label="Talk to us" />
      <Related links={[{ href: '/for-brands', label: 'For brands' }, { href: '/pricing', label: 'Pricing' }, { href: '/faq', label: "That's why its called a Q&A :)" }]} />
    </main>
  )
}
