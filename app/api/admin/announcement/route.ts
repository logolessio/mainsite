import { z } from 'zod'
import { audit } from '@/lib/chain'
import { getAnnouncement, setAnnouncement } from '@/lib/announcement'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

const schema = z.object({
  text: z.string().trim().max(140),
  // only a path on this site or an https address
  href: z.string().trim().max(200).refine((v) => v === '' || /^\/(?!\/)[\w\-./?=&%#]*$/.test(v) || /^https:\/\/[^\s]+$/.test(v), 'Use a page on this site (like /campaign/red-room) or an https link.'),
})

export const GET = route(async () => {
  await requireAdmin()
  return json({ announcement: (await getAnnouncement()) ?? { text: '', href: '' } })
})

/** The text of the bar across the top of the site. Empty text switches it off. */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-announcement', max: 30, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 2048))
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'That is not valid.')
  await setAnnouncement(parsed.data)
  await audit({ id: admin.id, email: admin.email }, 'announcement.set', null, parsed.data.text || '(cleared)')
  return json({ ok: true })
})
