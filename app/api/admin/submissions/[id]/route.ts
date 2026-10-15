import { z } from 'zod'
import { evaluateBadges } from '@/lib/badges'
import { audit } from '@/lib/chain'
import { db, nowSec } from '@/lib/db'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { budgetLeft, creditEarning } from '@/lib/ledger'
import { notify, notifyFavoriters } from '@/lib/notify'
import { shoutout } from '@/lib/discord/outbound'
import { requireAdmin } from '@/lib/user'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), views: z.number().int().min(0).max(2_000_000_000).optional() }),
  z.object({ action: z.literal('reject'), reason: z.string().trim().min(3).max(200) }),
  z.object({ action: z.literal('views'), views: z.number().int().min(0).max(2_000_000_000) }),
])

type Sub = { id: string; campaign_id: string; user_id: string; status: string; views_verified: number; earned_cents: number }

/** Admin decisions on a clip. Setting verified views pays the clipper the difference since last time, out of the campaign's pool. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-submission', max: 120, windowSec: 600, userId: admin.id })
  const { id } = await params
  const parsed = schema.safeParse(await body(req))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const a = parsed.data
  const d = await db()
  const s = await d.prepare('SELECT id, campaign_id, user_id, status, views_verified, earned_cents FROM submissions WHERE id = ?1').bind(id).first<Sub>()
  if (!s) throw new HttpError(404, 'Clip not found.')
  const camp = await d.prepare('SELECT id, title, rate_cents, budget_cents, status FROM campaigns WHERE id = ?1').bind(s.campaign_id).first<{ id: string; title: string; rate_cents: number; budget_cents: number; status: string }>()
  if (!camp) throw new HttpError(404, 'Campaign not found.')
  const actor = { id: admin.id, email: admin.email }
  const ip = await ipHash(req)
  const t = nowSec()
  let paid: { gross: number; net: number } | null = null

  if (a.action === 'reject') {
    if (s.views_verified > 0) throw new HttpError(409, 'This clip has already been paid for. It cannot be rejected now.')
    await d.prepare("UPDATE submissions SET status='rejected', reject_reason=?2, reviewed_by=?3, reviewed_at=?4 WHERE id=?1").bind(id, a.reason, admin.email, t).run()
    await notify(s.user_id, { kind: 'submission', title: `A clip was not approved (${camp.title})`, body: a.reason, href: '/dashboard/submissions', dedupe: `sub-rejected:${id}` })
    await audit(actor, 'submission.reject', id, a.reason, ip)
    return json({ ok: true })
  }

  if (s.status === 'rejected') throw new HttpError(409, 'This clip was rejected. It cannot be approved or paid.')
  if (s.status === 'pending') {
    await d.prepare("UPDATE submissions SET status='approved', reviewed_by=?2, reviewed_at=?3 WHERE id=?1").bind(id, admin.email, t).run()
    await notify(s.user_id, { kind: 'submission', title: `Clip approved (${camp.title})`, body: 'It is now earning.', href: '/dashboard/submissions', dedupe: `sub-approved:${id}` })
    await audit(actor, 'submission.approve', id, camp.title, ip)
  }

  const views = a.views
  if (views !== undefined) {
    if (views < s.views_verified) throw new HttpError(400, 'Verified views can only go up. Contact support to correct a mistake.')
    const delta = views - s.views_verified
    if (delta > 0) {
      const gross = Math.floor((delta * camp.rate_cents) / 1000) // what the clipper earns; the fee is charged to the brand on top
      // claim the new view count first (only if nobody else changed it), then pay; undo the claim if payment fails
      const claim = await d.prepare('UPDATE submissions SET views_verified = ?2 WHERE id = ?1 AND views_verified = ?3').bind(id, views, s.views_verified).run()
      if (claim.meta.changes !== 1) throw new HttpError(409, 'This clip was just updated. Refresh and try again.')
      if (gross > 0) {
        let res: Awaited<ReturnType<typeof creditEarning>>
        try {
          res = await creditEarning({ campaignId: camp.id, clipperId: s.user_id, payoutCents: gross, submissionId: id, note: `${delta} views` })
        } catch (e) {
          await d.prepare('UPDATE submissions SET views_verified = ?2 WHERE id = ?1').bind(id, s.views_verified).run()
          throw e
        }
        paid = { gross: res.gross, net: res.net }
        await shoutout(s.user_id, res.net, camp.title)
        await d.prepare('UPDATE submissions SET earned_cents = earned_cents + ?2 WHERE id = ?1').bind(id, res.net).run()
        await notify(s.user_id, {
          kind: 'earning',
          title: `You earned $${(res.net / 100).toFixed(2)} (${camp.title})`,
          body: `${views.toLocaleString()} verified views. It clears in a few days.`,
          href: '/dashboard/earnings',
          dedupe: `earn:${id}:${views}`,
        })
      }
      await audit(actor, 'submission.views', id, `${s.views_verified} → ${views}${paid ? ` · $${(paid.gross / 100).toFixed(2)} paid` : ''}`, ip)
      await evaluateBadges(s.user_id)

      // budget warnings for people who favourited the campaign
      const left = await budgetLeft(camp.id, camp.budget_cents)
      if (left <= 0) {
        await d.prepare("UPDATE campaigns SET status='ended', updated_at=?2 WHERE id=?1 AND status='live'").bind(camp.id, t).run()
        await notifyFavoriters(camp.id, { title: `${camp.title} has run out of budget`, body: 'It is no longer taking clips.', dedupe: `budget-out:${camp.id}` })
      } else if (left < camp.budget_cents * 0.2) {
        await notifyFavoriters(camp.id, { title: `${camp.title} is almost out of budget`, body: 'Less than 20% is left. Clip it soon.', dedupe: `budget-low:${camp.id}` })
      }
    }
  }
  return json({ ok: true, paid })
})
