import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/blocks'
import { FaqTabs } from '@/components/marketing/faq-tabs'
import { PageHero, Section } from '@/components/marketing/page-hero'

export const metadata: Metadata = { title: 'FAQ | logoless', description: 'Answers for brands and clippers.' }

export default function Page() {
  return (
    <main>
      <PageHero eyebrow="FAQ" title="Questions" lede="Quick answers for clippers and brands. Pick a side, or search for what you need." />
      <Section className="pt-0 md:pt-0">
        <FaqTabs />
      </Section>
      <CtaBand title="Still stuck?" href="/contact" label="Contact us" />
    </main>
  )
}
