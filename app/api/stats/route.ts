import { featureOn } from '@/lib/features'
import { HttpError, json, route } from '@/lib/http'
import { isRange, statsBoard } from '@/lib/stats-board'

/** The public stats and leaderboards for one range (week, month or all). Only numbers people chose to make public. */
export const GET = route(async (req: Request) => {
  if (!(await featureOn('stats-page'))) throw new HttpError(404, 'Not found.')
  const r = new URL(req.url).searchParams.get('range')
  return json(await statsBoard(isRange(r) ? r : 'month'))
})
