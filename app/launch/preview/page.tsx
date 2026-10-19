import type { Metadata } from 'next'
import { LaunchPage } from '@/components/launch/launch-page'
import { allSettings } from '@/lib/settings'
import { launchView } from '@/lib/launch'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Launch page preview | logoless', robots: { index: false } }

/** What visitors see while the launch page is on, shown to an owner without switching anything on. */
export default async function Page() {
  await pageAdmin()
  const v = launchView(await allSettings())
  return (
    <div className="fixed inset-0 z-[300] overflow-y-auto bg-ink">
      <LaunchPage end={v.end} headline={v.headline} text={v.text} signedInAs={null} />
    </div>
  )
}
