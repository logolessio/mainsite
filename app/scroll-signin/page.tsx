import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ScrollSignIn } from '@/components/trailers/handoff'

export const metadata: Metadata = { title: 'Signing in | scroll', robots: { index: false } }

/**
 * scroll.logoless.io signs people in with Google and Discord here, on logoless.io, because that is the address those two have been set up
 * for. The sign-in cookie belongs to the whole logoless.io domain, so when they come back to scroll they are already signed in.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const { p } = await searchParams
  if (p !== 'google' && p !== 'discord') redirect('https://scroll.logoless.io/')
  return <ScrollSignIn provider={p} />
}
