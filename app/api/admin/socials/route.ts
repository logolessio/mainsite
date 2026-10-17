import { audit } from '@/lib/chain'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { cleanLinks, DEFAULT_LINKS } from '@/lib/socials'
import { getLinks, resetLinks, saveLinks } from '@/lib/socials-db'
import { requireAdmin } from '@/lib/user'

/** The links and socials list, for the editor. */
export const GET = route(async () => {
  await requireAdmin()
  return json({ links: await getLinks() })
})

/** Saves the whole list (the order is the order shown). A reset puts the built-in list back. */
export const PUT = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-socials', max: 30, windowSec: 600, userId: admin.id })
  const input = await body<{ links?: unknown; reset?: boolean }>(req, 16 * 1024)
  const actor = { id: admin.id, email: admin.email }
  if (input.reset === true) {
    await resetLinks()
    await audit(actor, 'site.links', 'reset', null, await ipHash(req))
    return json({ links: DEFAULT_LINKS })
  }
  const c = cleanLinks(input.links)
  if (!c.ok) throw new HttpError(400, c.error)
  await saveLinks(c.links)
  await audit(actor, 'site.links', 'save', `${c.links.length} links`, await ipHash(req))
  return json({ links: c.links })
})
