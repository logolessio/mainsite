import { z } from 'zod'
import { audit } from '@/lib/chain'
import { FEATURE_IDS, FEATURES } from '@/lib/feature-defs'
import { featureState, pushLog, readLive, setLive } from '@/lib/features'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

const schema = z.object({ action: z.enum(['push', 'undo']), ids: z.array(z.string()).min(1).max(40) })

/** What can be pushed, what is live, and the history. */
export const GET = route(async () => {
  await requireAdmin()
  const s = await featureState()
  return json({ features: FEATURES.map((f) => ({ ...f, live: s.live[f.id] === true })), log: await pushLog(), dev: s.dev })
})

/** Push features to the live site, or take them off again. Takes effect immediately. */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-features', max: 40, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 4096))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const ids = [...new Set(parsed.data.ids)]
  if (ids.some((id) => !FEATURE_IDS.includes(id))) throw new HttpError(400, 'Unknown feature.')
  await setLive(ids, parsed.data.action === 'push', admin.email)
  await audit({ id: admin.id, email: admin.email }, `feature.${parsed.data.action}`, ids.join(','), null, await ipHash(req))
  const live = await readLive()
  return json({ ok: true, features: FEATURES.map((f) => ({ ...f, live: live[f.id] === true })), log: await pushLog() })
})
