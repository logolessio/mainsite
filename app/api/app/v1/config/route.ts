import { parseChoices } from '@/lib/design-choices'
import { featureState } from '@/lib/features'
import { fontById } from '@/lib/fonts'
import { json, route } from '@/lib/http'
import { allSettings } from '@/lib/settings'

/** The few site-wide switches the native apps follow: the Design page's liquid loader, how the campaigns are laid out and the cover text, and the pages that are switched on. */
export const GET = route(async () => {
  const f = (await featureState()).on
  const s = await allSettings()
  const { cover, layout } = parseChoices(s)
  return json({
    liquidLoader: s.design_liquid_loader === '1',
    // the apps carry their own faces, so a chosen cover typeface reaches them as a kind (serif, sans, mono) rather than a name
    design: { layout, cover: { ...cover, fontKind: cover.font === 'site' ? 'site' : fontById(cover.font).kind } },
    features: { leaderboard: f['leaderboard'] === true, reels: f['reels'] === true, status: f['status-page'] === true },
  })
})
