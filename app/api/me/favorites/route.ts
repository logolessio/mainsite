import { evaluateBadges } from '@/lib/badges'
import { db, nowSec } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

export const GET = route(async () => {
  const user = await requireUser()
  const d = await db()
  const rows = (await d.prepare('SELECT campaign_id FROM favorites WHERE user_id = ?1').bind(user.id).all<{ campaign_id: string }>()).results
  return json({ ids: rows.map((r) => r.campaign_id) })
})

/** Favourite or unfavourite a campaign. Favouriting is what lets you be told when it changes. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'favorite', max: 60, windowSec: 600, userId: user.id })
  const { campaignId, on } = await body<{ campaignId?: string; on?: boolean }>(req, 1024)
  if (!campaignId || typeof on !== 'boolean') throw new HttpError(400, 'Invalid request.')
  const d = await db()
  if (on) {
    const c = await d.prepare("SELECT id FROM campaigns WHERE id = ?1 AND status IN ('live','paused')").bind(campaignId).first()
    if (!c) throw new HttpError(404, 'Campaign not found.')
    const n = await d.prepare('SELECT COUNT(*) AS n FROM favorites WHERE user_id = ?1').bind(user.id).first<{ n: number }>()
    if ((n?.n ?? 0) >= 200) throw new HttpError(400, 'You have a lot of favourites already.')
    await d.prepare('INSERT OR IGNORE INTO favorites (user_id, campaign_id, created_at) VALUES (?1, ?2, ?3)').bind(user.id, campaignId, nowSec()).run()
    await evaluateBadges(user.id)
  } else {
    await d.prepare('DELETE FROM favorites WHERE user_id = ?1 AND campaign_id = ?2').bind(user.id, campaignId).run()
  }
  return json({ ok: true })
})
