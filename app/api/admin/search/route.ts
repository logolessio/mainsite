import { db } from '@/lib/db'
import { protect } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

export type OwnerHit = { kind: 'person' | 'campaign'; id: string; label: string; sub: string; href: string }

/** The owner search box: a few people and campaigns that match what was typed. Admins only; reads only. */
export const GET = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-search', max: 120, windowSec: 300, userId: admin.id })
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 60)
  if (q.length < 2) throw new HttpError(400, 'Type at least two letters.')
  const like = `%${q.replace(/[%_\\]/g, (m) => `\\${m}`)}%`
  const d = await db()
  const [people, camps] = await Promise.all([
    d
      .prepare(
        `SELECT u.id, u.email, p.handle, p.display_name FROM users u LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.email LIKE ?1 ESCAPE '\\' OR p.handle LIKE ?1 ESCAPE '\\' OR p.display_name LIKE ?1 ESCAPE '\\' ORDER BY u.last_seen_at DESC LIMIT 5`,
      )
      .bind(like)
      .all<{ id: string; email: string; handle: string | null; display_name: string | null }>(),
    d
      .prepare(`SELECT id, title, creator, status FROM campaigns WHERE title LIKE ?1 ESCAPE '\\' OR creator LIKE ?1 ESCAPE '\\' ORDER BY updated_at DESC LIMIT 5`)
      .bind(like)
      .all<{ id: string; title: string; creator: string; status: string }>(),
  ])
  const hits: OwnerHit[] = [
    ...people.results.map((p) => ({ kind: 'person' as const, id: p.id, label: p.display_name || p.email.split('@')[0], sub: `${p.handle ? `@${p.handle} · ` : ''}${p.email}`, href: `/admin/people/${p.id}` })),
    ...camps.results.map((c) => ({ kind: 'campaign' as const, id: c.id, label: c.title, sub: `${c.creator} · ${c.status.replace('_', ' ')}`, href: `/admin/campaigns` })),
  ]
  return json({ hits })
})
