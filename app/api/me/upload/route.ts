import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { fromBase64, MAX_IMAGE_BYTES, storeImage } from '@/lib/upload'
import { requireUser } from '@/lib/user'

const IMAGE_KINDS = ['avatar', 'banner', 'cover', 'background', 'cursor'] as const

/**
 * Still pictures for avatars, banners, profile backgrounds, covers and cursors. The browser re-encodes them first (which strips hidden data), and the server
 * then checks the real file type, size and dimensions before storing them. GIFs, videos and songs go through /api/me/media instead, in pieces.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'upload', max: 24, windowSec: 600, userId: user.id })
  const { kind, data } = await body<{ kind?: string; data?: string }>(req, Math.ceil(MAX_IMAGE_BYTES * 1.4))
  if (typeof data !== 'string') throw new HttpError(400, 'That file could not be read.')
  if (!IMAGE_KINDS.includes(kind as (typeof IMAGE_KINDS)[number])) throw new HttpError(400, 'Unknown upload type.')
  return json({ id: await storeImage(user.id, kind as (typeof IMAGE_KINDS)[number], fromBase64(data)) })
})
