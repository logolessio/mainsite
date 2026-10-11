import { db, nowSec } from '@/lib/db'
import { limit } from '@/lib/guard'
import { json, route } from '@/lib/http'
import { allSettings } from '@/lib/settings'
import { requireAdmin } from '@/lib/user'

/** Everything the Tools panel shows: switches, queue sizes, this page's numbers and the latest activity. */
export const GET = route(async (req: Request) => {
  const admin = await requireAdmin()
  await limit(req, { name: 'admin-tools', max: 90, windowSec: 60, userId: admin.id })
  const path = new URL(req.url).searchParams.get('path')?.slice(0, 200) ?? '/'
  const d = await db()
  const t = nowSec()
  const [settings, counts, page, feed] = await Promise.all([
    allSettings(),
    d
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM submissions WHERE status = 'pending') AS clips,
           (SELECT COUNT(*) FROM campaigns WHERE status = 'requested') AS requests,
           (SELECT COUNT(*) FROM campaigns WHERE status = 'paid') AS launch,
           (SELECT COUNT(*) FROM payouts WHERE status = 'review') AS payouts,
           (SELECT COUNT(*) FROM users WHERE risk_level != 'low') AS flagged,
           (SELECT COUNT(*) FROM users WHERE last_seen_at > ?1 - 300) AS online`,
      )
      .bind(t)
      .first<Record<string, number>>(),
    d
      .prepare(
        `SELECT
           COUNT(CASE WHEN ts > ?2 - 86400 THEN 1 END) AS views24,
           COUNT(*) AS views7,
           COUNT(DISTINCT ip_hash) AS visitors7,
           (SELECT COUNT(*) FROM event_log WHERE kind IN ('error','clienterror') AND path = ?1 AND ts > ?2 - 604800) AS errors7
         FROM event_log WHERE kind = 'pageview' AND path = ?1 AND ts > ?2 - 604800`,
      )
      .bind(path, t)
      .first<Record<string, number>>(),
    d.prepare('SELECT ts, kind, name, status, actor FROM event_log ORDER BY id DESC LIMIT 8').all<{ ts: number; kind: string; name: string; status: number | null; actor: string | null }>(),
  ])
  return json({ settings, counts, page, feed: feed.results })
})
