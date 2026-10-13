import { auditSafe } from '@/lib/chain'
import { db, nowSec } from '@/lib/db'
import { protect } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { notifyAdmins } from '@/lib/notify'
import { requireUser } from '@/lib/user'

/** A clipper whose clip was declined asks for a person to look at it. Allowed once per clip, and only before anything was paid. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'appeal', max: 10, windowSec: 600, userId: user.id })
  const { id } = await params
  const d = await db()
  const s = await d
    .prepare('SELECT s.id, s.user_id, s.status, s.views_verified, s.reviewed_by, c.title FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.id = ?1')
    .bind(id)
    .first<{ id: string; user_id: string; status: string; views_verified: number; reviewed_by: string | null; title: string }>()
  if (!s || s.user_id !== user.id) throw new HttpError(404, 'Clip not found.')
  if (s.status !== 'rejected') throw new HttpError(409, 'Only a declined clip can be sent for review.')
  if (s.views_verified > 0) throw new HttpError(409, 'This clip has already been paid for.')
  if (s.reviewed_by === 'appeal') throw new HttpError(409, 'A person has already been asked to look at this clip.')
  await d.prepare("UPDATE submissions SET status = 'pending', reviewed_by = 'appeal', reviewed_at = ?2 WHERE id = ?1").bind(id, nowSec()).run()
  await notifyAdmins({ title: `Review requested: ${s.title}`, body: user.email, href: '/admin/submissions', dedupe: `sub-appeal:${id}` })
  await auditSafe({ id: user.id, email: user.email }, 'submission.appeal', id, s.title)
  return json({ ok: true, status: 'review' })
})
