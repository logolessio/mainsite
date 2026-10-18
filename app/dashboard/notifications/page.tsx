import type { Metadata } from 'next'
import { SectionTabs } from '@/components/app/section-tabs'
import { PageHeader } from '@/components/app/ui'
import { NotificationsPage } from '@/components/shell/notifications-page'

export const metadata: Metadata = { title: 'Notifications | logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <SectionTabs group="settings" />
      <PageHeader title="Notifications" sub="Payments, submission decisions, new badges and campaign news, newest first." />
      <NotificationsPage />
    </>
  )
}
