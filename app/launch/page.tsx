import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { LaunchHome } from '@/components/launch/home/launch-home'
import { featureOn } from '@/lib/features'
import { launchHomeData } from '@/lib/launch-home'
import { SITE } from '@/lib/site'

export const metadata: Metadata = {
  title: 'logoless | coming soon',
  description: 'logoless opens soon. Join the waitlist and reserve your username.',
  alternates: { canonical: '/launch' },
  openGraph: { title: 'logoless | coming soon', description: 'Join the waitlist and reserve your username.', url: `${SITE.url}/launch` },
}

/** The coming-soon page on its own address, in whatever state the site is in (or ?view=soon / ?view=live). The same page stands in front of the whole site while it is closed. */
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  await connection()
  if (!(await featureOn('launch-links'))) notFound()
  const data = await launchHomeData((await searchParams).view)
  return <LaunchHome {...data} />
}
