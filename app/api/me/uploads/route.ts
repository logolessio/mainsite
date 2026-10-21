import { db } from '@/lib/db'
import { HttpError, json, route } from '@/lib/http'
import { headDimensions } from '@/lib/upload'
import { requireUser } from '@/lib/user'

/** The person's recent uploads of one kind (newest first), so a recent banner can be put back with one click. */
export const GET = route(async (req: Request) => {
  const user = await requireUser()
  const kind = new URL(req.url).searchParams.get('kind') ?? ''
  if (!['banner', 'background', 'avatar', 'bgvideo'].includes(kind)) throw new HttpError(400, 'Unknown upload type.')
  const d = await db()
  // only the first bytes of each picture are read, enough for its size
  const rows = (
    await d
      .prepare('SELECT id, mime, created_at, substr(data, 1, 64) AS head FROM uploads WHERE user_id = ?1 AND kind = ?2 ORDER BY created_at DESC LIMIT 12')
      .bind(user.id, kind)
      .all<{ id: string; mime: string; created_at: number; head: string }>()
  ).results
  return json({
    uploads: rows.map((r) => {
      const dim = r.mime.startsWith('image/') ? headDimensions(r.head, r.mime) : null
      return { id: r.id, mime: r.mime, at: r.created_at, aspect: dim ? Math.round((dim.h / dim.w) * 1000) / 1000 : null }
    }),
  })
})
