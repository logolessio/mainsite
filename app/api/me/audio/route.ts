import { MAX_AUDIO_BYTES, storeAudio } from '@/lib/audio'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { fromBase64 } from '@/lib/upload'
import { requireUser } from '@/lib/user'

/** A short audio preview for a campaign. The server reads the real file type from its first bytes before keeping it. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'upload-audio', max: 10, windowSec: 600, userId: user.id })
  const { data } = await body<{ data?: string }>(req, Math.ceil(MAX_AUDIO_BYTES * 1.4))
  if (typeof data !== 'string') throw new HttpError(400, 'That file could not be read.')
  return json({ id: await storeAudio(user.id, fromBase64(data)) })
})
