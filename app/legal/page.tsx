import type { Metadata } from 'next'
import { PageHero } from '@/components/marketing/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { TransitionLink } from '@/components/shell/transition-link'
import { CONTAINER } from '@/lib/layout'
import { LEGAL } from '@/lib/legal'
import { readMinutes } from '@/lib/legal-read'

export const metadata: Metadata = { title: 'Legal | logoless', description: 'Terms, privacy and policies.' }

export default function Page() {
  return (
    <main>
      <PageHero eyebrow="Legal" title="The fine print" lede="Everything that governs how logoless works, in plain sections." />
      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <ul className="border-b border-line">
          {LEGAL.map((d, i) => (
            <Reveal key={d.slug} delay={Math.min(i, 5) * 0.03}>
              <li className="border-t border-line">
                <TransitionLink href={`/legal/${d.slug}`} className="group grid gap-2 py-8 md:grid-cols-12 md:items-baseline md:gap-10 md:py-10">
                  <span className="font-display text-3xl tracking-[-0.03em] transition-transform duration-500 group-hover:translate-x-1.5 md:col-span-5 md:text-[2.6rem]">{d.title}</span>
                  <span className="text-lg text-paper/50 md:col-span-5 md:col-start-7">{d.summary}</span>
                  <span className="text-[15px] text-paper/40 md:col-span-1 md:text-right">{readMinutes(d)} min</span>
                </TransitionLink>
              </li>
            </Reveal>
          ))}
        </ul>
      </section>
    </main>
  )
}
