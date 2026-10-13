import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getSession } from '@/lib/session'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'

export const metadata: Metadata = {
  title: 'Get started | logoless',
  description: 'Create your account, link your socials, set up your profile and get paid, all in one guided flow.',
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ role?: string; preview?: string }> }) {
  const { role, preview } = await searchParams
  const session = await getSession()
  const user = session?.user ? { name: session.user.name ?? '', email: session.user.email ?? '' } : null
  // an admin's dry run: nothing is saved (see the Previews page in the admin area)
  const dry = preview === '1' && session?.user?.role === 'admin'
  return (
    <Suspense>
      <OnboardingFlow preview={dry} sessionUser={user} initialRole={role === 'brand' ? 'brand' : role === 'clipper' ? 'clipper' : undefined} />
    </Suspense>
  )
}
