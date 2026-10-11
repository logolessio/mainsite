import { liveCampaigns } from '@/lib/campaigns-db'
import { json, route } from '@/lib/http'

/** Live campaigns, trimmed down for the search box. Nothing private. */
export const GET = route(async () => {
  const list = await liveCampaigns()
  return json({ campaigns: list.map((c) => ({ id: c.id, title: c.title, creator: c.creator, type: c.type, cover: c.cover, rate: c.ratePer1k })) })
})
