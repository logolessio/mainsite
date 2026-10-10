import type { MetadataRoute } from 'next'
import { campaigns } from '@/lib/campaigns'
import { LEGAL } from '@/lib/legal'
import { SITE } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/', '/how-it-works', '/for-brands', '/for-clippers', '/pricing', '/payouts', '/trust', '/faq', '/about', '/contact', '/careers', '/legal', '/login', '/onboarding']
  return [
    ...pages.map((p) => ({ url: `${SITE.url}${p}` })),
    ...campaigns.map((c) => ({ url: `${SITE.url}/campaign/${c.id}` })),
    ...LEGAL.map((d) => ({ url: `${SITE.url}/legal/${d.slug}` })),
  ]
}
