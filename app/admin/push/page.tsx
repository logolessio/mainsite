import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { PushPanel } from '@/components/dev/push-panel'
import { AnnouncementEditor } from '@/components/dev/announcement-editor'
import { pageAdmin } from '@/lib/user'

export const metadata: Metadata = { title: 'Push features | logoless', robots: { index: false } }

export default async function Page() {
  await pageAdmin()
  return (
    <>
      <PageHeader title="Push features" sub="Everything on the dev site (dev.logoless.io) is switched on there so you can try it. Choose what goes to the live site, and undo it any time." />
      <div className="grid max-w-3xl gap-8">
        <PushPanel />
        <AnnouncementEditor />
      </div>
    </>
  )
}
