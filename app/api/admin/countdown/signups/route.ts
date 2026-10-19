import { limit } from '@/lib/guard'
import { json, route } from '@/lib/http'
import { listSignups, signupCounts } from '@/lib/launch'
import { requireAdmin } from '@/lib/user'

/** The people on the launch list, newest first. `?format=csv` downloads all of them as a spreadsheet. */
export const GET = route(async (req: Request) => {
  const admin = await requireAdmin()
  await limit(req, { name: 'admin-signups', max: 60, windowSec: 600, userId: admin.id })
  const q = new URL(req.url).searchParams
  if (q.get('format') === 'csv') {
    const all = await listSignups(20000, 0)
    const csv = ['email,username,signed up,unsubscribed', ...all.map((r) => `${r.e},${r.h ?? ''},${new Date(r.t * 1000).toISOString()},${r.u ? 'yes' : ''}`)].join('\n')
    return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': 'attachment; filename="launch-list.csv"', 'cache-control': 'no-store' } })
  }
  const offset = Math.max(0, Number(q.get('offset') ?? 0) || 0)
  return json({ rows: await listSignups(100, offset), counts: await signupCounts() })
})
