import type { Metadata } from 'next'
import { PageHeader } from '@/components/app/ui'
import { ProfileEditor } from '@/components/profile/profile-editor'
import { ProfileStudio } from '@/components/profile/profile-studio'
import { featureOn } from '@/lib/features'

export const metadata: Metadata = { title: 'Profile | logoless', robots: { index: false } }

export default async function Page() {
  const studio = await featureOn('profile-studio')
  return (
    <>
      <PageHeader title="Profile" sub={studio ? 'This is your logoless.io/@username page. Click anything on it to change it.' : 'This is what people see at your logoless.io/@username page.'} />
      {studio ? <ProfileStudio /> : <ProfileEditor />}
    </>
  )
}
