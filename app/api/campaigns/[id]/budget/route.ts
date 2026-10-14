import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { campaignRow } from '@/lib/campaigns-db'
import { db, nowSec } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { campaignSpent } from '@/lib/ledger'
import { SITE } from '@/lib/site'
import { requireUser } from '@/lib/user'

const schema = z.object({ budget: z.number().int().min(SITE.minCampaignBudgetUsd).max(SITE.maxTopUpUsd * 10) })

/** Changes how much a campaign may pay out in total (its cap). No money moves: the cap only limits what it can spend from the balance. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'campaign-budget', max: 60, windowSec: 600, userId: user.id })
  const { id } = await params
  const parsed = schema.safeParse(await body(req, 256))
  if (!parsed.success) throw new HttpError(400, `Pick a budget of at least $${SITE.minCampaignBudgetUsd}.`)
  const c = await campaignRow(id)
  if (!c || c.brand_user_id !== user.id) throw new HttpError(404, 'Campaign not found.')
  if (c.status === 'rejected') throw new HttpError(409, 'This campaign was not accepted.')
  const cents = parsed.data.budget * 100
  const spent = (await campaignSpent(id)).net
  if (cents < spent) throw new HttpError(409, `$${(spent / 100).toFixed(2)} has already been paid out, so the budget cannot go below that.`)
  const d = await db()
  await d.prepare("UPDATE campaigns SET budget_cents = ?2, status = CASE WHEN status = 'ended' AND ?2 > ?3 THEN 'paused' ELSE status END, updated_at = ?4 WHERE id = ?1").bind(id, cents, spent, nowSec()).run()
  await auditSafe({ id: user.id, email: user.email }, 'campaign.budget', id, `$${parsed.data.budget}`)
  return json({ ok: true })
})
