import type { Metadata } from 'next'
import { ContactForm } from '@/components/marketing/contact-form'
import { PageHero, Section } from '@/components/marketing/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'Contact — logoless', description: 'Get in touch with the logoless team.' }

export default function Page() {
  return (
    <main>
      <PageHero eyebrow="Contact" title="Say hello" />
      <Section className="mx-auto flex max-w-2xl flex-col items-center gap-20 pt-0">
        <Reveal>
          <dl className="space-y-10 text-sm">
            {[
              ['Support', SITE.emails.support],
              ['Legal', SITE.emails.legal],
              ['Privacy', SITE.emails.privacy],
              ['Copyright / abuse', SITE.emails.abuse],
              ['Press', SITE.emails.press],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono text-xs text-mute">{k}</dt>
                <dd className="mt-1 text-lg">
                  <a href={`mailto:${v}`} className="underline-offset-4 hover:underline">
                    {v}
                  </a>
                </dd>
              </div>
            ))}
            <div>
              <dt className="font-mono text-xs text-mute">Community</dt>
              <dd className="mt-1 text-lg">
                <a href={SITE.social.discord} className="underline-offset-4 hover:underline">
                  Join our Discord
                </a>
              </dd>
            </div>
          </dl>
        </Reveal>
        <Reveal delay={0.15}>
          <ContactForm />
        </Reveal>
      </Section>
    </main>
  )
}
