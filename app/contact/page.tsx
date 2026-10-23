import type { Metadata } from 'next'
import { ArrowUpRight } from 'lucide-react'
import { InquiryForm } from '@/components/marketing/inquiry-form'
import { Breadcrumbs } from '@/components/marketing/breadcrumbs'
import { PageHero } from '@/components/marketing/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { Words } from '@/components/motion/words'
import { T } from '@/components/shell/copy-provider'
import { CONTAINER } from '@/lib/layout'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'Contact | logoless', description: 'Send us a message here on the site, or email the right inbox. A real person reads everything.', alternates: { canonical: '/contact' } }

const WAYS: [string, string, string][] = [
  ['Support', 'Accounts, campaigns and payouts', SITE.emails.support],
  ['Legal and privacy', 'Terms, your data and copyright', SITE.emails.legal],
  ['Report abuse', 'Botting, fraud or a problem. Or use the report page', SITE.emails.abuse],
]

export default function Page() {
  return (
    <main>
      <Breadcrumbs trail={[{ name: 'Contact' }]} />
      <PageHero eyebrow="Contact" badges={{ solid: { href: '/faq', top: 'Read the', bottom: 'FAQ' }, outline: { href: '/report', label: 'Report' } }} title="Say hello" lede="Send us a message right here on the site, or email the right inbox. A real person reads everything." />
      <section className={`${CONTAINER} pb-24 md:pb-32`}>
        <div className="grid gap-12 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5">
            <Words as="h2" align="left" text="Send it here" className="max-w-[10ch] font-display text-5xl leading-[0.95] tracking-[-0.04em] md:text-[5rem]" />
            <Reveal delay={0.2} className="mt-8 max-w-sm text-lg leading-relaxed text-paper/60">
              <p><T>Pick a topic or write your own. It goes to the team inside the site, and our reply shows up on your conversation page. We usually answer within two business days.</T></p>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="md:col-span-6 md:col-start-7">
            <InquiryForm kind="contact" />
          </Reveal>
        </div>
      </section>
      <section className={`${CONTAINER} border-t border-line py-20 md:py-28`}>
        <p className="mb-8 font-display text-3xl tracking-[-0.03em] md:text-5xl"><T>Or email us</T></p>
        <ul className="border-b border-line">
          {WAYS.map(([k, hint, mail], i) => (
            <Reveal as="li" key={k} delay={Math.min(i, 4) * 0.05} className="border-t border-line">
                <a href={`mailto:${mail}`} className="group grid items-baseline gap-2 py-7 md:grid-cols-12 md:gap-10 md:py-9">
                  <span className="font-display text-3xl tracking-[-0.03em] md:col-span-5 md:text-[2.6rem]"><T>{k}</T></span>
                  <span className="text-lg text-paper/50 md:col-span-3 md:col-start-7"><T>{hint}</T></span>
                  <span className="flex items-center gap-2 text-lg md:col-span-3 md:justify-end">
                    {mail}
                    <ArrowUpRight aria-hidden="true" className="size-4 text-paper/50 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-paper" />
                  </span>
                </a>
              </Reveal>
          ))}
        </ul>
      </section>
    </main>
  )
}
