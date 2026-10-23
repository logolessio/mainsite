import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { isBetaHost, joinBaseFor } from '@/lib/beta-host'
import { db } from '@/lib/db'
import { featureOn, requestHost } from '@/lib/features'
import { launchView } from '@/lib/launch'
import { allSettings } from '@/lib/settings'
import { getSession } from '@/lib/session'
import { emailProven, isVerified } from '@/lib/verification'
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'
import { PreLaunchOnboarding } from '@/components/prelaunch/onboarding'

export const metadata: Metadata = {
  title: 'Get started | logoless',
  description: 'Create your account, link your socials, set up your profile and get paid, all in one guided flow.',
}

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ role?: string; preview?: string; step?: string; ref?: string; google?: string }> }) {
  const { role, preview, step, ref, google } = await searchParams
  // beta.logoless.io/onboarding is the pre-launch sign-up: the one page open while the rest of the site is shut. Once the site opens it is the normal sign-up on logoless.io.
  const host = await requestHost()
  if (isBetaHost(host)) {
    const launch = launchView(await allSettings())
    if (!launch.closed) redirect(host.startsWith('beta.localhost') ? `http://${host.replace('beta.', '')}/onboarding` : 'https://logoless.io/onboarding')
    return <PreLaunchOnboarding end={launch.end} joinBase={joinBaseFor(host)} notice={google === 'taken' || google === 'owner' || google === 'used' ? google : null} />
  }
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
  // from the Get started button in Discord, by someone who has already been through the flow: straight to the Discord step
  if (ref === 'discord' && session?.user?.email && !dry) {
    const d = await db()
    const done = await d.prepare("SELECT 1 AS x FROM settings s JOIN users u ON s.key = 'onboarded:' || u.id WHERE u.email = ?1").bind(session.user.email.toLowerCase()).first()
    if (done) redirect('/onboarding/discord')
  }
  return (
    <Suspense>
      <OnboardingFlow preview={dry} initialStep={dry ? step : undefined} needsVerify={needsVerify} sessionUser={user} initialRole={role === 'brand' ? 'brand' : role === 'clipper' ? 'clipper' : undefined} checks={checks} looseHandles={looseHandles} />
    </Suspense>
  )
}
