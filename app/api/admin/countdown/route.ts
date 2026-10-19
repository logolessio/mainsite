import { z } from 'zod'
import { audit } from '@/lib/chain'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { launchView, signupCounts } from '@/lib/launch'
import { allSettings, setSetting } from '@/lib/settings'
import { requireAdmin } from '@/lib/user'

const schema = z.object({
  on: z.boolean().optional(),
  auto: z.boolean().optional(),
  end: z.number().int().min(0).max(4_102_444_800).nullable().optional(), // seconds since 1970; null clears it
  headline: z.string().trim().min(1).max(90).optional(),
  text: z.string().trim().max(240).optional(),
})

export const GET = route(async () => {
  await requireAdmin()
  const s = await allSettings()
  return json({ view: launchView(s), counts: await signupCounts() })
})

/** The owner sets the countdown and switches the launch page on or off. Every change is written to the audit log. */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-countdown', max: 60, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 2048))
  if (!parsed.success) throw new HttpError(400, 'That is not valid.')
  const p = parsed.data
  const ip = await ipHash(req)
  const note = async (what: string, value: string) => audit({ id: admin.id, email: admin.email }, 'launch.change', what, value, ip)
  if (p.on !== undefined) (await setSetting('launch_on', p.on ? '1' : '0'), await note('launch_on', p.on ? 'on' : 'off'))
  if (p.auto !== undefined) (await setSetting('launch_auto', p.auto ? '1' : '0'), await note('launch_auto', p.auto ? 'on' : 'off'))
  if (p.end !== undefined) (await setSetting('launch_end', p.end ? String(p.end) : ''), await note('launch_end', p.end ? new Date(p.end * 1000).toISOString() : 'cleared'))
  if (p.headline !== undefined) (await setSetting('launch_headline', p.headline), await note('launch_headline', p.headline))
  if (p.text !== undefined) (await setSetting('launch_text', p.text), await note('launch_text', p.text.slice(0, 60)))
  return json({ ok: true, view: launchView(await allSettings()) })
})
