import { z } from 'zod'
import { db, nowSec } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'
import { lastScan, rescanViews } from '@/lib/views-rescan'

/** How the automatic view checks are doing, and a button to run them now. */
export const GET = route(async () => {
  await requireAdmin()
  const d = await db()
  const t = nowSec()
  const [due, flagged] = await Promise.all([
    d
      .prepare(
        `SELECT COUNT(*) AS n FROM submissions s JOIN campaigns c ON c.id = s.campaign_id LEFT JOIN settings v ON v.key = 'viewscan:' || s.id
         WHERE s.status = 'approved' AND c.status = 'live' AND c.id NOT LIKE 'mock-%' AND COALESCE(CAST(json_extract(v.value, '$.at') AS INTEGER), 0) < ?1`,
      )
      .bind(t - 6000)
      .first<{ n: number }>(),
    d.prepare("SELECT COUNT(*) AS n FROM settings WHERE key LIKE 'viewscan:%' AND key NOT IN ('viewscan:last', 'viewscan:lock') AND json_extract(value, '$.flag') IS NOT NULL").first<{ n: number }>(),
  ])
  return json({ last: await lastScan(), due: due?.n ?? 0, held: flagged?.n ?? 0 })
})

const schema = z.object({ fake: z.record(z.string().max(300), z.union([z.number().int().min(0), z.literal('gone')])).optional() })

export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'views-scan', max: 10, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 16 * 1024).catch(() => ({})))
  const result = await rescanViews({ force: true, fake: parsed.success ? parsed.data.fake : undefined })
  if (result.skipped === 'busy') throw new HttpError(409, 'A check is already running. Try again in a minute.')
  return json({ ok: true, ...result })
})
