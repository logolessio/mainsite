import { z } from 'zod'
import { decide, isPlatform } from '@/lib/bio-verify'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

const schema = z.object({ userId: z.string().regex(/^[0-9a-f-]{8,40}$/i), platform: z.string(), action: z.enum(['approve', 'decline', 'remove']) })

/** The team decides a bio check that was handed to them (or takes a verification away). */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-bio', max: 60, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 1024))
  if (!parsed.success || !isPlatform(parsed.data.platform)) throw new HttpError(400, 'That is not valid.')
  const r = await decide({ id: admin.id, email: admin.email }, parsed.data.userId, parsed.data.platform, parsed.data.action)
  if (!r.ok) throw new HttpError(400, r.error)
  return json({ ok: true })
})
