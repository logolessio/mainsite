import { z } from 'zod'
import { markGuideSeen } from '@/lib/client-guide'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

const schema = z.object({ key: z.enum(['tour', 'first-submission']) })

/** Remembers that a client has seen the dashboard walkthrough or the first-submission guide, so it never comes back on its own. */
export const POST = route(async (req: Request) => {
  if (!(await featureOn('client-tour'))) throw new HttpError(404, 'Not found.')
  const user = await requireUser()
  await protect(req, { name: 'guide-seen', max: 30, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 256))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  await markGuideSeen(user.id, parsed.data.key)
  return json({ ok: true })
})
