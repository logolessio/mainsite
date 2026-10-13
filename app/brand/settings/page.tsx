import type { Metadata } from 'next'
import { SectionTabs } from '@/components/app/section-tabs'
import { PageHeader } from '@/components/app/ui'
import { SettingsPanel } from '@/components/app/settings-panel'

export const metadata: Metadata = { title: 'Settings | logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <SectionTabs group="account" />
      <PageHeader title="Settings" />
      <SettingsPanel role="brand" />
    </>
  )
}
