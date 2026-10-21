import type { Metadata } from 'next'
import { connection } from 'next/server'
import { LaunchHome } from '@/components/launch/home/launch-home'
import { LinksPage } from '@/components/links/links-page'
import { featureOn } from '@/lib/features'
import { launchHomeData } from '@/lib/launch-home'
import { SITE } from '@/lib/site'
import { getLinks } from '@/lib/socials-db'

export const metadata: Metadata = {
  title: 'logoless | links',
  description: 'The logoless site, Discord server and every place we are.',
  alternates: { canonical: '/links' },
  openGraph: { title: 'logoless | links', description: 'The logoless site, Discord server and every place we are.', url: `${SITE.url}/links` },
}

/**
 * logoless.io/links: the one address to put in a bio. What it lists is edited under Owner, Socials and links.
 * With the launch-links feature it is the coming-soon page with a big waitlist button and the link buttons, and it stays open while the site is closed.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  await connection()
  if (await featureOn('launch-links')) return <LaunchHome {...await launchHomeData((await searchParams).view)} links />
  const links = (await getLinks()).filter((l) => l.page)
  return <LinksPage links={links} tagline="Views have value." />
}
