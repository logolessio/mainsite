import { z } from 'zod'
import { audit } from '@/lib/chain'
import { db, nowSec } from '@/lib/db'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

const schema = z.object({ days: z.number().int().min(7).max(3650) })

/** Deletes activity-log rows older than N days (7 at the least). The audit log and text history are never touched. */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'logs-cleanup', max: 5, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, 'Choose 7 days or more.')
  const d = await db()
  const res = await d.prepare('DELETE FROM event_log WHERE ts < ?1').bind(nowSec() - parsed.data.days * 86400).run()
  await audit({ id: admin.id, email: admin.email }, 'logs.cleanup', null, `older than ${parsed.data.days} days: ${res.meta.changes} rows`, await ipHash(req))
  return json({ ok: true, deleted: res.meta.changes })
})
