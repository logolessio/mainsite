import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { fromBase64, MAX_IMAGE_BYTES, storeImage } from '@/lib/upload'
import { requireUser } from '@/lib/user'

/**
 * Image upload for avatars, banners and campaign covers. The browser re-encodes the picture first (which strips hidden
 * data), and the server then checks the real file type, size and dimensions before storing it.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'upload', max: 12, windowSec: 600, userId: user.id })
  const { kind, data } = await body<{ kind?: string; data?: string }>(req, MAX_IMAGE_BYTES * 1.5)
  if (kind !== 'avatar' && kind !== 'banner' && kind !== 'cover' && kind !== 'background') throw new HttpError(400, 'Unknown upload type.')
  if (typeof data !== 'string') throw new HttpError(400, 'That file could not be read.')
  return json({ id: await storeImage(user.id, kind, fromBase64(data)) })
})
