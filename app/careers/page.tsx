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
      <PageHero eyebrow="Careers" title="Build with us" lede="We're a small team, and right now we're not hiring." />
      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <Reveal className="grid gap-8 border-t border-line pt-8 md:grid-cols-12 md:gap-10">
          <p className="font-display text-3xl tracking-[-0.03em] md:col-span-5 md:text-[2.6rem]"><T>No open roles right now</T></p>
          <div className="md:col-span-6 md:col-start-7">
            <p className="max-w-lg text-lg leading-relaxed text-paper/60">
              <T>If you think you\'d be great here anyway, send us an introduction and tell us what you\'d like to work on.</T>
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
        title="How we work"
        items={[
          { title: 'Real over loud', body: "We'd rather pay for fewer views that are real than more that aren't." },
          { title: 'Plain language', body: 'Briefs, rules and policies are written so anyone can follow them.' },
          { title: 'Fair by default', body: "Decisions come with reasons, and honest work isn't penalised." },
        ]}
      />
    </main>
  )
}
