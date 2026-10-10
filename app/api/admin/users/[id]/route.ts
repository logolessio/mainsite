import { z } from 'zod'
import { audit } from '@/lib/chain'
import { db } from '@/lib/db'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

const schema = z.object({
  action: z.enum(['suspend', 'ban', 'reinstate', 'flag', 'unflag']),
  note: z.string().trim().max(200).optional(),
})

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-user', max: 60, windowSec: 600, userId: admin.id })
  const { id } = await params
  const parsed = schema.safeParse(await body(req))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const { action, note } = parsed.data
  if (id === admin.id) throw new HttpError(400, 'You cannot do that to your own account.')
  const d = await db()
  const u = await d.prepare('SELECT id, email, role FROM users WHERE id = ?1').bind(id).first<{ id: string; email: string; role: string }>()
  if (!u) throw new HttpError(404, 'Account not found.')
  if (u.role === 'admin') throw new HttpError(403, 'Admin accounts cannot be restricted here.')

  if (action === 'suspend' || action === 'ban') {
    if (!note || note.length < 3) throw new HttpError(400, 'Add a short reason.')
    await d.prepare('UPDATE users SET status = ?2, risk_reasons = ?3 WHERE id = ?1').bind(id, action === 'ban' ? 'banned' : 'suspended', `${action === 'ban' ? 'Banned' : 'Suspended'}: ${note}`).run()
  } else if (action === 'reinstate') {
    await d.prepare("UPDATE users SET status = 'active' WHERE id = ?1").bind(id).run()
  } else if (action === 'flag') {
    await d.prepare("UPDATE users SET risk_level = 'elevated', risk_reasons = ?2 WHERE id = ?1").bind(id, `Flagged by admin${note ? `: ${note}` : ''}`).run()
  } else {
    await d.prepare("UPDATE users SET risk_level = 'low', risk_reasons = NULL WHERE id = ?1").bind(id).run()
  }
  await audit({ id: admin.id, email: admin.email }, `user.${action}`, u.email, note ?? null, await ipHash(req))
  return json({ ok: true })
})
