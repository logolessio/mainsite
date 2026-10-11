import { db, nowSec } from '@/lib/db'
import { body, json, route } from '@/lib/http'
import { protect } from '@/lib/guard'
import { requireUser } from '@/lib/user'

type Row = { id: string; kind: string; title: string; body: string; href: string | null; read_at: number | null; created_at: number }

/** The signed-in person's own notifications, newest first. `?since=<seconds>` returns only newer ones, `?limit=1` just the latest. */
export const GET = route(async (req: Request) => {
  const user = await requireUser()
  const d = await db()
  const url = new URL(req.url)
  const since = Number(url.searchParams.get('since') ?? 0)
  const limit = Math.min(80, Math.max(1, Number(url.searchParams.get('limit') ?? 80) || 80))
  const items = (
    await d
      .prepare('SELECT id, kind, title, body, href, read_at, created_at FROM notifications WHERE user_id = ?1 AND created_at > ?2 ORDER BY created_at DESC LIMIT ?3')
      .bind(user.id, Number.isFinite(since) ? since : 0, limit)
      .all<Row>()
  ).results
  const unread = await d.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?1 AND read_at IS NULL').bind(user.id).first<{ n: number }>()
  return json({ items, unread: unread?.n ?? 0 })
})

/** Marks notifications as read: one id, or everything. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'notif', max: 60, windowSec: 60, userId: user.id })
  const { id } = await body<{ id?: string }>(req)
  const d = await db()
  if (id) await d.prepare('UPDATE notifications SET read_at = ?3 WHERE id = ?1 AND user_id = ?2 AND read_at IS NULL').bind(id, user.id, nowSec()).run()
  else await d.prepare('UPDATE notifications SET read_at = ?2 WHERE user_id = ?1 AND read_at IS NULL').bind(user.id, nowSec()).run()
  return json({ ok: true })
})

/** Removes one notification (send its id) or clears the whole list. */
export const DELETE = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'notif', max: 60, windowSec: 60, userId: user.id })
  const { id } = await body<{ id?: string }>(req).catch(() => ({}) as { id?: string })
  const d = await db()
  if (id) await d.prepare('DELETE FROM notifications WHERE id = ?1 AND user_id = ?2').bind(id, user.id).run()
  else await d.prepare('DELETE FROM notifications WHERE user_id = ?1').bind(user.id).run()
  return json({ ok: true })
})
