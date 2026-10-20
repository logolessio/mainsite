import type { Metadata } from 'next'
import { Suspense } from 'react'
import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { getSession } from '@/lib/session'
import { emailProven, isVerified } from '@/lib/verification'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'

export const metadata: Metadata = {
  title: 'Get started | logoless',
  description: 'Create your account, link your socials, set up your profile and get paid, all in one guided flow.',
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ role?: string; preview?: string; step?: string }> }) {
  const { role, preview, step } = await searchParams
  const session = await getSession()
  const user = session?.user ? { name: session.user.name ?? '', email: session.user.email ?? '' } : null
  // an admin's dry run: nothing is saved (see the Previews page in the admin area)
  const dry = preview === '1' && session?.user?.role === 'admin'
  const [checks, looseHandles] = await Promise.all([featureOn('onboarding-checks'), featureOn('username-punctuation')])
  // everyone proves their account with a code during onboarding. With `onboarding-checks` off, people who signed in with Discord
  // skip it (for now); with it on, only people who signed up with a password skip it, because they already proved the address then.
  let needsVerify = false
  if (session?.user?.email && !dry) {
    const d = await db()
    const email = session.user.email.toLowerCase()
    const u = await d.prepare('SELECT id FROM users WHERE email = ?1').bind(email).first<{ id: string }>()
    if (checks) {
      needsVerify = !(await emailProven(u?.id ?? null, email))
    } else {
      needsVerify = u ? !(await isVerified(u.id, session.user.email)).verified : true
      if (!u) {
        const hasDiscord = await d.prepare('SELECT 1 AS x FROM settings WHERE key = ?1').bind(`discord-email:${email}`).first()
        const hasPassword = await d.prepare('SELECT 1 AS x FROM credentials WHERE email = ?1').bind(email).first()
        needsVerify = !hasDiscord && !hasPassword
      }
    }
  }
  return (
    <Suspense>
      <OnboardingFlow preview={dry} initialStep={dry ? step : undefined} needsVerify={needsVerify} sessionUser={user} initialRole={role === 'brand' ? 'brand' : role === 'clipper' ? 'clipper' : undefined} checks={checks} looseHandles={looseHandles} />
    </Suspense>
  )
}
