import { db } from './db'
import { balances } from './ledger'
import type { UserRow } from './user'

export type Recap = {
  name: string
  earnedCents: number
  views: number
  clips: number
  approved: number
  sinceSec: number | null
  top: { title: string; creator: string; cover: string; earnedCents: number; views: number } | null
  best: { views: number; title: string; platform: string } | null
  badges: string[]
  badgeCount: number
}

/** Everything a clipper has done so far, for the recap story. Reads only their own rows. */
export async function recapFor(user: UserRow): Promise<Recap> {
  const d = await db()
  const [b, totals, top, best, badges] = await Promise.all([
    balances(user.id),
    d
      .prepare("SELECT COUNT(*) AS clips, COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approved, COALESCE(SUM(views_verified), 0) AS views, MIN(created_at) AS since FROM submissions WHERE user_id = ?1")
      .bind(user.id)
      .first<{ clips: number; approved: number; views: number; since: number | null }>(),
    d
      .prepare(
        `SELECT c.title, c.creator, c.cover_url AS cover, SUM(s.earned_cents) AS earned, SUM(s.views_verified) AS views
         FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1 AND s.status = 'approved'
         GROUP BY s.campaign_id ORDER BY earned DESC, views DESC LIMIT 1`,
      )
      .bind(user.id)
      .first<{ title: string; creator: string; cover: string; earned: number; views: number }>(),
    d
      .prepare("SELECT s.views_verified AS views, s.platform, c.title FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1 AND s.status = 'approved' ORDER BY s.views_verified DESC LIMIT 1")
      .bind(user.id)
      .first<{ views: number; platform: string; title: string }>(),
    d.prepare('SELECT badge_id FROM badges_unlocked WHERE user_id = ?1 ORDER BY unlocked_at DESC').bind(user.id).all<{ badge_id: string }>().catch(() => ({ results: [] as { badge_id: string }[] })),
  ])
  const ids = badges.results.map((r) => r.badge_id)
  return {
    name: (user.name ?? user.email.split('@')[0]).split(' ')[0],
    earnedCents: b.earned,
    views: totals?.views ?? 0,
    clips: totals?.clips ?? 0,
    approved: totals?.approved ?? 0,
    sinceSec: totals?.since ?? null,
    top: top && top.views > 0 ? { title: top.title, creator: top.creator, cover: top.cover, earnedCents: top.earned, views: top.views } : null,
    best: best && best.views > 0 ? { views: best.views, title: best.title, platform: best.platform } : null,
    badges: ids.slice(0, 6),
    badgeCount: ids.length,
  }
}
