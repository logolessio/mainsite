import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/app/ui'
import { PrivacySettings } from '@/components/profile/privacy-settings'
import { featureOn } from '@/lib/features'

export const metadata: Metadata = { title: 'Privacy | logoless', robots: { index: false } }

export default async function Page() {
  // until the page is pushed, privacy stays on the Privacy tab of the profile editor
  if (!(await featureOn('profile-privacy'))) redirect('/dashboard/profile')
  return (
    <>
      <PageHeader title="Privacy" sub="Choose who can see your profile page and what is on it." />
      <PrivacySettings />
    </>
  )
}
