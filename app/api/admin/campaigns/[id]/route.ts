import { z } from 'zod'
import { audit } from '@/lib/chain'
import { campaignRow } from '@/lib/campaigns-db'
import { shortDate } from '@/lib/campaign-input'
import { db, nowSec } from '@/lib/db'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { notify, notifyFavoriters } from '@/lib/notify'
import { evaluateBadges } from '@/lib/badges'
import { balances, costFor, releasePool, startNeeded } from '@/lib/ledger'
import { announceCampaign } from '@/lib/discord/outbound'
import { requireAdmin } from '@/lib/user'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('accept'), note: z.string().max(300).optional() }),
  z.object({ action: z.literal('reject'), note: z.string().min(3).max(300) }),
  z.object({ action: z.literal('launch') }),
  z.object({ action: z.literal('pause'), note: z.string().max(300).optional() }),
  z.object({ action: z.literal('resume') }),
  z.object({ action: z.literal('end'), note: z.string().max(300).optional() }),
  z.object({ action: z.literal('delete') }),
  z.object({
    action: z.literal('edit'),
    title: z.string().trim().min(2).max(60).optional(),
    creator: z.string().trim().min(2).max(60).optional(),
    summary: z.string().trim().min(10).max(1500).optional(),
    rate: z.number().min(0.5).max(50).optional(),
    endsOn: z.string().max(20).nullable().optional(),
    cover: z.string().max(200).optional(),
    previewUrl: z.string().max(200).nullable().optional(),
  }),
])

/** Admin decisions on a campaign. Every one is written to the tamper-evident audit log. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-campaign', max: 60, windowSec: 600, userId: admin.id })
  const { id } = await params
  const parsed = schema.safeParse(await body(req))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const a = parsed.data
  const c = await campaignRow(id)
  if (!c) throw new HttpError(404, 'Campaign not found.')
  const d = await db()
  const t = nowSec()
  const set = (status: string, note?: string | null) =>
    d.prepare('UPDATE campaigns SET status = ?2, admin_note = COALESCE(?3, admin_note), updated_at = ?4 WHERE id = ?1').bind(id, status, note ?? null, t).run()
  const actor = { id: admin.id, email: admin.email }
  const ip = await ipHash(req)

  switch (a.action) {
    case 'accept': {
      if (c.status !== 'requested') throw new HttpError(409, 'Only new requests can be accepted.')
      if (!c.brand_user_id) throw new HttpError(409, 'This campaign has no owner to bill.')
      // One balance pays for every campaign as clippers earn. If it already covers the start, the campaign simply goes live.
      const covered = (await balances(c.brand_user_id)).brand >= startNeeded(c.budget_cents)
      if (covered) {
        await d.prepare("UPDATE campaigns SET status = 'live', admin_note = COALESCE(?2, admin_note), launched_at = ?3, paid_at = ?3, updated_at = ?3 WHERE id = ?1").bind(id, a.note ?? null, t).run()
        await notify(c.brand_user_id, { kind: 'campaign', title: `${c.title} is live`, body: 'We approved it and your balance covers it, so clippers can start posting now.', href: `/campaign/${id}`, dedupe: `camp-live:${id}` })
        await evaluateBadges(c.brand_user_id)
        await announceCampaign(id)
      } else {
        await set('awaiting_payment', a.note ?? null)
        await notify(c.brand_user_id, { kind: 'campaign', title: `${c.title} is approved`, body: `Add at least $${(startNeeded(c.budget_cents) / 100).toLocaleString()} to your balance and press start. You only pay as clippers earn.`, href: '/brand/balance', dedupe: `camp-accepted:${id}` })
      }
      break
    }
    case 'reject': {
      if (!['requested', 'awaiting_payment'].includes(c.status)) throw new HttpError(409, 'That campaign cannot be rejected now.')
      await set('rejected', a.note)
      if (c.brand_user_id) await notify(c.brand_user_id, { kind: 'campaign', title: `${c.title} was not accepted`, body: a.note, href: '/brand/campaigns', dedupe: `camp-rejected:${id}` })
      break
    }
    case 'launch': {
      // Only a paid campaign can go live: the funds must be in its pool.
      if (c.status !== 'paid') throw new HttpError(409, c.status === 'live' ? 'It is already live.' : 'A campaign can only launch after the artist has paid.')
      const pool = await d.prepare("SELECT COALESCE(SUM(amount_cents),0) AS p FROM ledger WHERE account = 'campaign' AND campaign_id = ?1").bind(id).first<{ p: number }>()
      if ((pool?.p ?? 0) < costFor(c.budget_cents)) throw new HttpError(409, 'The campaign pool does not match its budget. Check the payment in PayPal.')
      await d.prepare("UPDATE campaigns SET status = 'live', launched_at = ?2, updated_at = ?2 WHERE id = ?1").bind(id, t).run()
      if (c.brand_user_id) {
        await notify(c.brand_user_id, { kind: 'campaign', title: `${c.title} is live`, body: 'Clippers can see it and start posting.', href: `/campaign/${id}`, dedupe: `camp-live:${id}` })
        await evaluateBadges(c.brand_user_id)
        await announceCampaign(id)
      }
      break
    }
    case 'pause': {
      if (c.status !== 'live') throw new HttpError(409, 'Only live campaigns can be paused.')
      await set('paused', a.note ?? null)
      await d.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?1, 'admin', ?2) ON CONFLICT(key) DO UPDATE SET value = 'admin', updated_at = excluded.updated_at").bind(`paused-by:${id}`, t).run()
      await notifyFavoriters(id, { title: `${c.title} is paused`, body: 'It is not taking new clips for now.', dedupe: `camp-paused:${id}:${t}` })
      if (c.brand_user_id) await notify(c.brand_user_id, { kind: 'campaign', title: `${c.title} was paused`, body: a.note, href: '/brand/campaigns', dedupe: `camp-paused-owner:${id}:${t}` })
      break
    }
    case 'resume': {
      if (c.status !== 'paused') throw new HttpError(409, 'Only paused campaigns can resume.')
      await set('live')
      await d.prepare('DELETE FROM settings WHERE key = ?1').bind(`paused-by:${id}`).run()
      await notifyFavoriters(id, { title: `${c.title} is back`, body: 'It is taking clips again.', dedupe: `camp-resumed:${id}:${t}` })
      break
    }
    case 'end': {
      if (!['live', 'paused'].includes(c.status)) throw new HttpError(409, 'Only live or paused campaigns can end.')
      await set('ended', a.note ?? null)
      // an older campaign that was funded into its own pool: what is left goes back to the brand's balance
      const back = c.brand_user_id ? await releasePool(c.brand_user_id, id) : 0
      await notifyFavoriters(id, { title: `${c.title} has ended`, body: 'It is no longer taking clips.', dedupe: `camp-ended:${id}` })
      if (c.brand_user_id) await notify(c.brand_user_id, { kind: 'campaign', title: `${c.title} has ended`, body: back > 0 ? `$${(back / 100).toFixed(2)} that was not spent went back to your balance.` : 'Nothing more will be spent on it. Your balance is untouched.', href: '/brand/campaigns', dedupe: `camp-ended-owner:${id}` })
      break
    }
    case 'delete': {
      // Only things that never held money can be deleted, so the books always balance.
      const touched = await d.prepare('SELECT (SELECT COUNT(*) FROM ledger WHERE campaign_id = ?1) + (SELECT COUNT(*) FROM submissions WHERE campaign_id = ?1) AS n').bind(id).first<{ n: number }>()
      if ((touched?.n ?? 0) > 0) throw new HttpError(409, 'This campaign has money or clips attached. End it instead of deleting it.')
      await d.prepare('DELETE FROM favorites WHERE campaign_id = ?1').bind(id).run()
      await d.prepare('DELETE FROM campaigns WHERE id = ?1').bind(id).run()
      break
    }
    case 'edit': {
      const next = {
        title: a.title ?? c.title,
        creator: a.creator ?? c.creator,
        summary: a.summary ?? c.summary,
        rate_cents: a.rate !== undefined ? Math.round(a.rate * 100) : c.rate_cents,
        ends_on: a.endsOn !== undefined ? (a.endsOn ? shortDate(a.endsOn) : null) : c.ends_on,
        cover_url: a.cover ?? c.cover_url,
        preview_url: a.previewUrl !== undefined ? a.previewUrl : c.preview_url,
      }
      if (!/^(\/[A-Za-z0-9._\/-]+|https:\/\/[^\s]+)$/.test(next.cover_url)) throw new HttpError(400, 'The cover must be a site path or an https address.')
      await d
        .prepare('UPDATE campaigns SET title=?2, creator=?3, summary=?4, rate_cents=?5, ends_on=?6, cover_url=?7, preview_url=?8, updated_at=?9 WHERE id = ?1')
        .bind(id, next.title, next.creator, next.summary, next.rate_cents, next.ends_on, next.cover_url, next.preview_url, t)
        .run()
      break
    }
  }
  await audit(actor, `campaign.${a.action}`, id, c.title, ip)
  return json({ ok: true })
})
