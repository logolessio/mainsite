import { db } from './db'

export type PublicStats = { campaigns: number; clips: number; paidCents: number; views: number }

/** Real totals for the home page. Sample campaigns are left out. */
export async function publicStats(): Promise<PublicStats> {
  try {
    const d = await db()
    const r = await d
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM campaigns WHERE status = 'live' AND COALESCE(admin_note, '') != 'sample' AND id NOT LIKE 'mock-%') AS campaigns,
           (SELECT COUNT(*) FROM submissions WHERE status = 'approved') AS clips,
           (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger WHERE account = 'clipper' AND kind = 'earning') AS paid,
           (SELECT COALESCE(SUM(views_verified), 0) FROM submissions WHERE status = 'approved') AS views`,
      )
      .first<{ campaigns: number; clips: number; paid: number; views: number }>()
    return { campaigns: r?.campaigns ?? 0, clips: r?.clips ?? 0, paidCents: r?.paid ?? 0, views: r?.views ?? 0 }
  } catch {
    return { campaigns: 0, clips: 0, paidCents: 0, views: 0 }
  }
}

/** Numbers only go on show when they are worth showing. */
export const worthShowing = (s: PublicStats) => s.campaigns >= 3 && s.clips >= 25 && s.paidCents >= 50_000
