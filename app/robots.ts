import type { MetadataRoute } from 'next'
import { setting } from '@/lib/db'
import { SITE } from '@/lib/site'

export default async function robots(): Promise<MetadataRoute.Robots> {
  // The test copy at dev.logoless.io must never show up in search results.
  if ((await setting('SITE_ENV')) === 'dev') return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/brand', '/admin', '/api'] },
    sitemap: `${SITE.url}/sitemap.xml`,
  }
}
