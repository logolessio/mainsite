import { z } from 'zod'
import { audit } from '@/lib/chain'
import { db, nowSec } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

const schema = z.object({ id: z.string().regex(/^[a-z0-9-]{2,40}$/), done: z.boolean() })

/** Ticks a launch-checklist item that only a person can confirm (like "Google app is published"). */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-launch', max: 120, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 512))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const d = await db()
  await d
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(`launch:${parsed.data.id}`, parsed.data.done ? '1' : '0', nowSec())
    .run()
  await audit({ id: admin.id, email: admin.email }, parsed.data.done ? 'launch.tick' : 'launch.untick', parsed.data.id)
  return json({ ok: true })
})
