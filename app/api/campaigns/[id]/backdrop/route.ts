import { getExtras } from '@/lib/campaign-extras'
import { route } from '@/lib/http'

/** The background picture a campaign asked to be shown behind it when it opens (an upload id, or empty). It is already public on the campaign's own page. */
export const GET = route(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const x = /^[\w-]{1,80}$/.test(id) ? await getExtras(id) : null
  return new Response(JSON.stringify({ background: x?.background || '' }), { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60, s-maxage=60' } })
})
