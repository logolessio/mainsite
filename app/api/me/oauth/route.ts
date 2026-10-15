import { z } from 'zod'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { grantsOf, requireDevelopers, revokeGrant } from '@/lib/oauth'
import { requireUser } from '@/lib/user'

/** The apps this person has signed in to with logoless. */
export const GET = route(async () => {
  await requireDevelopers()
  const user = await requireUser()
  return json({ apps: await grantsOf(user.id) })
})

const schema = z.object({ clientId: z.string().regex(/^lg_[0-9a-f]{20}$/) })

/** Disconnect an app: its tokens stop working straight away. */
export const POST = route(async (req: Request) => {
  await requireDevelopers()
  const user = await requireUser()
  await protect(req, { name: 'oauth-revoke-grant', max: 30, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 512))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  await revokeGrant(user.id, parsed.data.clientId)
  return json({ ok: true })
})
