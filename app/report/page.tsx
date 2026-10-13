import type { Metadata } from 'next'
import { InquiryForm } from '@/components/marketing/inquiry-form'
import { Breadcrumbs } from '@/components/marketing/breadcrumbs'
import { PageHero } from '@/components/marketing/page-hero'
import { Reveal } from '@/components/motion/reveal'
import { CONTAINER } from '@/lib/layout'
import { REPORT_TOPICS } from '@/lib/inquiry-topics'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'Report something | logoless', description: 'Tell the logoless team about fake views, stolen content, scams or anything else, straight from the site.', alternates: { canonical: '/report' } }

/** Reports can arrive pre-filled from a profile or a campaign: /report?about=profile&ref=@handle */
export default async function Page({ searchParams }: { searchParams: Promise<{ about?: string; ref?: string; topic?: string }> }) {
  const q = await searchParams
  const ref = (q.ref ?? '').slice(0, 300)
  const topic = REPORT_TOPICS.some((t) => t.id === q.topic) ? q.topic : undefined
  return (
    <main>
      <Breadcrumbs trail={[{ name: 'Report' }]} />
      <PageHero eyebrow="Report" title="Report something" lede="Pick what is wrong, or write your own. It goes straight to the team, inside the site." />
      <section className={`${CONTAINER} pb-24 md:pb-40`}>
        <div className="grid gap-12 md:grid-cols-12 md:gap-10">
          <div className="max-w-sm md:col-span-4">
            <Reveal className="text-lg leading-relaxed text-paper/60">
              <p>Reports are read by a person. We look at it, act where we need to, and answer on your conversation page.</p>
              <p className="mt-5 text-[15px] text-paper/45">
                Prefer email? Write to{' '}
                <a className="text-paper underline underline-offset-4" href={`mailto:${SITE.emails.abuse}`}>
                  {SITE.emails.abuse}
                </a>
                .
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="md:col-span-7 md:col-start-6">
            <InquiryForm kind="report" target={ref} topic={topic} />
          </Reveal>
        </div>
      </section>
    </main>
  )
}
