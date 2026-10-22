import { liveCampaigns } from '@/lib/campaigns-db'
import { featureOn } from '@/lib/features'
import { limit } from '@/lib/guard'
import { json, route } from '@/lib/http'
import { directory } from '@/lib/showcase'

/**
 * What the search box looks through. Without `q`: the live campaigns, trimmed down. With `q` (two letters or more): also the creators whose page is public
 * and who have an approved clip (the same people the Creators page lists, with the same privacy), when that directory is switched on. Nothing private.
 */
export const GET = route(async (req: Request) => {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 40)
  if (q.length >= 2) {
    await limit(req, { name: 'search-people', max: 90, windowSec: 60 })
    const people = (await featureOn('creator-directory')) ? (await directory({ sort: 'views', q })).slice(0, 6) : []
    return json({ people: people.map((p) => ({ handle: p.handle, name: p.name, avatar: p.avatar, views: p.views, trusted: p.trusted })) })
  }
  const list = await liveCampaigns()
  return json({ campaigns: list.map((c) => ({ id: c.id, title: c.title, creator: c.creator, type: c.type, cover: c.cover, rate: c.ratePer1k })) })
})
