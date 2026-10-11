import { db, nowSec } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { ownedInvite, parseData, progressSchema } from '@/lib/invites'
import { requireUser } from '@/lib/user'

/** Saves where an invited artist got to and what they typed, so a refresh or a new device picks up exactly there. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'invite-progress', max: 240, windowSec: 600, userId: user.id })
  const { slug } = await params
  const inv = await ownedInvite(slug, user)
  const parsed = progressSchema.safeParse(await body(req, 16 * 1024))
  if (!parsed.success) throw new HttpError(400, 'That could not be saved.')
  const merged = { ...parseData(inv.data_json), ...parsed.data.data }
  const d = await db()
  await d
    .prepare('UPDATE artist_invites SET data_json = ?2, step = MAX(step, ?3), last_active_at = ?4 WHERE id = ?1')
    .bind(inv.id, JSON.stringify(merged), parsed.data.step, nowSec())
    .run()
  return json({ ok: true })
})
