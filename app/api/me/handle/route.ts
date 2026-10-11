import { db } from '@/lib/db'
import { protect } from '@/lib/guard'
import { json, route } from '@/lib/http'
import { RESERVED_WORDS, HANDLE_RE } from '@/lib/profile-style'
import { requireUser } from '@/lib/user'

/** Is this username free? Used live while someone is choosing one. */
export const GET = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'handle-check', max: 60, windowSec: 60, userId: user.id })
  const h = (new URL(req.url).searchParams.get('h') ?? '').trim().toLowerCase().replace(/^@/, '')
  if (!HANDLE_RE.test(h)) return json({ available: false, reason: 'invalid' })
  if (user.role !== 'admin' && RESERVED_WORDS.some((w) => h.includes(w))) return json({ available: false, reason: 'reserved' })
  const d = await db()
  const row = await d.prepare('SELECT user_id FROM profiles WHERE handle = ?1').bind(h).first<{ user_id: string }>()
  return json({ available: !row || row.user_id === user.id })
})
