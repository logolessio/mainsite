import { auditSafe } from '@/lib/chain'
import { campaignRow } from '@/lib/campaigns-db'
import { db, nowSec } from '@/lib/db'
import { protect } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { balances, startNeeded } from '@/lib/ledger'
import { notify, notifyAdmins } from '@/lib/notify'
import { announceCampaign } from '@/lib/discord/outbound'
import { requireUser } from '@/lib/user'

/**
 * Starts an approved campaign. Nothing is paid here: a brand has one balance and clippers are paid out of it as they earn,
 * so the only check is that the balance can cover the first stretch. (The path is still /pay because older pages call it.)
 */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'campaign-start', max: 20, windowSec: 3600, userId: user.id })
  const { id } = await params
  const c = await campaignRow(id)
  if (!c || c.brand_user_id !== user.id) throw new HttpError(404, 'Campaign not found.')
  if (c.status !== 'awaiting_payment') throw new HttpError(409, c.status === 'requested' ? 'We are still reviewing this request.' : 'This campaign does not need starting.')

  const need = startNeeded(c.budget_cents)
  const have = (await balances(user.id)).brand
  if (have < need) throw new HttpError(402, `Add $${(Math.max(0, need - have) / 100).toFixed(2)} or more to your balance first. Add funds, then start it.`)

  const d = await db()
  const t = nowSec()
  const res = await d.prepare("UPDATE campaigns SET status = 'live', launched_at = ?2, paid_at = ?2, updated_at = ?2 WHERE id = ?1 AND status = 'awaiting_payment'").bind(id, t).run()
  if (res.meta.changes !== 1) throw new HttpError(409, 'This campaign was just changed. Refresh and try again.')
  await auditSafe({ id: user.id, email: user.email }, 'campaign.started', c.id, `balance $${(have / 100).toFixed(2)}`)
  await notify(user.id, { kind: 'campaign', title: `${c.title} is live`, body: 'Clippers can see it and start posting. You only pay for approved views.', href: `/campaign/${id}`, dedupe: `camp-live:${id}` })
  await announceCampaign(id)
  await notifyAdmins({ title: `${c.title} started`, body: 'The brand started an approved campaign.', href: '/admin/campaigns', dedupe: `camp-live:${id}` })
  return json({ ok: true })
})
