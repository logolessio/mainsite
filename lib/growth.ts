import { db, nowSec } from './db'

/**
 * The numbers behind the creator features: level, streak, forecast, trusted tag, yearly totals. All of it is worked out from what is already
 * stored (submissions and earnings), so nothing new is saved and nothing here can change anyone's money.
 */

export * from './growth-shared'
import type { CreatorStats } from './growth-shared'

export async function creatorStats(userId: string): Promise<CreatorStats> {
  const d = await db()
  const t = nowSec()
  const [s, e, w] = await Promise.all([
    d
      .prepare(
        `SELECT COALESCE(SUM(views_verified), 0) AS views,
           COUNT(CASE WHEN status = 'approved' THEN 1 END) AS approved,
           COUNT(CASE WHEN status = 'rejected' THEN 1 END) AS rejected,
           COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending,
           MIN(created_at) AS first_at
         FROM submissions WHERE user_id = ?1`,
      )
      .bind(userId)
      .first<{ views: number; approved: number; rejected: number; pending: number; first_at: number | null }>(),
    d
      .prepare(
        `SELECT COALESCE(SUM(net_cents), 0) AS total,
           COALESCE(SUM(CASE WHEN created_at > ?2 THEN net_cents END), 0) AS last30,
           COALESCE(SUM(CASE WHEN created_at <= ?2 AND created_at > ?3 THEN net_cents END), 0) AS prev30
         FROM earnings WHERE clipper_user_id = ?1`,
      )
      .bind(userId, t - 30 * 86400, t - 60 * 86400)
      .first<{ total: number; last30: number; prev30: number }>(),
    d.prepare('SELECT DISTINCT CAST(created_at / 604800 AS INTEGER) AS wk FROM submissions WHERE user_id = ?1 ORDER BY wk DESC LIMIT 120').bind(userId).all<{ wk: number }>(),
  ])
  return {
    views: s?.views ?? 0,
    approved: s?.approved ?? 0,
    rejected: s?.rejected ?? 0,
    pending: s?.pending ?? 0,
    earnedCents: e?.total ?? 0,
    last30Cents: e?.last30 ?? 0,
    prev30Cents: e?.prev30 ?? 0,
    firstAt: s?.first_at ?? null,
    weeks: w.results.map((r) => r.wk),
  }
}

// ---------- totals by year, for the tax page ----------
export type YearRow = { year: number; earnedCents: number; clips: number; paidOutCents: number }

export async function yearlyTotals(userId: string): Promise<YearRow[]> {
  const d = await db()
  const [e, p] = await Promise.all([
    d
      .prepare("SELECT CAST(strftime('%Y', created_at, 'unixepoch') AS INTEGER) AS year, COALESCE(SUM(net_cents), 0) AS cents, COUNT(DISTINCT submission_id) AS clips FROM earnings WHERE clipper_user_id = ?1 GROUP BY year ORDER BY year DESC")
      .bind(userId)
      .all<{ year: number; cents: number; clips: number }>(),
    d
      .prepare("SELECT CAST(strftime('%Y', created_at, 'unixepoch') AS INTEGER) AS year, COALESCE(SUM(amount_cents), 0) AS cents FROM payouts WHERE user_id = ?1 AND status IN ('sent', 'paid', 'pending') GROUP BY year")
      .bind(userId)
      .all<{ year: number; cents: number }>()
      .catch(() => ({ results: [] as { year: number; cents: number }[] })),
  ])
  const paid = new Map(p.results.map((r) => [r.year, r.cents]))
  return e.results.map((r) => ({ year: r.year, earnedCents: r.cents, clips: r.clips, paidOutCents: paid.get(r.year) ?? 0 }))
}

