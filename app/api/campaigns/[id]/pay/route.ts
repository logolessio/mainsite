import { auditSafe } from '@/lib/chain'
import { campaignRow } from '@/lib/campaigns-db'
import { protect } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { balances, costFor, fundFromBalance } from '@/lib/ledger'
import { notify, notifyAdmins } from '@/lib/notify'
import { requireUser } from '@/lib/user'

/**
 * The brand pays for an accepted campaign from their balance: the budget for clippers plus our 15% fee on top. The amount comes
 * from our database, never from the browser. If the balance is short, nothing happens and they are told how much to add.
 */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'campaign-pay', max: 10, windowSec: 3600, userId: user.id })
  const { id } = await params
  const c = await campaignRow(id)
  if (!c || c.brand_user_id !== user.id) throw new HttpError(404, 'Campaign not found.')
  if (c.status !== 'awaiting_payment') throw new HttpError(409, c.status === 'requested' ? 'We are still reviewing this request.' : 'This campaign does not need a payment.')

  const paid = await fundFromBalance(user.id, c.id, c.budget_cents, 'launch')
  if (!paid) {
    const need = costFor(c.budget_cents) - (await balances(user.id)).brand
    throw new HttpError(402, `Your balance is $${(Math.max(0, need) / 100).toFixed(2)} short of the $${(costFor(c.budget_cents) / 100).toFixed(2)} this campaign costs. Add funds first.`)
  }
  await auditSafe({ id: user.id, email: user.email }, 'campaign.paid', c.id, `$${(paid.cost / 100).toFixed(2)} (fee $${(paid.fee / 100).toFixed(2)})`)
  await notify(user.id, { kind: 'campaign', title: `${c.title} is paid for`, body: 'We will launch your campaign shortly.', href: '/brand/campaigns', dedupe: `camp-paid:${c.id}` })
  await notifyAdmins({ title: `Paid: ${c.title} is ready to launch`, body: `$${(paid.cost / 100).toFixed(2)} received.`, href: '/admin/campaigns', dedupe: `camp-paid:${c.id}` })
  return json({ ok: true, cost: paid.cost })
})
