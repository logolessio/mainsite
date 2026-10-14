import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { campaignRow } from '@/lib/campaigns-db'
import { db, nowSec } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { campaignSpent } from '@/lib/ledger'
import { SITE } from '@/lib/site'
import { requireUser } from '@/lib/user'

const schema = z.object({ from: z.string().min(2).max(80), to: z.string().min(2).max(80), amount: z.number().int().min(1).max(SITE.maxTopUpUsd * 10) })

/** Moves some of one campaign's budget to another. It is the same pot of money, so only the two caps change. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'campaign-transfer', max: 30, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 512))
  if (!parsed.success || parsed.data.from === parsed.data.to) throw new HttpError(400, 'Pick two different campaigns and an amount.')
  const [a, b] = await Promise.all([campaignRow(parsed.data.from), campaignRow(parsed.data.to)])
  if (!a || !b || a.brand_user_id !== user.id || b.brand_user_id !== user.id) throw new HttpError(404, 'Campaign not found.')
  const cents = parsed.data.amount * 100
  const spent = (await campaignSpent(a.id)).net
  const free = a.budget_cents - spent
  if (cents > free) throw new HttpError(409, `${a.title} has only $${(Math.max(0, free) / 100).toFixed(2)} of budget that is not spent yet.`)
  if (a.budget_cents - cents < SITE.minCampaignBudgetUsd * 100 && a.status !== 'ended') throw new HttpError(409, `A campaign needs a budget of at least $${SITE.minCampaignBudgetUsd}. Move less, or end it first.`)
  const d = await db()
  const t = nowSec()
  await d.batch([
    d.prepare('UPDATE campaigns SET budget_cents = budget_cents - ?2, updated_at = ?3 WHERE id = ?1').bind(a.id, cents, t),
    d.prepare("UPDATE campaigns SET budget_cents = budget_cents + ?2, status = CASE WHEN status = 'ended' THEN 'paused' ELSE status END, updated_at = ?3 WHERE id = ?1").bind(b.id, cents, t),
  ])
  await auditSafe({ id: user.id, email: user.email }, 'campaign.transfer', `${a.id}>${b.id}`, `$${parsed.data.amount}`)
  return json({ ok: true })
})
