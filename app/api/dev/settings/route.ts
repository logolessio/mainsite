import { z } from 'zod'
import { audit } from '@/lib/chain'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { SETTING_DEFAULTS, setSetting, type SettingKey } from '@/lib/settings'
import { FONT_IDS } from '@/lib/fonts'
import { requireDev } from '@/lib/user'

const KEYS = Object.keys(SETTING_DEFAULTS).filter((k) => (k === 'bg_dots' || k.startsWith('design_')) && k !== 'design_font') as [SettingKey, ...SettingKey[]]
const schema = z.union([z.object({ key: z.enum(KEYS), value: z.enum(['0', '1']) }), z.object({ key: z.literal('design_font'), value: z.enum(FONT_IDS) })])

/** The look of the site: every design switch on the dev dashboard saves through here. */
export const POST = route(async (req: Request) => {
  const dev = await requireDev()
  await protect(req, { name: 'dev-settings', max: 60, windowSec: 600, userId: dev.id })
  const parsed = schema.safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, 'That switch is not valid.')
  await setSetting(parsed.data.key, parsed.data.value)
  await audit({ id: dev.id, email: dev.email }, 'design.change', parsed.data.key, parsed.data.value, await ipHash(req))
  return json({ ok: true })
})
