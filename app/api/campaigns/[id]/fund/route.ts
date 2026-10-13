import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { campaignRow } from '@/lib/campaigns-db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { balances, costFor, fundFromBalance } from '@/lib/ledger'
import { notify, notifyAdmins } from '@/lib/notify'
import { SITE } from '@/lib/site'
import { requireUser } from '@/lib/user'

const MIN_ADD = 25
const schema = z.object({ amount: z.number().int().min(MIN_ADD).max(SITE.maxTopUpUsd) })

/** The brand adds more money for clippers to a campaign that is already running, from their balance. The fee is charged on top. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'campaign-fund', max: 12, windowSec: 3600, userId: user.id })
  const { id } = await params
  const parsed = schema.safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, `Pick an amount between $${MIN_ADD} and $${SITE.maxTopUpUsd.toLocaleString()}.`)
  const c = await campaignRow(id)
  if (!c || c.brand_user_id !== user.id) throw new HttpError(404, 'Campaign not found.')
  if (!['paid', 'live', 'paused'].includes(c.status)) throw new HttpError(409, c.status === 'awaiting_payment' ? 'Pay the campaign budget first.' : 'This campaign cannot take more funds right now.')

  const cents = parsed.data.amount * 100
  const paid = await fundFromBalance(user.id, c.id, cents, 'topup')
  if (!paid) {
    const need = costFor(cents) - (await balances(user.id)).brand
    throw new HttpError(402, `Your balance is $${(Math.max(0, need) / 100).toFixed(2)} short of the $${(costFor(cents) / 100).toFixed(2)} this costs. Add funds first.`)
  }
  await auditSafe({ id: user.id, email: user.email }, 'campaign.topup', c.id, `$${parsed.data.amount} + fee`)
  await notify(user.id, { kind: 'campaign', title: `$${parsed.data.amount.toLocaleString()} more for ${c.title}`, body: 'The new funds are available to pay clippers right away.', href: '/brand/billing', dedupe: `camp-topup:${c.id}:${Date.now()}` })
  await notifyAdmins({ title: `${c.title} was topped up`, body: `$${parsed.data.amount.toLocaleString()} added for clippers.`, href: '/admin/campaigns', dedupe: `camp-topup:${c.id}:${Date.now()}` })
  return json({ ok: true, cost: paid.cost })
})
