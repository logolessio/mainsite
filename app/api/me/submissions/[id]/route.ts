import { auditSafe } from '@/lib/chain'
import { db } from '@/lib/db'
import { protect } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/**
 * A creator deletes one of their own submissions.
 * Nothing that was paid is ever taken back: a clip that has earned anything is only hidden (status "removed", so the views already paid for
 * stay on the books and nobody can submit the same link again), and a clip that has earned nothing is deleted outright, which also frees its link.
 */
export const DELETE = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'sub-delete', max: 30, windowSec: 600, userId: user.id })
  const { id } = await params
  const d = await db()
  const s = await d
    .prepare('SELECT s.id, s.user_id, s.status, s.views_verified, s.earned_cents, c.title FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.id = ?1')
    .bind(id)
    .first<{ id: string; user_id: string; status: string; views_verified: number; earned_cents: number; title: string }>()
  if (!s || s.user_id !== user.id) throw new HttpError(404, 'Submission not found.')
  if (s.status === 'removed') return json({ ok: true, removed: 'hidden' })
  const paid = s.earned_cents > 0 || s.views_verified > 0
  if (paid) await d.prepare("UPDATE submissions SET status = 'removed' WHERE id = ?1 AND user_id = ?2").bind(id, user.id).run()
  else await d.prepare('DELETE FROM submissions WHERE id = ?1 AND user_id = ?2').bind(id, user.id).run()
  await auditSafe({ id: user.id, email: user.email }, 'submission.delete', id, `${s.title} (${paid ? 'hidden' : 'deleted'})`)
  return json({ ok: true, removed: paid ? 'hidden' : 'deleted' })
})
