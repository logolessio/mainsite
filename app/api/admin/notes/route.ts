import { z } from 'zod'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { getSetting, setSetting } from '@/lib/settings'
import { requireAdmin } from '@/lib/user'

/** The owner's private notepad on the overview. One shared text for the admin team, kept in settings. */
export const GET = route(async () => {
  await requireAdmin()
  return json({ text: await getSetting('owner_notes') })
})

const schema = z.object({ text: z.string().max(4000) })

export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-notes', max: 120, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 8192))
  if (!parsed.success) throw new HttpError(400, 'That note is too long.')
  await setSetting('owner_notes', parsed.data.text)
  return json({ ok: true })
})
