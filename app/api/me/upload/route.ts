import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { fromBase64, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, storeImage, storeVideo } from '@/lib/upload'
import { requireUser } from '@/lib/user'

const IMAGE_KINDS = ['avatar', 'banner', 'cover', 'background'] as const

/**
 * Image upload for avatars, banners, profile backgrounds and campaign covers, plus short looping background videos.
 * The browser re-encodes pictures first (which strips hidden data), and the server then checks the real file type,
 * size and dimensions before storing it.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'upload', max: 12, windowSec: 600, userId: user.id })
  const { kind, data } = await body<{ kind?: string; data?: string }>(req, Math.ceil(MAX_VIDEO_BYTES * 1.4))
  if (typeof data !== 'string') throw new HttpError(400, 'That file could not be read.')
  if (kind === 'bgvideo') return json({ id: await storeVideo(user.id, fromBase64(data)) })
  if (!IMAGE_KINDS.includes(kind as (typeof IMAGE_KINDS)[number])) throw new HttpError(400, 'Unknown upload type.')
  if (data.length > MAX_IMAGE_BYTES * 1.5) throw new HttpError(413, 'That image is too large. Please pick a smaller one.')
  return json({ id: await storeImage(user.id, kind as (typeof IMAGE_KINDS)[number], fromBase64(data)) })
})
