import type { Metadata } from 'next'
import { ArrowUpRight } from 'lucide-react'
import { ContactForm } from '@/components/marketing/contact-form'
import { Ticker } from '@/components/marketing/layouts'
import { PageHero } from '@/components/marketing/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { Tilt3D } from '@/components/motion/tilt'
import { Words } from '@/components/motion/words'
import { T } from '@/components/shell/copy-provider'
import { CONTAINER } from '@/lib/layout'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'Contact — logoless', description: 'Get in touch with the logoless team.' }

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
      <section className={`${CONTAINER} pb-20 md:pb-32`}>
        <ul className="grid gap-px overflow-hidden rounded-3xl bg-line md:grid-cols-3">
          {WAYS.map(([k, hint, mail], i) => (
            <Reveal key={k} delay={i * 0.06} y={20} blur={false} className="bg-ink">
              <Tilt3D max={5} className="h-full">
                <a href={`mailto:${mail}`} className="group flex h-full flex-col items-center px-6 py-12 text-center transition-colors hover:bg-surface md:py-16">
                  <p className="font-mono text-xs tracking-widest text-mute uppercase"><T>{k}</T></p>
                  <p className="mt-6 font-display text-3xl leading-tight break-all md:text-4xl">{mail.split('@')[0]}</p>
                  <p className="font-display text-xl text-mute">@{mail.split('@')[1]}</p>
                  <p className="mt-5 text-sm text-mute"><T>{hint}</T></p>
                  <ArrowUpRight aria-hidden="true" className="mt-6 size-5 text-mute transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-paper" />
                </a>
              </Tilt3D>
            </Reveal>
          ))}
          <Reveal delay={0.3} y={20} blur={false} className="bg-ink">
            <Tilt3D max={5} className="h-full">
              <a href={SITE.social.discord} className="group flex h-full flex-col items-center px-6 py-12 text-center transition-colors hover:bg-surface md:py-16">
                <p className="font-mono text-xs tracking-widest text-mute uppercase"><T>Community</T></p>
                <p className="mt-6 font-display text-3xl leading-tight md:text-4xl">Join our Discord</p>
                <p className="mt-5 text-sm text-mute">Ask questions, share clips, meet other clippers</p>
                <ArrowUpRight aria-hidden="true" className="mt-6 size-5 text-mute transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-paper" />
              </a>
            </Tilt3D>
          </Reveal>
        </ul>
      </section>
      <Ticker words={['Say hello', 'Ask us anything', 'We read everything']} />
      <section className={`${CONTAINER} py-20 md:py-32`}>
        <div className="mx-auto grid max-w-5xl gap-12 md:grid-cols-[1fr_1.3fr] md:gap-20">
          <div>
            <Words as="h2" text="Or send a message" className="justify-start text-left font-display text-5xl leading-[0.98] md:text-7xl" />
            <Reveal delay={0.2} className="mt-8 max-w-sm text-lg leading-snug text-mute">
              <p><T>We usually reply within two business days.</T></p>
            </Reveal>
          </div>
          <Reveal delay={0.1}>
            <ContactForm />
          </Reveal>
        </div>
      </section>
    </main>
  )
}
