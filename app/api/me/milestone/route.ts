import { z } from 'zod'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { brandViews, markCelebrated, MILESTONES } from '@/lib/milestones'
import { requireUser } from '@/lib/user'

const schema = z.object({ milestone: z.number().int() })

/** The client has seen the celebration for a milestone. Saved on the server, so it shows once on any device. */
export const POST = route(async (req: Request) => {
  if (!(await featureOn('view-milestones'))) throw new HttpError(404, 'Not found.')
  const user = await requireUser()
  await protect(req, { name: 'milestone-seen', max: 30, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 256))
  const m = parsed.success ? parsed.data.milestone : 0
  if (!(MILESTONES as readonly number[]).includes(m)) throw new HttpError(400, 'That is not a milestone.')
  // only a milestone the views really passed can be marked, so nothing can be skipped ahead by hand
  if ((await brandViews(user.id)) < m) throw new HttpError(409, 'Not there yet.')
  await markCelebrated(user.id, m)
  return json({ ok: true })
})
