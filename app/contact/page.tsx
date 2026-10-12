import type { Metadata } from 'next'
import { ArrowUpRight } from 'lucide-react'
import { ContactForm } from '@/components/marketing/contact-form'
import { PageHero } from '@/components/marketing/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { Words } from '@/components/motion/words'
import { T } from '@/components/shell/copy-provider'
import { CONTAINER } from '@/lib/layout'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'Contact | logoless', description: 'Get in touch with the logoless team.' }

const WAYS: [string, string, string][] = [
  ['Support', 'Accounts, campaigns and payouts', SITE.emails.support],
  ['Legal', 'Terms and agreements', SITE.emails.legal],
  ['Privacy', 'Your data and your rights', SITE.emails.privacy],
  ['Copyright and abuse', 'Report a problem', SITE.emails.abuse],
  ['Press', 'Interviews and assets', SITE.emails.press],
]

export default function Page() {
  return (
    <main>
      <PageHero eyebrow="Contact" title="Say hello" lede="Write to the right inbox, or send us a message below. A person reads everything." />
      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <ul className="border-b border-line">
          {WAYS.map(([k, hint, mail], i) => (
            <Reveal key={k} delay={Math.min(i, 4) * 0.05}>
              <li className="border-t border-line">
                <a href={`mailto:${mail}`} className="group grid items-baseline gap-2 py-7 md:grid-cols-12 md:gap-10 md:py-9">
                  <span className="font-display text-3xl tracking-[-0.03em] md:col-span-5 md:text-[2.6rem]"><T>{k}</T></span>
                  <span className="text-lg text-paper/50 md:col-span-3 md:col-start-7"><T>{hint}</T></span>
                  <span className="flex items-center gap-2 text-lg md:col-span-3 md:justify-end">
                    {mail}
                    <ArrowUpRight aria-hidden="true" className="size-4 text-paper/50 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-paper" />
                  </span>
                </a>
              </li>
            </Reveal>
          ))}
        </ul>
      </section>
      <section className={`${CONTAINER} border-t border-line py-24 md:py-40`}>
        <div className="grid gap-12 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5">
            <Words as="h2" align="left" text="Or send a message" className="max-w-[10ch] font-display text-5xl leading-[0.95] tracking-[-0.04em] md:text-[5rem]" />
            <Reveal delay={0.2} className="mt-8 max-w-sm text-lg leading-relaxed text-paper/60">
              <p><T>We usually reply within two business days.</T></p>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="md:col-span-6 md:col-start-7">
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </main>
  )
}
