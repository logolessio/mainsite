import { feedPage, viewerId, type FeedSort } from '@/lib/clip-feed'
import { isClipPlatform } from '@/lib/clip-embed'
import { featureOn } from '@/lib/features'
import { HttpError, json, route } from '@/lib/http'

/** One page of the public submissions feed. Nothing private: only clips their clippers let the feed show. */
export const GET = route(async (req: Request) => {
  if (!(await featureOn('submissions-feed'))) throw new HttpError(404, 'Not found.')
  const q = new URL(req.url).searchParams
  const sort = (['new', 'top', 'views'].includes(q.get('sort') ?? '') ? q.get('sort') : 'new') as FeedSort
  const platform = q.get('platform')
  const campaign = q.get('campaign')
  const page = await feedPage({
    sort,
    platform: platform && isClipPlatform(platform) ? platform : null,
    campaign: campaign && /^[\w-]{1,80}$/.test(campaign) ? campaign : null,
    offset: Number(q.get('offset') ?? 0) || 0,
    viewerId: await viewerId(),
  })
  return json(page)
})
