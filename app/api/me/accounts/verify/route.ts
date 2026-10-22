import { z } from 'zod'
import { askTeam, check, isPlatform, lookup, start, statesFor } from '@/lib/bio-verify'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/** How each linked account stands: verified, waiting for the code to be put in the bio, waiting for the team, or not started. */
export const GET = route(async () => {
  const user = await requireUser()
  return json({ accounts: await statesFor(user.id) })
})

const schema = z.object({ action: z.enum(['start', 'check', 'ask', 'lookup']), platform: z.string() })

/** Look the account up, get a code, check the bio for it, or ask the team to check by hand. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'bio-verify', max: 40, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 512))
  if (!parsed.success || !isPlatform(parsed.data.platform)) throw new HttpError(400, 'Pick TikTok, YouTube or Instagram.')
  const { action, platform } = parsed.data

  if (action === 'lookup') return json({ lookup: await lookup(user.id, platform) })
  if (action === 'start') {
    const r = await start(user.id, platform)
    if (!r.ok) throw new HttpError(400, r.error)
    return json({ account: r.state })
  }
  if (action === 'ask') {
    const r = await askTeam(user.id, user.email, platform)
    if (!r.ok) throw new HttpError(400, r.error)
    return json({ ok: true, accounts: await statesFor(user.id) })
  }
  const r = await check(user.id, user.email, platform)
  return json({ result: r, accounts: await statesFor(user.id) })
})
