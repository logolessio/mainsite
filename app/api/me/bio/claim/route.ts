import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { handleQuota } from '@/lib/handle-changes'
import { ensureProfile, saveProfile } from '@/lib/profile'
import { requireUser } from '@/lib/user'

/**
 * The name picked before signing up (logoless.io/<name>) becomes the username, the first time, for free: this is not counted as a change. After that
 * it is changed like any other (twice a week). If the name was taken in the meantime the account keeps the username it was given.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'bio-claim', max: 20, windowSec: 600, userId: user.id })
  const { handle } = await body<{ handle?: string }>(req)
  if (typeof handle !== 'string' || !handle.trim()) throw new HttpError(400, 'Choose a name.')
  const cur = await ensureProfile(user)
  const want = handle.trim().toLowerCase().replace(/^@/, '')
  if (want === cur.handle) return json({ handle: cur.handle, claimed: true })
  const q = await handleQuota(user.id, user.role === 'admin')
  if (q.last) throw new HttpError(409, 'This account already has its name. Change it in the editor.')
  try {
    const { profile } = await saveProfile(user, { handle: want }, { firstHandle: true })
    return json({ handle: profile.handle, claimed: true })
  } catch (e) {
    if (e instanceof HttpError) return json({ handle: cur.handle, claimed: false, message: e.message })
    if (/UNIQUE/i.test(e instanceof Error ? e.message : '')) return json({ handle: cur.handle, claimed: false, message: `${want} was just taken.` })
    throw e
  }
})
