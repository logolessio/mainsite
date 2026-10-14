import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { campaignRow } from '@/lib/campaigns-db'
import { db, nowSec } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { balances, startNeeded } from '@/lib/ledger'
import { requireUser } from '@/lib/user'

const schema = z.object({ action: z.enum(['pause', 'resume']) })

/** A brand pauses or restarts its own campaign. A campaign an admin paused stays paused until an admin lifts it. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'campaign-control', max: 60, windowSec: 600, userId: user.id })
  const { id } = await params
  const parsed = schema.safeParse(await body(req, 256))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const c = await campaignRow(id)
  if (!c || c.brand_user_id !== user.id) throw new HttpError(404, 'Campaign not found.')
  const d = await db()
  const t = nowSec()
  const by = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(`paused-by:${id}`).first<{ value: string }>()

  if (parsed.data.action === 'pause') {
    if (c.status !== 'live') throw new HttpError(409, 'Only a running campaign can be paused.')
    await d.prepare("UPDATE campaigns SET status = 'paused', updated_at = ?2 WHERE id = ?1 AND status = 'live'").bind(id, t).run()
    await d.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?1, 'brand', ?2) ON CONFLICT(key) DO UPDATE SET value = 'brand', updated_at = excluded.updated_at").bind(`paused-by:${id}`, t).run()
    await auditSafe({ id: user.id, email: user.email }, 'campaign.paused', id, 'by brand')
    return json({ ok: true })
  }
  if (c.status !== 'paused') throw new HttpError(409, 'Only a paused campaign can be started again.')
  if (by?.value !== 'brand' && by?.value !== 'balance') throw new HttpError(403, 'We paused this campaign. Contact us to start it again.')
  const have = (await balances(user.id)).brand
  if (have < startNeeded(c.budget_cents)) throw new HttpError(402, 'Add funds to your balance first, then start it again.')
  await d.prepare("UPDATE campaigns SET status = 'live', updated_at = ?2 WHERE id = ?1 AND status = 'paused'").bind(id, t).run()
  await d.prepare('DELETE FROM settings WHERE key = ?1').bind(`paused-by:${id}`).run()
  await auditSafe({ id: user.id, email: user.email }, 'campaign.resumed', id, 'by brand')
  return json({ ok: true })
})
