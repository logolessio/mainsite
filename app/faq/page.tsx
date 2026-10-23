import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/blocks'
import { Breadcrumbs } from '@/components/marketing/breadcrumbs'
import { FaqTabs } from '@/components/marketing/faq-tabs'
import { PageHero, Section } from '@/components/marketing/page-hero'
import { FAQ } from '@/lib/faq'

export const metadata: Metadata = {
  title: 'Questions | logoless',
  description: 'Short answers for creators and brands: how you get paid, what it costs and how submissions are checked.',
  alternates: { canonical: '/faq' },
}

const LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: Object.values(FAQ)
    .flat()
    .map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}

export default function Page() {
  return (
    <main>
      <Breadcrumbs trail={[{ name: "Q&A" }]} />
      <PageHero eyebrow="Q&A" badges={{ solid: { href: '/contact', top: 'Still stuck?', bottom: 'Say hello' }, outline: { href: '/pricing', label: 'Pricing' } }} title="Questions, answered" lede="If the answers your looking for aren't here, feel free to contact us." />
      <Section className="pt-0 md:pt-0">
        <FaqTabs />
      </Section>
      <CtaBand title="Still stuck?" href="/contact" label="Contact us" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LD) }} />
    </main>
  )
}
