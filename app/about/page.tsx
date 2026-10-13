import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/blocks'
import { Breadcrumbs, Related } from '@/components/marketing/breadcrumbs'
import { Principles } from '@/components/marketing/layouts'
import { PageHero } from '@/components/marketing/page-hero'
import { PillLink } from '@/components/motion/cta'

export const metadata: Metadata = {
  title: 'About logoless',
  description: 'logoless is a marketplace where the people who cut clips get paid for the views those clips earn.',
  alternates: { canonical: '/about' },
}

export default function Page() {
  return (
    <main>
      <Breadcrumbs trail={[{ name: 'About' }]} />
      <PageHero eyebrow="Who we are" title="Clips should pay" lede="logoless is a marketplace where the people who cut clips get paid for the views those clips earn. Brands set the budget. Clippers do the work. Real views get paid.">
        <PillLink href="/onboarding">Get started</PillLink>
      </PageHero>
      <Principles
        title="What we believe"
        items={[
          { title: 'Credit goes to the work', body: 'A good clip can be reshared a thousand times while the person who made it sees nothing. We think they should be paid.' },
          { title: 'Only real views count', body: 'We check every clip and its views before anything is paid, so brands pay for what they get.' },
          { title: 'Keep it plain', body: 'Briefs, rules and fees are written in plain language. If something is unclear, tell us and we will fix it.' },
        ]}
      />
      <CtaBand title="Come and join us" href="/onboarding" label="Get started" />
      <Related links={[{ href: '/for-clippers', label: 'For creators' }, { href: '/for-brands', label: 'For brands' }, { href: '/contact', label: 'Contact' }]} />
    </main>
  )
}
