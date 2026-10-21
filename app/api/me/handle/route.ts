import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { reservedByAnother } from '@/lib/launch'
import { json, route } from '@/lib/http'
import { RESERVED_WORDS, HANDLE_RE, HANDLE_RESERVED_MSG, handleProblem } from '@/lib/profile-style'
import { requireUser } from '@/lib/user'

/** Is this username free? Used live while someone is choosing one. */
export const GET = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'handle-check', max: 60, windowSec: 60, userId: user.id })
  const h = (new URL(req.url).searchParams.get('h') ?? '').trim().toLowerCase().replace(/^@/, '')
  if (await featureOn('username-punctuation')) {
    // dots and dashes are allowed, and reserved words are found through punctuation; the answer says why, so the field can too
    const problem = handleProblem(h, { loose: true, isAdmin: user.role === 'admin' })
    if (problem) return json({ available: false, reason: problem === HANDLE_RESERVED_MSG ? 'reserved' : 'invalid', message: problem })
  } else {
    if (!HANDLE_RE.test(h)) return json({ available: false, reason: 'invalid' })
    if (user.role !== 'admin' && RESERVED_WORDS.some((w) => h.includes(w))) return json({ available: false, reason: 'reserved' })
  }
  const d = await db()
  const row = await d.prepare('SELECT user_id FROM profiles WHERE handle = ?1').bind(h).first<{ user_id: string }>()
  if (row && row.user_id !== user.id) return json({ available: false })
  // a username somebody reserved on the waitlist is theirs when the site opens
  if (await reservedByAnother(h, user.email)) return json({ available: false, reason: 'reserved-waitlist', message: 'That username was reserved on the waitlist.' })
  return json({ available: true })
})
