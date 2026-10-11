import type { Metadata } from 'next'
import { PageHero, Section } from '@/components/marketing/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { TransitionLink } from '@/components/shell/transition-link'
import { LEGAL } from '@/lib/legal'
import { readMinutes } from '@/lib/legal-read'

export const metadata: Metadata = { title: 'Legal — logoless', description: 'Terms, privacy and policies.' }

export default function Page() {
  return (
    <main>
      <PageHero eyebrow="Legal" title="The fine print" lede="Everything that governs how logoless works, in plain sections." />
      <Section className="pt-0 md:pt-0">
        <ul className="mx-auto max-w-3xl border-t border-line">
          {LEGAL.map((d, i) => (
            <Reveal key={d.slug} y={14} delay={i * 0.03}>
              <li className="border-b border-line">
                <TransitionLink href={`/legal/${d.slug}`} className="group flex flex-col items-center gap-2 py-10 text-center">
                  <span>
                    <span className="block font-display text-3xl transition-transform duration-300 group-hover:scale-[1.03] md:text-5xl">{d.title}</span>
                    <span className="mt-1 block text-sm text-mute">{d.summary}</span>
                  </span>
                  <span className="font-mono text-xs text-mute">
                    {String(i + 1).padStart(2, '0')} · {readMinutes(d)} min read · {d.sections.length} sections
                  </span>
                </TransitionLink>
              </li>
            </Reveal>
          ))}
        </ul>
      </Section>
    </main>
  )
}
