import type { Metadata } from 'next'
import { PageHero, Section } from '@/components/marketing/page-hero'
import { PillLink } from '@/components/motion/cta'
import { SITE } from '@/lib/site'
import { T } from '@/components/shell/copy-provider'

export const metadata: Metadata = { title: 'Careers — logoless', description: 'Work at logoless.' }

export default function Page() {
  return (
    <main>
      <PageHero eyebrow="Careers" title="Build with us" lede="We are a small team building the fairest way to pay for views." />
      <Section className="pt-0 md:pt-0">
        <div className="border border-dashed border-line-strong px-6 py-20 text-center rounded-2xl">
          <p className="font-display text-4xl"><T>No open roles right now</T></p>
          <p className="mx-auto mt-3 max-w-md text-mute"><T>
            We are always glad to hear from great people. Send an introduction and what you would like to work on.
          </T></p>
          <div className="mt-8 flex justify-center">
            <PillLink href={`mailto:${SITE.emails.support}`} variant="ghost">
              {SITE.emails.support}
            </PillLink>
          </div>
        </div>
      </Section>
    </main>
  )
}
