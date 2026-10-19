import { z } from 'zod'
import { audit } from '@/lib/chain'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { SETTING_DEFAULTS, setSetting, type SettingKey } from '@/lib/settings'
import { CHOICES, CHOICE_KEYS } from '@/lib/design-choices'
import { FACE_IDS, FONT_IDS, ROLE_SETTING_KEYS } from '@/lib/fonts'
import { ROUND_MAX, ROUND_MIN } from '@/lib/roundness'
import { requireStaff } from '@/lib/user'

const KEYS = Object.keys(SETTING_DEFAULTS).filter((k) => (k === 'bg_dots' || k.startsWith('design_')) && k !== 'design_font' && k !== 'design_roundness' && !(CHOICE_KEYS as string[]).includes(k) && !(ROLE_SETTING_KEYS as string[]).includes(k)) as [SettingKey, ...SettingKey[]]
const schema = z.union([
  z.object({ key: z.enum(KEYS), value: z.enum(['0', '1']) }),
  z.object({ key: z.literal('design_font'), value: z.enum(FONT_IDS) }),
  // one typeface for each job (headlines, body...); empty means follow the preset
  z.object({ key: z.enum(ROLE_SETTING_KEYS as [SettingKey, ...SettingKey[]]), value: z.union([z.literal(''), z.enum(FACE_IDS)]) }),
  // the pick-from-a-list choices (cover text, layout): each key has its own short list of values
  z.object({ key: z.enum(CHOICE_KEYS), value: z.string().max(40) }).refine((v) => CHOICES[v.key].includes(v.value)),
  z.object({ key: z.literal('design_roundness'), value: z.string().regex(/^\d{1,3}$/).refine((v) => Number(v) >= ROUND_MIN && Number(v) <= ROUND_MAX) }),
])

/** The look of the site: every design switch under Site, Design saves through here. */
export const POST = route(async (req: Request) => {
  const dev = await requireStaff()
  await protect(req, { name: 'dev-settings', max: 60, windowSec: 600, userId: dev.id })
  const parsed = schema.safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, 'That switch is not valid.')
  await setSetting(parsed.data.key, parsed.data.value)
  // the picker replaces the older "Geist Mono as the main font" switch, so choosing a font clears it
  if (parsed.data.key === 'design_font') await setSetting('design_font_mono', '0')
  await audit({ id: dev.id, email: dev.email }, 'design.change', parsed.data.key, parsed.data.value, await ipHash(req))
  return json({ ok: true })
})
