import { z } from 'zod'
import { CONTACT_PREFS, contactPref, isContactPref, setContactPref } from '@/lib/contact-pref'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/** How this person wants to be told about things that matter: their choice, and the choices there are. */
export const GET = route(async () => {
  const user = await requireUser()
  return json({ pref: await contactPref(user.id), options: CONTACT_PREFS })
})

const schema = z.object({ pref: z.string() })

export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'contact-pref', max: 30, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 256))
  if (!parsed.success || !isContactPref(parsed.data.pref)) throw new HttpError(400, 'Pick one of the choices.')
  await setContactPref(user.id, parsed.data.pref)
  return json({ ok: true })
})
