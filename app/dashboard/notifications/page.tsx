import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { NotificationsPage } from '@/components/shell/notifications-page'
import { CenterInbox } from '@/components/shell/notify/center-inbox'
import { featureOn } from '@/lib/features'

export const metadata: Metadata = { title: 'Notifications | logoless', robots: { index: false } }

export default async function Page() {
  if (await featureOn('notification-center'))
    return (
      <>
        <PageHeader title="Notifications" />
        <CenterInbox />
      </>
    )
  return (
    <>
      <PageHeader title="Notifications" sub="Payments, submission decisions, new badges and campaign news, newest first." />
      <NotificationsPage />
    </>
  )
}
