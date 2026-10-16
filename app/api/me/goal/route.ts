import { z } from 'zod'
import { earnedThisMonth, getGoal, setGoal } from '@/lib/earn-goal'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/** A creator's own monthly earnings goal and how far along they are. Only there while the feature is on. */
export const GET = route(async () => {
  if (!(await featureOn('earn-goal'))) throw new HttpError(404, 'Not found.')
  const user = await requireUser()
  const [goal, earned] = await Promise.all([getGoal(user.id), earnedThisMonth(user.id)])
  return json({ goal, earned })
})

const schema = z.object({ dollars: z.number().min(0).max(1_000_000).nullable() })

export const POST = route(async (req: Request) => {
  if (!(await featureOn('earn-goal'))) throw new HttpError(404, 'Not found.')
  const user = await requireUser()
  await protect(req, { name: 'earn-goal', max: 30, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 256))
  if (!parsed.success) throw new HttpError(400, 'Enter an amount in dollars.')
  const dollars = parsed.data.dollars
  await setGoal(user.id, dollars && dollars > 0 ? Math.round(dollars * 100) : null)
  return json({ ok: true })
})
