import type { MetadataRoute } from 'next'
import { liveCampaigns } from '@/lib/campaigns-db'
import { LEGAL } from '@/lib/legal'
import { SITE } from '@/lib/site'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const campaigns = await liveCampaigns()
  const pages = ['', '/', '/how-it-works', '/for-brands', '/for-clippers', '/pricing', '/payouts', '/trust', '/faq', '/about', '/contact', '/careers', '/legal', '/login', '/onboarding']
  return [
    ...pages.map((p) => ({ url: `${SITE.url}${p}` })),
    ...campaigns.map((c) => ({ url: `${SITE.url}/campaign/${c.id}` })),
    ...LEGAL.map((d) => ({ url: `${SITE.url}/legal/${d.slug}` })),
  ]
}
