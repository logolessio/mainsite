import { refreshClips, viewerId } from '@/lib/clip-feed'
import { featureOn } from '@/lib/features'
import { limit } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'

/**
 * Fresh platform numbers (picture, views, likes, comments, date) for up to 12 clips on the feed. The page asks once the clips are
 * showing, so the feed itself never waits on TikTok or YouTube. Answers are stored, so each clip is looked up at most every few hours.
 */
export const GET = route(async (req: Request) => {
  if (!(await featureOn('submissions-feed'))) throw new HttpError(404, 'Not found.')
  await limit(req, { name: 'clip-meta', max: 90, windowSec: 600 })
  const ids = (new URL(req.url).searchParams.get('ids') ?? '').split(',').filter(Boolean)
  return json(await refreshClips(ids, await viewerId()))
})
