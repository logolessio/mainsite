import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { campaignRow } from '@/lib/campaigns-db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { releasePool } from '@/lib/ledger'
import { requireUser } from '@/lib/user'

const schema = z.object({ id: z.string().min(2).max(80) })

/** Older campaigns were funded into their own pool. This returns what is left of it to the balance, where any campaign can use it. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'campaign-release', max: 20, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 256))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const c = await campaignRow(parsed.data.id)
  if (!c || c.brand_user_id !== user.id) throw new HttpError(404, 'Campaign not found.')
  const moved = await releasePool(user.id, c.id)
  if (moved <= 0) throw new HttpError(409, 'There is nothing left in this campaign to return.')
  await auditSafe({ id: user.id, email: user.email }, 'campaign.pool_release', c.id, `$${(moved / 100).toFixed(2)}`)
  return json({ ok: true, moved })
})
