import { safeEqual } from '@/lib/crypto'
import { setting } from '@/lib/db'
import { limit } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { pendingEdits } from '@/lib/text-pending'

/**
 * The edited sentences that are waiting to be written into the code. Only the scheduled GitHub job asks for this, with the shared
 * secret TEXT_SYNC_SECRET (set in Cloudflare and in the repository's secrets). Without the secret the address does not exist.
 */
export const GET = route(async (req: Request) => {
  const secret = await setting('TEXT_SYNC_SECRET')
  if (!secret) throw new HttpError(404, 'Not found.')
  await limit(req, { name: 'text-sync', max: 120, windowSec: 3600 })
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!given || !safeEqual(given, secret)) throw new HttpError(401, 'Not allowed.')
  return json({ edits: await pendingEdits() }, 200)
})
