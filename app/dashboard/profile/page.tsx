import type { Metadata } from 'next'
import { SectionTabs } from '@/components/app/section-tabs'
import { PageHeader } from '@/components/app/ui'
import { ProfileEditor } from '@/components/profile/profile-editor'

export const metadata: Metadata = { title: 'Profile | logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <SectionTabs group="profile" />
      <PageHeader title="Profile" sub="This is what people see at your logoless.io/@username page." />
      <ProfileEditor />
    </>
  )
}
