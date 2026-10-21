import { featureOn } from '@/lib/features'
import { route } from '@/lib/http'
import { recentPaid } from '@/lib/showcase'

/** What was paid out in the last day, with no names and whole dollars only, for the ticker on the home page. Public, and cached for a minute. */
export const GET = route(async () => {
  const items = (await featureOn('live-ticker')) ? await recentPaid(10) : []
  return new Response(JSON.stringify({ items }), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60, s-maxage=60' } })
})
