import { audit } from '@/lib/chain'
import { db, nowSec } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { assertCanChangeHandle, freeAlternatives, handleQuota, recordHandleChange } from '@/lib/handle-changes'
import { body, HttpError, json, route } from '@/lib/http'
import { reservedByAnother } from '@/lib/launch'
import { ensureProfile, validHandle } from '@/lib/profile'
import { RESERVED_WORDS, HANDLE_RE, HANDLE_RESERVED_MSG, handleProblem } from '@/lib/profile-style'
import { requireUser } from '@/lib/user'

/**
 * Is this username free, and how many changes are left this week? Used live while someone is choosing one (also during onboarding).
 * Without ?h= it only answers the second question. A username that is taken comes back with a few nearby ones that are free.
 */
export const GET = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'handle-check', max: 60, windowSec: 60, userId: user.id })
  const isAdmin = user.role === 'admin'
  const quota = await handleQuota(user.id, isAdmin)
  const raw = new URL(req.url).searchParams.get('h')
  if (raw === null) return json({ quota })
  const h = raw.trim().toLowerCase().replace(/^@/, '')
  const loose = await featureOn('username-punctuation')
  if (loose) {
    // dots and dashes are allowed, and reserved words are found through punctuation; the answer says why, so the field can too
    const problem = handleProblem(h, { loose: true, isAdmin })
    if (problem) return json({ available: false, reason: problem === HANDLE_RESERVED_MSG ? 'reserved' : 'invalid', message: problem, quota })
  } else {
    if (!HANDLE_RE.test(h)) return json({ available: false, reason: 'invalid', message: handleProblem(h, { isAdmin }), quota })
    if (!isAdmin && RESERVED_WORDS.some((w) => h.includes(w))) return json({ available: false, reason: 'reserved', message: HANDLE_RESERVED_MSG, quota })
  }
  const d = await db()
  const row = await d.prepare('SELECT user_id FROM profiles WHERE handle = ?1').bind(h).first<{ user_id: string }>()
  if (row && row.user_id === user.id) return json({ available: true, same: true, quota })
  if (row) {
    const suggestions = (await freeAlternatives(h, loose)).filter((s) => !handleProblem(s, { loose, isAdmin }))
    return json({ available: false, reason: 'taken', message: `@${h} is already taken.`, suggestions, quota })
  }
  // a username somebody reserved on the waitlist is theirs when the site opens
  if (await reservedByAnother(h, user.email)) return json({ available: false, reason: 'reserved-waitlist', message: 'That username was reserved on the waitlist.', quota })
  return json({ available: true, quota })
})

/** Changes the username right now (it does not wait for the profile's Save): checked again here, counted, and written to the log. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'handle-change', max: 20, windowSec: 600, userId: user.id })
  const isAdmin = user.role === 'admin'
  const { handle } = await body<{ handle?: string }>(req)
  if (typeof handle !== 'string') throw new HttpError(400, 'Choose a username.')
  const next = validHandle(handle, isAdmin, await featureOn('username-punctuation'))
  const cur = await ensureProfile(user)
  if (next === cur.handle) return json({ handle: next, previous: cur.handle, quota: await handleQuota(user.id, isAdmin) })
  if (await reservedByAnother(next, user.email)) throw new HttpError(409, 'That username was reserved by someone on the waitlist.')
  await assertCanChangeHandle(user.id, isAdmin)
  const d = await db()
  try {
    await d.prepare('UPDATE profiles SET handle = ?2, updated_at = ?3 WHERE user_id = ?1').bind(user.id, next, nowSec()).run()
  } catch (e) {
    if (/UNIQUE/i.test(e instanceof Error ? e.message : '')) throw new HttpError(409, `@${next} was just taken. Pick another.`)
    throw e
  }
  await recordHandleChange(user.id, cur.handle, next)
  await audit({ id: user.id, email: user.email }, 'profile.handle', user.id, `@${cur.handle} to @${next}`)
  return json({ handle: next, previous: cur.handle, quota: await handleQuota(user.id, isAdmin) })
})
