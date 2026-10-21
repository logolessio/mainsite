import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { SettingsPanel } from '@/components/app/settings-panel'
import { ClientTour } from '@/components/brand/client-tour'

export const metadata: Metadata = { title: 'Settings | logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <PageHeader title="Settings" />
      <ClientTour />
      <SettingsPanel role="brand" />
    </>
  )
}
