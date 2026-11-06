import type { MetadataRoute } from 'next'
import { LEGAL } from '@/lib/legal'
import { SITE } from '@/lib/site'

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: SITE.url }, ...['about', 'help', 'contact', 'report', 'legal'].map((p) => ({ url: `${SITE.url}/${p}` })), ...LEGAL.map((d) => ({ url: `${SITE.url}/legal/${d.slug}` }))]
}
