import { z } from 'zod'
import { audit } from '@/lib/chain'
import { db, nowSec } from '@/lib/db'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { reverseWithdrawal } from '@/lib/ledger'
import { notify } from '@/lib/notify'
import { sendPayout } from '@/lib/payout'
import { requireAdminSecret } from '@/lib/admin-secret'
import { requireAdmin } from '@/lib/user'

const schema = z.discriminatedUnion('action', [z.object({ action: z.literal('approve'), secret: z.string().max(200).optional() }), z.object({ action: z.literal('reject'), note: z.string().trim().min(3).max(200) })])

/** A withdrawal that was held for review: send it, or give the money back to the clipper. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-payout', max: 60, windowSec: 600, userId: admin.id })
  const { id } = await params
  const parsed = schema.safeParse(await body(req))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const d = await db()
  const p = await d.prepare('SELECT user_id, amount_cents, status FROM payouts WHERE id = ?1').bind(id).first<{ user_id: string; amount_cents: number; status: string }>()
  if (!p) throw new HttpError(404, 'Payout not found.')
  if (p.status !== 'review') throw new HttpError(409, 'That withdrawal is not waiting for review.')
  const actor = { id: admin.id, email: admin.email }
  const ip = await ipHash(req)
  // sending money out needs the admin password every time, checked here and not only by the button that asks for it
  if (parsed.data.action === 'approve') await requireAdminSecret(admin.id, parsed.data.secret)

  if (parsed.data.action === 'reject') {
    await reverseWithdrawal(id, 'failed', `Declined: ${parsed.data.note}`)
    await notify(p.user_id, { kind: 'payout', title: 'Your withdrawal was not approved', body: `${parsed.data.note} Your balance is unchanged.`, href: '/dashboard/earnings#withdraw', dedupe: `payout-declined:${id}` })
    await audit(actor, 'payout.reject', id, parsed.data.note, ip)
    return json({ ok: true })
  }
  await d.prepare('UPDATE payouts SET reviewed_by = ?2, updated_at = ?3 WHERE id = ?1').bind(id, admin.email, nowSec()).run()
  const res = await sendPayout(id)
  await audit(actor, res.ok ? 'payout.approve' : 'payout.approve_failed', id, res.ok ? `$${(p.amount_cents / 100).toFixed(2)}` : res.error, ip)
  if (!res.ok) throw new HttpError(502, res.error)
  return json({ ok: true })
})
