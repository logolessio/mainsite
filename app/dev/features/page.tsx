import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { AnnouncementEditor } from '@/components/dev/announcement-editor'
import { PushPanel } from '@/components/dev/push-panel'
import { pageDev } from '@/lib/user'

export const metadata: Metadata = { title: 'Features | logoless', robots: { index: false } }

export default async function Page() {
  await pageDev()
  return (
    <>
      <PageHeader title="Features" sub="Everything on the dev site is switched on there so you can try it. Choose what goes to logoless.io, and undo it any time." />
      <div className="grid max-w-3xl gap-8">
        <PushPanel />
        <AnnouncementEditor />
      </div>
    </>
  )
}
