import { z } from 'zod'
import { dashState, OPTIONAL_PAGES, setPageHidden } from '@/lib/dashboard-state'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/** The optional pages someone can take out of their dashboard sidebar (and put back). */
export const GET = route(async () => {
  const user = await requireUser()
  const [state, discord] = await Promise.all([dashState(user.id), featureOn('discord-page')])
  return json({ pages: discord ? [{ id: 'discord', label: 'Discord', shown: !state.hidden.includes('discord') }] : [] })
})

const schema = z.object({ page: z.enum(OPTIONAL_PAGES), shown: z.boolean() })

export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'sidebar', max: 30, windowSec: 60, userId: user.id })
  const parsed = schema.safeParse(await body(req, 256))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  if (parsed.data.page === 'discord' && !(await featureOn('discord-page'))) throw new HttpError(404, 'Not found.')
  const hidden = await setPageHidden(user.id, parsed.data.page, !parsed.data.shown)
  return json({ ok: true, hidden })
})
