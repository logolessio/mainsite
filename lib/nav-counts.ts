import { waitingChecks } from './bio-verify'
import { db, nowSec } from './db'
import { SITE } from './site'

/** What needs attention, by sidebar address. A number is "this many things wait on you"; `dot` is "there is something to do here". */
export type NavCounts = Record<string, { n?: number; dot?: boolean }>

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/** Small, cheap counts for the sidebar. Reads only, and returns nothing at all if the database cannot answer. */
export async function navCounts(area: 'creator' | 'brand' | 'owner', userId: string): Promise<NavCounts> {
  try {
    const d = await db()
    const t = nowSec()
    if (area === 'creator') {
      const r = await d
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM submissions WHERE user_id = ?1 AND status = 'pending') AS inReview,
             (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger WHERE user_id = ?1 AND account = 'clipper' AND available_at <= ?2) AS available`,
        )
        .bind(userId, t)
        .first<Record<string, number>>()
      const out: NavCounts = {}
      if (num(r?.inReview) > 0) out['/dashboard/submissions'] = { n: num(r?.inReview) }
      if (num(r?.available) >= SITE.minPayoutUsd * 100) out['/dashboard/earnings'] = { dot: true }
      return out
    }
    if (area === 'brand') {
      const r = await d
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM campaigns WHERE brand_user_id = ?1 AND status = 'awaiting_payment') AS toPay,
             (SELECT COUNT(*) FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE c.brand_user_id = ?1 AND s.status = 'pending') AS inReview`,
        )
        .bind(userId)
        .first<Record<string, number>>()
      const out: NavCounts = {}
      if (num(r?.toPay) > 0) out['/brand/campaigns'] = { n: num(r?.toPay) }
      if (num(r?.inReview) > 0) out['/brand/submissions'] = { n: num(r?.inReview) }
      return out
    }
    const r = await d
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM campaigns WHERE status IN ('requested', 'paid')) AS campaigns,
           (SELECT COUNT(*) FROM submissions WHERE status = 'pending') AS submissions,
           (SELECT COUNT(*) FROM payouts WHERE status = 'review') AS payouts,
           (SELECT COUNT(*) FROM settings WHERE key LIKE 'inq:%' AND value LIKE '%"status":"new"%') AS inbox`,
      )
      .first<Record<string, number>>()
    const out: NavCounts = {}
    const put = (href: string, n: unknown) => num(n) > 0 && (out[href] = { n: num(n) })
    put('/admin/campaigns', r?.campaigns)
    put('/admin/submissions', r?.submissions)
    put('/admin/payouts', r?.payouts)
    put('/admin/inbox', r?.inbox)
    put('/admin/people', await waitingChecks())
    return out
  } catch {
    return {}
  }
}
