import { liveCampaigns } from '@/lib/campaigns-db'
import { featureOn } from '@/lib/features'
import { SITE } from '@/lib/site'

/** The same live campaigns as JSON Feed, for anything that reads that instead. */
export async function GET() {
  if (!(await featureOn('campaign-feed'))) return new Response('Not found', { status: 404 })
  const list = (await liveCampaigns()).slice(0, 50)
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${SITE.name}: live campaigns`,
    home_page_url: SITE.url,
    feed_url: `${SITE.url}/feed.json`,
    items: list.map((c) => ({ id: c.id, url: `${SITE.url}/campaign/${c.id}`, title: `${c.title} by ${c.creator}`, summary: `$${c.ratePer1k.toFixed(2)} per 1,000 verified views. ${c.summary}`.slice(0, 400), image: c.cover.startsWith('http') ? c.cover : `${SITE.url}${c.cover}` })),
  }
  return new Response(JSON.stringify(feed), { headers: { 'content-type': 'application/feed+json; charset=utf-8', 'cache-control': 'public, max-age=300, s-maxage=300' } })
}
