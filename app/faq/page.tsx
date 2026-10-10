import type { Metadata } from 'next'
import { FaqTabs } from '@/components/marketing/faq-tabs'
import { PageHero, Section } from '@/components/marketing/page-hero'
import { CtaBand } from '@/components/marketing/blocks'

export const metadata: Metadata = { title: 'FAQ — logoless', description: 'Answers for brands and clippers.' }

export default function Page() {
  return (
    <main>
      <PageHero align="center" eyebrow="FAQ" title="Questions" />
      <Section className="pt-0 md:pt-0">
        <FaqTabs />
      </Section>
      <CtaBand title="Still stuck?" href="/contact" label="Contact us" />
    </main>
  )
}
