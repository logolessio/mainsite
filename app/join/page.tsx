import type { Metadata } from 'next'
import { Suspense } from 'react'
import { JoinHop } from '@/components/prelaunch/join'

export const metadata: Metadata = {
  title: 'Join | logoless',
  robots: { index: false, follow: false },
}

/** Where beta.logoless.io sends people to sign in. Google and Discord only send people back to logoless.io, so the sign-in starts here and ends back on the sign-up page. */
const THEN = /^(https:\/\/beta\.logoless\.io|http:\/\/beta\.localhost:\d{2,5})\/onboarding(\?[^#\s]{0,200})?$/

export default async function Page({ searchParams }: { searchParams: Promise<{ then?: string; with?: string }> }) {
  const q = await searchParams
  const then = q.then && THEN.test(q.then) ? q.then : 'https://beta.logoless.io/onboarding'
  return (
    <Suspense>
      <JoinHop then={then} provider={q.with === 'google' ? 'google' : 'discord'} />
    </Suspense>
  )
}
