import type { Metadata } from 'next'
import { Principles } from '@/components/marketing/layouts'
import { PageHero } from '@/components/marketing/page-hero'
import { PillLink } from '@/components/motion/cta'
import { Reveal } from '@/components/motion/reveal'
import { T } from '@/components/shell/copy-provider'
import { CONTAINER } from '@/lib/layout'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'Careers | logoless', description: 'Work at logoless.' }

export default function Page() {
  return (
    <main>
      <PageHero eyebrow="Careers" title="Build with us" lede="We are a small team building the fairest way to pay for views." />
      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <Reveal className="grid gap-8 border-t border-line pt-8 md:grid-cols-12 md:gap-10">
          <p className="font-display text-3xl tracking-[-0.03em] md:col-span-5 md:text-[2.6rem]"><T>No open roles right now</T></p>
          <div className="md:col-span-6 md:col-start-7">
            <p className="max-w-lg text-lg leading-relaxed text-paper/60">
              <T>We are always glad to hear from great people. Send an introduction and what you would like to work on.</T>
            </p>
            <div className="mt-8">
              <PillLink href={`mailto:${SITE.emails.support}`} variant="ghost">
                {SITE.emails.support}
              </PillLink>
            </div>
          </div>
        </Reveal>
      </section>
      <Principles
        title="What we care about"
        items={[
          { title: 'Real over loud', body: 'We would rather pay for fewer views that are real than more that are not.' },
          { title: 'Plain language', body: 'Briefs, rules and policies are written so that anyone can follow them.' },
          { title: 'Fair by default', body: 'Decisions come with reasons, and honest work is never penalised.' },
        ]}
      />
    </main>
  )
}
