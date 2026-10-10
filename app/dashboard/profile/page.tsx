import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { ProfileEditor } from '@/components/profile/profile-editor'

export const metadata: Metadata = { title: 'Profile — logoless', robots: { index: false } }

export default function Page() {
  return (
    <>
      <PageHeader title="Profile" sub="This is what people see at your logoless.io/@username page." />
      <ProfileEditor />
    </>
  )
}
