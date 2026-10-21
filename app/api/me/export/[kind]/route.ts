import { csvLine, csvResponse, dollars, iso } from '@/lib/csv'
import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { HttpError, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/**
 * Spreadsheets of your own data: what you earned, what you submitted, what you withdrew (creators), and what your campaigns cost and
 * returned (brands). Only the signed-in person's own rows, numbers in dollars, dates as year-month-day.
 */
export const GET = route(async (req: Request, { params }: { params: Promise<{ kind: string }> }) => {
  if (!(await featureOn('export-csv'))) throw new HttpError(404, 'Not found.')
  const user = await requireUser()
  await protect(req, { name: 'export-csv', max: 30, windowSec: 600, userId: user.id })
  const { kind } = await params
  const year = Number(new URL(req.url).searchParams.get('year')) || 0
  const d = await db()
  const inYear = (col: string) => (year ? ` AND strftime('%Y', ${col}, 'unixepoch') = '${year}'` : '')
  const tag = year ? `-${year}` : ''

  if (kind === 'earnings') {
    const rows = (await d.prepare(`SELECT e.created_at, e.campaign, e.gross_cents, e.fee_cents, e.net_cents, e.note FROM earnings e WHERE e.clipper_user_id = ?1${inYear('e.created_at')} ORDER BY e.created_at`).bind(user.id).all<{ created_at: number; campaign: string | null; gross_cents: number; fee_cents: number; net_cents: number; note: string | null }>()).results
    return csvResponse(`logoless-earnings${tag}.csv`, [csvLine(['Date', 'Campaign', 'You earned (USD)', 'Note']), ...rows.map((r) => csvLine([iso(r.created_at), r.campaign, dollars(r.net_cents), r.note]))])
  }
  if (kind === 'submissions') {
    const rows = (await d.prepare(`SELECT s.created_at, c.title, s.platform, s.url, s.status, s.views_verified, s.earned_cents FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1${inYear('s.created_at')} ORDER BY s.created_at`).bind(user.id).all<{ created_at: number; title: string; platform: string; url: string; status: string; views_verified: number; earned_cents: number }>()).results
    return csvResponse(`logoless-submissions${tag}.csv`, [csvLine(['Date', 'Campaign', 'Platform', 'Link', 'Status', 'Verified views', 'Earned (USD)']), ...rows.map((r) => csvLine([iso(r.created_at), r.title, r.platform, r.url, r.status, r.views_verified, dollars(r.earned_cents)]))])
  }
  if (kind === 'payouts') {
    const rows = (await d.prepare(`SELECT created_at, amount_cents, status FROM payouts WHERE user_id = ?1${inYear('created_at')} ORDER BY created_at`).bind(user.id).all<{ created_at: number; amount_cents: number; status: string }>()).results
    return csvResponse(`logoless-withdrawals${tag}.csv`, [csvLine(['Date', 'Amount (USD)', 'Status']), ...rows.map((r) => csvLine([iso(r.created_at), dollars(r.amount_cents), r.status]))])
  }
  if (kind === 'campaigns') {
    const rows = (await d.prepare(`SELECT c.created_at, c.title, c.status, c.budget_cents, c.rate_cents,
        COALESCE((SELECT SUM(gross_cents) FROM earnings WHERE campaign_id = c.id), 0) AS spent,
        COALESCE((SELECT SUM(views_verified) FROM submissions WHERE campaign_id = c.id), 0) AS views,
        (SELECT COUNT(*) FROM submissions WHERE campaign_id = c.id) AS clips
      FROM campaigns c WHERE c.brand_user_id = ?1${inYear('c.created_at')} ORDER BY c.created_at`).bind(user.id).all<{ created_at: number; title: string; status: string; budget_cents: number; rate_cents: number; spent: number; views: number; clips: number }>()).results
    return csvResponse(`logoless-campaigns${tag}.csv`, [csvLine(['Made', 'Campaign', 'Status', 'Budget (USD)', 'Rate per 1,000 views (USD)', 'Spent (USD)', 'Verified views', 'Clips']), ...rows.map((r) => csvLine([iso(r.created_at), r.title, r.status, dollars(r.budget_cents), dollars(r.rate_cents), dollars(r.spent), r.views, r.clips]))])
  }
  throw new HttpError(404, 'Not found.')
})
