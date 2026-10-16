import { z } from 'zod'
import { changeFeatures } from '@/lib/feature-admin'
import { featureList } from '@/lib/feature-admin'
import { featureState } from '@/lib/features'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireStaff } from '@/lib/user'

const schema = z.object({ action: z.enum(['push', 'undo']), ids: z.array(z.string()).min(1).max(40) })

/** What can be pushed, what is live, and the history. */
export const GET = route(async () => {
  await requireStaff()
  const s = await featureState()
  return json({ ...(await featureList()), dev: s.dev })
})

/** Push features to the live site, or take them off again. Takes effect immediately. */
export const POST = route(async (req: Request) => {
  const admin = await requireStaff()
  await protect(req, { name: 'admin-features', max: 40, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 4096))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  return json({ ok: true, ...(await changeFeatures({ id: admin.id, email: admin.email }, parsed.data.action, parsed.data.ids, await ipHash(req))) })
})
