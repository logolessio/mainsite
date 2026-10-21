import { liveCampaigns } from '@/lib/campaigns-db'
import { featureOn } from '@/lib/features'
import { SITE } from '@/lib/site'

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] as string)

/** An Atom feed of the live campaigns, newest first, for anyone who wants new ones in a reader. */
export async function GET() {
  if (!(await featureOn('campaign-feed'))) return new Response('Not found', { status: 404 })
  const list = (await liveCampaigns()).slice(0, 50)
  const now = new Date().toISOString()
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(SITE.name)}: live campaigns</title>
  <link href="${SITE.url}/feed.xml" rel="self"/>
  <link href="${SITE.url}"/>
  <id>${SITE.url}/</id>
  <updated>${now}</updated>
${list
  .map(
    (c) => `  <entry>
    <title>${esc(`${c.title} by ${c.creator}`)}</title>
    <link href="${SITE.url}/campaign/${esc(c.id)}"/>
    <id>${SITE.url}/campaign/${esc(c.id)}</id>
    <updated>${now}</updated>
    <summary>${esc(`$${c.ratePer1k.toFixed(2)} per 1,000 verified views. ${c.summary}`.slice(0, 400))}</summary>
  </entry>`,
  )
  .join('\n')}
</feed>
`
  return new Response(xml, { headers: { 'content-type': 'application/atom+xml; charset=utf-8', 'cache-control': 'public, max-age=300, s-maxage=300' } })
}
