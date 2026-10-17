import type { Metadata } from 'next'
import { connection } from 'next/server'
import { LinksPage } from '@/components/links/links-page'
import { SITE } from '@/lib/site'
import { getLinks } from '@/lib/socials-db'

export const metadata: Metadata = {
  title: 'logoless | links',
  description: 'The logoless site, Discord server and every place we are.',
  alternates: { canonical: '/links' },
  openGraph: { title: 'logoless | links', description: 'The logoless site, Discord server and every place we are.', url: `${SITE.url}/links` },
}

/** logoless.io/links: the one address to put in a bio. What it lists is edited under Owner, Socials and links. */
export default async function Page() {
  await connection()
  const links = (await getLinks()).filter((l) => l.page)
  return <LinksPage links={links} tagline="Views have value." />
}
