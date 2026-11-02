import { limit } from '@/lib/guard'
import { db } from '@/lib/db'
import { json, route } from '@/lib/http'
import { handleProblem, HANDLE_RESERVED_MSG } from '@/lib/profile-style'
import { bioHandleReserved } from '@/lib/bio-reserved'
import { reservedByAnother } from '@/lib/launch'

/** Is this name free? Open to everyone (it is what the home page asks as you type), so it is rate limited and tells nothing about who has a name. */
export const GET = route(async (req: Request) => {
  await limit(req, { name: 'bio-check', max: 90, windowSec: 60 })
  const h = (new URL(req.url).searchParams.get('h') ?? '').trim().toLowerCase().replace(/^@/, '')
  const problem = handleProblem(h, { loose: true })
  if (problem) return json({ available: false, reason: problem === HANDLE_RESERVED_MSG ? 'reserved' : 'invalid', message: problem })
  if (bioHandleReserved(h)) return json({ available: false, reason: 'reserved', message: HANDLE_RESERVED_MSG })
  const taken = await (await db()).prepare('SELECT 1 AS x FROM profiles WHERE handle = ?1').bind(h).first()
  if (taken) return json({ available: false, reason: 'taken', message: 'That name is taken.' })
  // a name somebody reserved on the waitlist is theirs
  if (await reservedByAnother(h, '')) return json({ available: false, reason: 'reserved', message: 'That name is held for someone.' })
  return json({ available: true })
})
