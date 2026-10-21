import { z } from 'zod'
import { audit } from '@/lib/chain'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { getPage, launchView, savePage } from '@/lib/launch'
import { cleanPage } from '@/lib/launch-page'
import { allSettings, setSetting } from '@/lib/settings'
import { requireAdmin } from '@/lib/user'

const schema = z.object({
  headline: z.string().trim().min(1).max(90),
  text: z.string().trim().max(240),
  end: z.number().int().min(0).max(4_102_444_800).nullable(), // seconds since 1970; null clears the countdown
  page: z.unknown(),
})

/** What the owner's editor on the page starts from. */
export const GET = route(async () => {
  await requireAdmin()
  const v = launchView(await allSettings())
  return json({ headline: v.headline, text: v.text, end: v.end, page: await getPage() })
})

/**
 * Saves the owner's edits to the coming-soon and links page. The headline, the line under it and the countdown are the same settings the
 * Launch page in the admin dashboard edits; the rest (button labels, background, effect, accent) is one JSON row. Every change is audited.
 */
export const PUT = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'launch-page', max: 60, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 16 * 1024))
  if (!parsed.success) throw new HttpError(400, 'Some of that is not valid. Check the headline and the countdown.')
  const p = parsed.data
  const actor = { id: admin.id, email: admin.email }
  const ip = await ipHash(req)
  const before = launchView(await allSettings())
  const headline = p.headline.replace(/\s+/g, ' ')
  const text = p.text.replace(/\s+/g, ' ')
  if (headline !== before.headline) (await setSetting('launch_headline', headline), await audit(actor, 'launch.change', 'launch_headline', headline, ip))
  if (text !== before.text) (await setSetting('launch_text', text), await audit(actor, 'launch.change', 'launch_text', text.slice(0, 60), ip))
  if (p.end !== before.end) (await setSetting('launch_end', p.end ? String(p.end) : ''), await audit(actor, 'launch.change', 'launch_end', p.end ? new Date(p.end * 1000).toISOString() : 'cleared', ip))
  const page = cleanPage(p.page)
  await savePage(page)
  await audit(actor, 'launch.page', 'save', `${page.look.bg}/${page.look.effect}/${page.look.accent}`, ip)
  return json({ ok: true, headline, text, end: p.end, page })
})
