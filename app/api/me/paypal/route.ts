import { z } from 'zod'
import { db, nowSec } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

const key = (id: string) => `paypal:${id}`

/** The PayPal email a clipper wants to be paid at. */
export const GET = route(async () => {
  const user = await requireUser()
  const d = await db()
  const row = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(key(user.id)).first<{ value: string }>()
  return json({ email: row?.value ?? '' })
})

const schema = z.object({ email: z.string().trim().toLowerCase().email().max(254).or(z.literal('')) })

export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'paypal-email', max: 12, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, 'Enter a valid PayPal email address.')
  const d = await db()
  if (!parsed.data.email) await d.prepare('DELETE FROM settings WHERE key = ?1').bind(key(user.id)).run()
  else
    await d
      .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
      .bind(key(user.id), parsed.data.email, nowSec())
      .run()
  return json({ ok: true })
})
