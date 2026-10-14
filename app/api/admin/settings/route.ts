import { z } from 'zod'
import { requireAdminSecret } from '@/lib/admin-secret'
import { audit } from '@/lib/chain'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { SETTING_DEFAULTS, setSetting, type SettingKey } from '@/lib/settings'
import { requireAdmin } from '@/lib/user'

const schema = z.object({ key: z.enum(Object.keys(SETTING_DEFAULTS) as [SettingKey, ...SettingKey[]]), value: z.string().regex(/^\d{1,9}$/), secret: z.string().max(200).optional() })

/** Switches that stop money or sign-ups for everyone, and the money limits: these need the admin password. */
const GUARDED = (key: string) => key.endsWith('_paused') || key === 'daily_payout_cap_cents' || key === 'review_over_cents'

export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-settings', max: 40, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 2048))
  if (!parsed.success) throw new HttpError(400, 'That value is not valid.')
  const { key, value } = parsed.data
  if (GUARDED(key)) await requireAdminSecret(admin.id, parsed.data.secret)
  const isFlag = key.endsWith('_paused') || key === 'bg_dots' || key.startsWith('design_')
  if (isFlag && value !== '0' && value !== '1') throw new HttpError(400, 'That switch is on or off.')
  await setSetting(key, value)
  await audit({ id: admin.id, email: admin.email }, 'setting.change', key, value, await ipHash(req))
  return json({ ok: true })
})
