import { db } from '@/lib/db'
import { json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/** Every submission the signed-in person has made, newest first. */
export const GET = route(async () => {
  const user = await requireUser()
  const d = await db()
  const rows = (
    await d
      .prepare(
        `SELECT s.id, s.campaign_id AS campaignId, s.platform, s.url, s.status, s.views_verified AS views, s.earned_cents AS earnedCents, s.created_at AS createdAt, c.title AS campaign, c.cover_url AS cover
         FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1 ORDER BY s.created_at DESC LIMIT 200`,
      )
      .bind(user.id)
      .all()
  ).results
  return json({ submissions: rows })
})
