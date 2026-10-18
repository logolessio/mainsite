import { liveCampaigns } from '@/lib/campaigns-db'
import { db } from '@/lib/db'
import { json, route } from '@/lib/http'
import { getSession } from '@/lib/session'

/** Everything the Mac app's browse screen shows: the live campaigns (the same facts the website shows) and, when signed in, which ones are saved. */
export const GET = route(async () => {
  const campaigns = await liveCampaigns()
  const email = (await getSession())?.user?.email?.toLowerCase()
  let favorites: string[] = []
  if (email) {
    const d = await db()
    const u = await d.prepare('SELECT id FROM users WHERE email = ?1').bind(email).first<{ id: string }>()
    if (u) favorites = (await d.prepare('SELECT campaign_id FROM favorites WHERE user_id = ?1').bind(u.id).all<{ campaign_id: string }>()).results.map((r) => r.campaign_id)
  }
  return json({ campaigns, favorites })
})
