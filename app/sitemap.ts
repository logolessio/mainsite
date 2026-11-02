import type { MetadataRoute } from 'next'
import { LEGAL } from '@/lib/legal'
import { SITE } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE.url }, { url: `${SITE.url}/legal` }, ...LEGAL.map((d) => ({ url: `${SITE.url}/legal/${d.slug}` }))]
}
