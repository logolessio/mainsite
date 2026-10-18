import { featureState } from '@/lib/features'
import { json, route } from '@/lib/http'
import { getSetting } from '@/lib/settings'

/** The few site-wide switches the native apps follow: the Design page's liquid loader and the pages that are switched on. */
export const GET = route(async () => {
  const f = (await featureState()).on
  return json({
    liquidLoader: (await getSetting('design_liquid_loader')) === '1',
    features: { leaderboard: f['leaderboard'] === true, reels: f['reels'] === true, status: f['status-page'] === true },
  })
})
