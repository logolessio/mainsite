import type { MetadataRoute } from 'next'
import { connection } from 'next/server'
import { isDevHostName, requestHost } from '@/lib/features'
import { SITE } from '@/lib/site'

export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection()
  // The dev site is for the team only: keep it out of search results entirely.
  if (isDevHostName(await requestHost())) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/brand', '/admin', '/api'] },
    sitemap: `${SITE.url}/sitemap.xml`,
  }
}
