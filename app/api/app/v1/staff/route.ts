import { db, nowSec } from '@/lib/db'
import { json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

/** The owner's view in the Mac app: the numbers that matter and the two queues that need a decision. Decisions go through /api/admin/submissions/[id] and /api/admin/payouts/[id]. */
export const GET = route(async () => {
  await requireAdmin()
  const d = await db()
  const dayAgo = nowSec() - 86400
  const [people, live, pendingN, reviewN, joined, pending, review] = await Promise.all([
    d.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>(),
    d.prepare("SELECT COUNT(*) AS n FROM campaigns WHERE status = 'live'").first<{ n: number }>(),
    d.prepare("SELECT COUNT(*) AS n FROM submissions WHERE status = 'pending'").first<{ n: number }>(),
    d.prepare("SELECT COUNT(*) AS n FROM payouts WHERE status = 'review'").first<{ n: number }>(),
    d.prepare('SELECT COUNT(*) AS n FROM users WHERE created_at >= ?1').bind(dayAgo).first<{ n: number }>(),
    d
      .prepare(
        `SELECT s.id, s.platform, s.url, s.views_verified AS views, s.created_at AS createdAt, c.title AS campaign, c.cover_url AS cover, c.rate_cents AS rateCents,
           u.email, p.handle, u.risk_level AS risk
         FROM submissions s JOIN campaigns c ON c.id = s.campaign_id JOIN users u ON u.id = s.user_id LEFT JOIN profiles p ON p.user_id = u.id
         WHERE s.status = 'pending' ORDER BY s.created_at ASC LIMIT 60`,
      )
      .all(),
    d
      .prepare(
        `SELECT p.id, p.amount_cents AS amountCents, p.review_reason AS reason, p.created_at AS createdAt, u.email, u.risk_level AS risk,
           (SELECT value FROM settings WHERE key = 'payout-to:' || p.id) AS paypalEmail
         FROM payouts p JOIN users u ON u.id = p.user_id WHERE p.status = 'review' ORDER BY p.created_at ASC LIMIT 40`,
      )
      .all(),
  ])
  return json({
    people: people?.n ?? 0,
    liveCampaigns: live?.n ?? 0,
    pendingSubmissions: pendingN?.n ?? 0,
    payoutsInReview: reviewN?.n ?? 0,
    joinedToday: joined?.n ?? 0,
    pending: pending.results,
    review: review.results,
  })
})
