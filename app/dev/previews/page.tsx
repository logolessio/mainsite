import type { Metadata } from 'next'
import Link from 'next/link'
import { PreviewActions } from '@/components/admin/preview-actions'
import { BadgeArt } from '@/components/badges/badge-art'
import { BADGES } from '@/lib/badges-defs'
import { Card, PageHeader } from '@/components/app/ui'
import { liveCampaigns } from '@/lib/campaigns-db'
import { pageDev } from '@/lib/user'
import { SectionTabs } from '@/components/app/section-tabs'

export const metadata: Metadata = { title: 'Previews | logoless', robots: { index: false } }

const btn = 'inline-flex h-10 items-center justify-center rounded-full border border-line-strong px-5 text-sm transition-colors hover:border-paper hover:bg-white/[0.06]'

function Row({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 py-5 first:pt-0 last:pb-0 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-mute">{body}</p>
      </div>
      <div className="flex flex-wrap gap-3">{children}</div>
    </div>
  )
}

/** Try the flows the way a visitor sees them. Everything here is a dry run: nothing is saved, sent or paid. */
export default async function Page() {
  await pageDev()
  const first = (await liveCampaigns())[0]
  return (
    <>
      <SectionTabs group="dev" />
      <PageHeader title="Previews" sub="Walk through what visitors see. Everything here is a dry run, so nothing is saved, sent or paid." />
      <div className="grid max-w-4xl gap-6">
        <Card title="Getting started">
          <div className="divide-y divide-line">
            <Row title="Onboarding from the start" body="The typed welcome, starting with the creator or brand question.">
              <Link href="/onboarding?preview=1" className={btn}>
                Open
              </Link>
            </Row>
            <Row title="Onboarding as a creator" body="Skips the first question. Includes the PayPal email step.">
              <Link href="/onboarding?preview=1&role=clipper" className={btn}>
                Open
              </Link>
            </Row>
            <Row title="Onboarding as a brand" body="Skips the first question. Asks for the brand name and website.">
              <Link href="/onboarding?preview=1&role=brand" className={btn}>
                Open
              </Link>
            </Row>
            <Row title="Picking a look" body="Jumps straight to the step where a ready-made picture and banner are chosen.">
              <Link href="/onboarding?preview=1&step=pictures" className={btn}>
                Open
              </Link>
            </Row>
            <Row title="Where do you post?" body="Jumps straight to the optional step for TikTok, YouTube and Instagram.">
              <Link href="/onboarding?preview=1&step=accounts" className={btn}>
                Open
              </Link>
            </Row>
          </div>
        </Card>

        <Card title="Submitting a clip">
          {first ? (
            <div className="divide-y divide-line">
              <Row title="Approved" body={`The whole flow on ${first.title}, ending in success.`}>
                <Link href={`/campaign/${first.id}?preview=approved`} className={btn}>
                  Open
                </Link>
              </Row>
              <Row title="Declined, then ask for a person" body="Shows the declined state and the request for human review.">
                <Link href={`/campaign/${first.id}?preview=declined`} className={btn}>
                  Open
                </Link>
              </Row>
              <Row title="Sent to a person" body="Shows the pending state and where to follow it.">
                <Link href={`/campaign/${first.id}?preview=review`} className={btn}>
                  Open
                </Link>
              </Row>
            </div>
          ) : (
            <p className="text-sm text-mute">There is no live campaign to try this on yet.</p>
          )}
        </Card>

        <Card title="Badges">
          <ul className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 md:grid-cols-6">
            {BADGES.map((b) => (
              <li key={b.id} className="flex flex-col items-center gap-2 text-center">
                <BadgeArt badge={b} size={72} />
                <span className="flex items-center gap-1.5">
                  <BadgeArt badge={b} size={20} />
                  <BadgeArt badge={b} size={20} locked />
                </span>
                <span className="text-[12px] leading-tight text-mute">{b.name}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Small pop-ups and pages">
          <div className="divide-y divide-line">
            <Row title="Notifications and calm mode" body="Fire them now to check how they look and where they land.">
              <PreviewActions />
            </Row>
            <Row title="Page not found" body="The page visitors see on a broken link.">
              <Link href="/this-page-does-not-exist" className={btn}>
                Open
              </Link>
            </Row>
          </div>
        </Card>
      </div>
    </>
  )
}
