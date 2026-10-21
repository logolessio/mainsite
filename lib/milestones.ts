import { db, nowSec } from './db'
import { notify } from './notify'

/** The view counts worth celebrating, across all of a client's campaigns together. */
export const MILESTONES = [1_000, 10_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 5_000_000, 10_000_000] as const

/** The highest milestone a total has passed, or 0. */
export const passed = (views: number) => MILESTONES.filter((m) => views >= m).at(-1) ?? 0
/** The next milestone above a total, or null once the last one is behind. */
export const nextMilestone = (views: number) => MILESTONES.find((m) => views < m) ?? null

const key = (userId: string) => `milestone:${userId}`

/** Every verified view on every submission made for this client's campaigns. */
export async function brandViews(userId: string) {
  const d = await db()
  const r = await d
    .prepare('SELECT COALESCE(SUM(views_verified), 0) AS v FROM submissions WHERE campaign_id IN (SELECT id FROM campaigns WHERE brand_user_id = ?1)')
    .bind(userId)
    .first<{ v: number }>()
  return r?.v ?? 0
}

/** The highest milestone this client has already been shown. */
export async function celebrated(userId: string) {
  try {
    const d = await db()
    const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(key(userId)).first<{ value: string }>()
    const n = Number(r?.value)
    return Number.isFinite(n) ? n : 0
  } catch {
    // no answer means no party: better to miss one than to show it on every visit
    return Number.POSITIVE_INFINITY
  }
}

/** Remembers a milestone as shown. It only ever goes up. */
export async function markCelebrated(userId: string, milestone: number) {
  const d = await db()
  await d
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)
       ON CONFLICT(key) DO UPDATE SET value = CASE WHEN CAST(excluded.value AS INTEGER) > CAST(settings.value AS INTEGER) THEN excluded.value ELSE settings.value END, updated_at = excluded.updated_at`,
    )
    .bind(key(userId), String(milestone), nowSec())
    .run()
}

export type PendingMilestone = { milestone: number; views: number; top: { title: string; views: number } | null }

/**
 * The milestone to celebrate now, if there is one. Only the highest one passed is ever shown, so someone who already had
 * 300,000 views when this started sees 250,000 once, not five parties in a row. The notification goes out the first time it is seen here.
 */
export async function pendingMilestone(userId: string, views: number): Promise<PendingMilestone | null> {
  const m = passed(views)
  if (!m || m <= (await celebrated(userId))) return null
  const d = await db()
  const top = await d
    .prepare(
      `SELECT c.title, COALESCE(SUM(s.views_verified), 0) AS views FROM campaigns c JOIN submissions s ON s.campaign_id = c.id
       WHERE c.brand_user_id = ?1 GROUP BY c.id ORDER BY views DESC LIMIT 1`,
    )
    .bind(userId)
    .first<{ title: string; views: number }>()
    .catch(() => null)
  await notify(userId, {
    kind: 'campaign',
    title: `Your campaigns passed ${m.toLocaleString('en-US')} verified views`,
    body: top && top.views > 0 ? `Most of them came from ${top.title}.` : 'Every one of them checked on the platform.',
    href: '/brand',
    dedupe: `milestone:${m}`,
  })
  return { milestone: m, views, top: top && top.views > 0 ? top : null }
}
