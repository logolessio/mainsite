import { z } from 'zod'
import { db, nowSec } from '@/lib/db'
import { body, json, route } from '@/lib/http'
import { copyKey, norm } from '@/lib/copy-key'
import { protect } from '@/lib/guard'
import { requireAdmin } from '@/lib/user'

const schema = z.object({ items: z.array(z.object({ key: z.string().regex(/^c_[0-9a-f]{16}$/), original: z.string().min(1).max(2000), page: z.string().max(200) })).max(200) })

/** The editor tells us which pieces of text it has met, so the "all text" list can show them. Keys must match the text. */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'content-register', max: 120, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 256 * 1024))
  if (!parsed.success) return json({ ok: true })
  const d = await db()
  const t = nowSec()
  const stmts = parsed.data.items
    .filter((i) => copyKey(i.original) === i.key)
    .map((i) =>
      d
        .prepare('INSERT INTO content_registry (key, original, page, seen_at) VALUES (?1,?2,?3,?4) ON CONFLICT(key) DO UPDATE SET seen_at = excluded.seen_at')
        .bind(i.key, norm(i.original), i.page, t),
    )
  if (stmts.length) await d.batch(stmts)
  return json({ ok: true })
})
