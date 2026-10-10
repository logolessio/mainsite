import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { SettingsPanel } from '@/components/app/settings-panel'

export const metadata: Metadata = { title: 'Settings — logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsPanel role="clipper" />
    </>
  )
}
