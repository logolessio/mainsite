import { z } from 'zod'
import { audit } from '@/lib/chain'
import { db, nowSec } from '@/lib/db'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { notify } from '@/lib/notify'
import { requireAdmin } from '@/lib/user'

const schema = z.object({ action: z.literal('approve_trusted'), limit: z.number().int().min(1).max(100).default(50) })

/**
 * Approves waiting clips from people with no extra checks on their account, for campaigns that are live. It only approves: views
 * (and so money) are still set clip by clip. Anyone flagged is left for a person to look at.
 */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-bulk-clips', max: 20, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 512))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const d = await db()
  const t = nowSec()
  const rows = (
    await d
      .prepare(
        `SELECT s.id, s.user_id, c.title FROM submissions s
         JOIN users u ON u.id = s.user_id JOIN campaigns c ON c.id = s.campaign_id
         WHERE s.status = 'pending' AND u.status = 'active' AND u.risk_level = 'low' AND c.status = 'live'
         ORDER BY s.created_at LIMIT ?1`,
      )
      .bind(parsed.data.limit)
      .all<{ id: string; user_id: string; title: string }>()
  ).results
  let done = 0
  for (const r of rows) {
    const res = await d.prepare("UPDATE submissions SET status = 'approved', reviewed_by = ?2, reviewed_at = ?3 WHERE id = ?1 AND status = 'pending'").bind(r.id, admin.email, t).run()
    if (res.meta.changes === 1) {
      done++
      await notify(r.user_id, { kind: 'submission', title: `Clip approved (${r.title})`, body: 'It is now earning.', href: '/dashboard/submissions', dedupe: `sub-approved:${r.id}` })
    }
  }
  await audit({ id: admin.id, email: admin.email }, 'submission.bulk_approve', null, `${done} clips`, await ipHash(req))
  return json({ ok: true, approved: done })
})
