import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/blocks'
import { Breadcrumbs, Related } from '@/components/marketing/breadcrumbs'
import { Principles } from '@/components/marketing/layouts'
import { PageHero } from '@/components/marketing/page-hero'
import { PillLink } from '@/components/motion/cta'

export const metadata: Metadata = {
  title: 'About logoless',
  description: 'logoless is a marketplace where the people who cut content get paid for the views those submissions earn.',
  alternates: { canonical: '/about' },
}

export default function Page() {
  return (
    <main>
      <Breadcrumbs trail={[{ name: 'About' }]} />
      <PageHero eyebrow="Who we are" title="Submissions should pay" lede="Logoless is a platform developed by creators for creators. We help brands and artists get the attention and traction they deserve through streamlined campaigns that make earning from your content sooooo much easier.">
        <PillLink href="/onboarding">Get started</PillLink>
      </PageHero>
      <Principles
        title="What we believe"
        items={[
          { title: 'Credit goes to the creator', body: 'A good post can be re-shared a thousand times while the person who made it gets nothing. We want to change that.' },
          { title: 'Only real views count', body: 'We check every submission and its views before anything is paid, so brands pay for what they get.' },
          { title: 'Keep it simple', body: 'Briefs, rules and fees are written in plain language. If something is unclear, tell us and we will fix it.' },
        ]}
      />
      <CtaBand title="Come and join us" href="/onboarding" label="Get started" />
      <Related links={[{ href: '/for-creators', label: 'For creators' }, { href: '/for-brands', label: 'For brands' }, { href: '/contact', label: 'Contact' }]} />
    </main>
  )
}
