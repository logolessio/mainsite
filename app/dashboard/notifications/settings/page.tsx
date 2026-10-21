import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/app/ui'
import { NotifySettings } from '@/components/shell/notify/notify-settings'
import { featureOn } from '@/lib/features'

export const metadata: Metadata = { title: 'Notification settings | logoless', robots: { index: false } }

export default async function Page() {
  if (!(await featureOn('notification-center'))) notFound()
  return (
    <>
      <PageHeader title="Notification settings" sub="What you hear about, where, and when. Changes save as you go." />
      <NotifySettings />
    </>
  )
}
