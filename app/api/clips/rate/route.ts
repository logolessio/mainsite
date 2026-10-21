import { db, nowSec } from '@/lib/db'
import { FEED_VISIBLE } from '@/lib/clip-feed'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/** Rate a clip on the feed, 1 to 5 stars. One rating per person per clip: rating again changes it, 0 takes it back. Not your own clips. */
export const POST = route(async (req: Request) => {
  if (!(await featureOn('submissions-feed'))) throw new HttpError(404, 'Not found.')
  const user = await requireUser()
  await protect(req, { name: 'clip-rate', max: 120, windowSec: 600, userId: user.id })
  const { id, stars } = await body<{ id?: string; stars?: number }>(req, 512)
  if (typeof id !== 'string' || !/^[\w-]{6,64}$/.test(id) || typeof stars !== 'number' || !Number.isInteger(stars) || stars < 0 || stars > 5) throw new HttpError(400, 'Invalid request.')
  const d = await db()
  const clip = await d
    .prepare(
      `SELECT s.user_id FROM submissions s JOIN users u ON u.id = s.user_id JOIN profiles p ON p.user_id = s.user_id LEFT JOIN clip_meta m ON m.submission_id = s.id
       WHERE s.id = ?1 AND ${FEED_VISIBLE}`,
    )
    .bind(id)
    .first<{ user_id: string }>()
  if (!clip) throw new HttpError(404, 'That clip is not on the feed.')
  if (clip.user_id === user.id) throw new HttpError(403, 'You cannot rate your own clip.')
  const t = nowSec()
  if (stars === 0) await d.prepare('DELETE FROM clip_ratings WHERE submission_id = ?1 AND user_id = ?2').bind(id, user.id).run()
  else
    await d
      .prepare(
        `INSERT INTO clip_ratings (submission_id, user_id, stars, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)
         ON CONFLICT(submission_id, user_id) DO UPDATE SET stars = excluded.stars, updated_at = excluded.updated_at`,
      )
      .bind(id, user.id, stars, t)
      .run()
  const r = await d.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(stars), 0) AS total FROM clip_ratings WHERE submission_id = ?1').bind(id).first<{ n: number; total: number }>()
  const n = r?.n ?? 0
  return json({ rating: { avg: n ? Math.round(((r?.total ?? 0) / n) * 10) / 10 : 0, count: n, mine: stars || null } })
})
