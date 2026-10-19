import { db, nowSec } from '@/lib/db'
import { json, route } from '@/lib/http'
import { balances } from '@/lib/ledger'
import { unreadCount } from '@/lib/notify'
import { requireUser } from '@/lib/user'

/** The Mac app's front screen: the money, the totals, and the latest submissions. Amounts are cents. */
export const GET = route(async () => {
  const user = await requireUser()
  const d = await db()
  const monthAgo = nowSec() - 30 * 86400
  const [b, totals, recent, month, unread] = await Promise.all([
    balances(user.id),
    d.prepare('SELECT COALESCE(SUM(views_verified), 0) AS views, COUNT(CASE WHEN status != \'removed\' THEN 1 END) AS submissions, COALESCE(SUM(CASE WHEN status = \'pending\' THEN 1 ELSE 0 END), 0) AS inReview FROM submissions WHERE user_id = ?1').bind(user.id).first<{ views: number; submissions: number; inReview: number }>(),
    d
      .prepare(
        `SELECT s.id, s.campaign_id AS campaignId, s.platform, s.url, s.status, s.views_verified AS views, s.earned_cents AS earnedCents, s.created_at AS createdAt, c.title AS campaign, c.cover_url AS cover
         FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1 AND s.status != 'removed' ORDER BY s.created_at DESC LIMIT 5`,
      )
      .bind(user.id)
      .all(),
    d.prepare("SELECT COALESCE(SUM(amount_cents), 0) AS c FROM ledger WHERE user_id = ?1 AND account = 'clipper' AND kind = 'earning' AND created_at >= ?2").bind(user.id, monthAgo).first<{ c: number }>(),
    unreadCount(user.id),
  ])
  return json({
    name: user.name ?? user.email.split('@')[0],
    balances: b,
    monthCents: month?.c ?? 0,
    views: totals?.views ?? 0,
    submissions: totals?.submissions ?? 0,
    inReview: totals?.inReview ?? 0,
    unread,
    recent: recent.results,
  })
})
