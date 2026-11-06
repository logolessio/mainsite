import { db } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, json, route } from '@/lib/http'
import { USER_QUOTA_BYTES, removeUpload, storageUsed, sweepChunks } from '@/lib/quota'
import { inUse } from '@/lib/upload'
import { requireUser } from '@/lib/user'

/**
 * How much of their 50 MB a person has used, and on what. With `?list=1`, every file one by one, with whether the page uses it (the Storage manager).
 * DELETE clears files: `{ ids }` those ones, `{ unused: true }` every picture, video, cursor and song nothing uses; `{ stats: true }` resets the view and
 * click counters. A file in use is never deleted, nor one the editor says it still needs (`keep`: on the page but not saved yet). Hosted files are only
 * deleted one by one, never by "clear unused" (a link anywhere may point to one).
 */
const CLEARABLE = ['avatar', 'banner', 'cover', 'background', 'bgvideo', 'cursor', 'audio']
const UPLOAD = /^[0-9a-f-]{36}$/

async function summary(userId: string) {
  const used = await storageUsed(userId)
  const k = (...kinds: string[]) => kinds.reduce((a, x) => ({ n: a.n + (used.byKind[x]?.n ?? 0), bytes: a.bytes + (used.byKind[x]?.bytes ?? 0) }), { n: 0, bytes: 0 })
  return { quotaBytes: USER_QUOTA_BYTES, usedBytes: used.bytes, parts: { files: k('file'), pictures: k('avatar', 'banner', 'background', 'cover'), videos: k('bgvideo'), cursors: k('cursor'), songs: k('audio') } }
}

async function list(userId: string) {
  const d = await db()
  const [rows, used, counters] = await Promise.all([
    d.prepare("SELECT id, kind, mime, size, created_at FROM uploads WHERE user_id = ?1 AND kind != 'chunk' ORDER BY created_at DESC").bind(userId).all<{ id: string; kind: string; mime: string; size: number; created_at: number }>(),
    inUse(userId).catch(() => [] as string[]),
    d.prepare('SELECT COUNT(*) AS n FROM settings WHERE key LIKE ?1 OR key LIKE ?2 OR key LIKE ?3').bind(`biov:${userId}:%`, `bioc:${userId}:%`, `biocd:${userId}:%`).first<{ n: number }>(),
  ])
  return { files: rows.results.map((r) => ({ id: r.id, kind: r.kind, mime: r.mime, size: r.size, at: r.created_at, used: used.includes(r.id) })), counters: counters?.n ?? 0 }
}

export const GET = route(async (req: Request) => {
  const user = await requireUser()
  if (new URL(req.url).searchParams.get('list')) return json({ ...(await summary(user.id)), ...(await list(user.id)) })
  return json(await summary(user.id))
})

export const DELETE = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'storage-clear', max: 40, windowSec: 600, userId: user.id })
  const input = await body<{ ids?: unknown; unused?: unknown; keep?: unknown; stats?: unknown }>(req)
  const keep = new Set([...(await inUse(user.id).catch(() => [] as string[])), ...(Array.isArray(input.keep) ? input.keep.filter((x): x is string => typeof x === 'string' && UPLOAD.test(x)) : [])])
  const { files } = await list(user.id)
  const asked = Array.isArray(input.ids) ? input.ids.filter((x): x is string => typeof x === 'string' && UPLOAD.test(x)) : []
  const targets = input.unused === true ? files.filter((f) => CLEARABLE.includes(f.kind) && !keep.has(f.id)) : files.filter((f) => asked.includes(f.id) && !keep.has(f.id))
  for (const f of targets) await removeUpload(f.id)
  await sweepChunks(user.id)
  if (input.stats === true) await (await db()).prepare('DELETE FROM settings WHERE key LIKE ?1 OR key LIKE ?2 OR key LIKE ?3').bind(`biov:${user.id}:%`, `bioc:${user.id}:%`, `biocd:${user.id}:%`).run()
  return json({ ...(await summary(user.id)), ...(await list(user.id)), deleted: targets.length, skipped: input.unused === true ? 0 : asked.length - targets.length })
})
