import type { Metadata } from 'next'
import { ReportForm } from '@/components/site/report'
import { PageHead, SiteFrame } from '@/components/site/site-frame'

export const metadata: Metadata = { title: 'Report a page | logoless', description: 'Tell us about a logoless page that breaks the rules.' }

export default function Page() {
  return (
    <SiteFrame>
      <PageHead
        kicker="report"
        title="report a page"
        lead={
          <>
            if a page breaks the <a href="/legal/community-guidelines" className="text-white underline underline-offset-4">community guidelines</a>, tell us which one and what&apos;s wrong. we look at every report, and we don&apos;t tell the page&apos;s owner who sent it.
          </>
        }
      />
      <ReportForm />
      <p className="mt-16 text-[0.8rem] leading-relaxed text-white/45">someone in danger right now? contact your local emergency services first.</p>
    </SiteFrame>
  )
}
