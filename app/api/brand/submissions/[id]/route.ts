import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { db, nowSec } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { notify } from '@/lib/notify'
import { requireUser } from '@/lib/user'

const schema = z.object({ action: z.literal('reject'), reason: z.string().trim().min(3).max(200) })

/**
 * An artist can turn down a clip on their own campaign (wrong song, off-brief, low effort) before it has been paid for.
 * Approving and paying stays with logoless, because we check the views on the platform before any money moves.
 */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'brand-submission', max: 60, windowSec: 600, userId: user.id })
  const { id } = await params
  const parsed = schema.safeParse(await body(req, 2048))
  if (!parsed.success) throw new HttpError(400, 'Tell the clipper briefly why (at least a few words).')
  const d = await db()
  const s = await d
    .prepare(
      `SELECT s.id, s.user_id, s.status, s.views_verified, c.title, c.brand_user_id
       FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.id = ?1`,
    )
    .bind(id)
    .first<{ id: string; user_id: string; status: string; views_verified: number; title: string; brand_user_id: string | null }>()
  if (!s || s.brand_user_id !== user.id) throw new HttpError(404, 'Clip not found.')
  if (s.views_verified > 0) throw new HttpError(409, 'This clip has already been paid for, so it cannot be turned down now.')
  if (s.status === 'rejected') throw new HttpError(409, 'You already turned this clip down.')
  await d.prepare("UPDATE submissions SET status = 'rejected', reject_reason = ?2, reviewed_by = ?3, reviewed_at = ?4 WHERE id = ?1").bind(id, parsed.data.reason, user.email, nowSec()).run()
  await notify(s.user_id, { kind: 'submission', title: `A clip was not approved (${s.title})`, body: parsed.data.reason, href: '/dashboard/submissions', dedupe: `sub-rejected:${id}` })
  await auditSafe({ id: user.id, email: user.email }, 'submission.brand_reject', id, parsed.data.reason)
  return json({ ok: true })
})
