import { z } from 'zod'
import { evaluateBadges } from './badges'
import { campaignRow } from './campaigns-db'
import { shortDate } from './campaign-input'
import { audit, type Actor } from './chain'
import { db, nowSec, uid } from './db'
import { announceCampaign } from './discord/outbound'
import { HttpError } from './http'
import { balances, budgetLeft, costFor, creditEarning, releasePool, startNeeded } from './ledger'
import { notify, notifyFavoriters } from './notify'
import { closeTicket, postTeamReply } from './discord/tickets'
import { clean as cleanText, getInquiry, saveInquiry } from './inquiries'
import { dmUser } from './discord-bot'
import { sendEmail } from './email'
import { plainMessageEmail } from './email-templates'
import { shoutout } from './discord/outbound'

export const campaignActionSchema = z.discriminatedUnion('action', [
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
export type CampaignAction = z.infer<typeof campaignActionSchema>

/** What an admin can decide about a campaign. Used by the admin pages and by the API. Every decision is written to the audit log. */
export async function campaignAction(actor: Actor, ip: string | null, id: string, a: CampaignAction) {
  const c = await campaignRow(id)
  if (!c) throw new HttpError(404, 'Campaign not found.')
  const d = await db()
  const t = nowSec()
  const set = (status: string, note?: string | null) =>
    d.prepare('UPDATE campaigns SET status = ?2, admin_note = COALESCE(?3, admin_note), updated_at = ?4 WHERE id = ?1').bind(id, status, note ?? null, t).run()

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
}

export const clipActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), views: z.number().int().min(0).max(2_000_000_000).optional() }),
  z.object({ action: z.literal('reject'), reason: z.string().trim().min(3).max(200) }),
  z.object({ action: z.literal('views'), views: z.number().int().min(0).max(2_000_000_000) }),
])
export type ClipAction = z.infer<typeof clipActionSchema>

type Sub = { id: string; campaign_id: string; user_id: string; status: string; views_verified: number; earned_cents: number }

/** What an admin can decide about a clip. Setting verified views pays the clipper the difference since last time, out of the brand's balance. */
export async function clipAction(actor: Actor, ip: string | null, id: string, a: ClipAction): Promise<{ paid: { gross: number; net: number } | null }> {
  const d = await db()
  const s = await d.prepare('SELECT id, campaign_id, user_id, status, views_verified, earned_cents FROM submissions WHERE id = ?1').bind(id).first<Sub>()
  if (!s) throw new HttpError(404, 'Clip not found.')
  const camp = await d.prepare('SELECT id, title, rate_cents, budget_cents, status FROM campaigns WHERE id = ?1').bind(s.campaign_id).first<{ id: string; title: string; rate_cents: number; budget_cents: number; status: string }>()
  if (!camp) throw new HttpError(404, 'Campaign not found.')
  const t = nowSec()
  let paid: { gross: number; net: number } | null = null

  if (a.action === 'reject') {
    if (s.views_verified > 0) throw new HttpError(409, 'This clip has already been paid for. It cannot be rejected now.')
    await d.prepare("UPDATE submissions SET status='rejected', reject_reason=?2, reviewed_by=?3, reviewed_at=?4 WHERE id=?1").bind(id, a.reason, actor.email, t).run()
    await notify(s.user_id, { kind: 'submission', title: `A clip was not approved (${camp.title})`, body: a.reason, href: '/dashboard/submissions', dedupe: `sub-rejected:${id}` })
    await audit(actor, 'submission.reject', id, a.reason, ip)
    return { paid: null }
  }

  if (s.status === 'rejected') throw new HttpError(409, 'This clip was rejected. It cannot be approved or paid.')
  if (s.status === 'pending') {
    await d.prepare("UPDATE submissions SET status='approved', reviewed_by=?2, reviewed_at=?3 WHERE id=?1").bind(id, actor.email, t).run()
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
  return { paid }
}

// ---------- conversations and messages (also used by the API) ----------

/** The team answers an inbox conversation (and, for a Discord ticket, in its channel). */
export async function inquiryReply(actor: Actor, id: string, text: string, close: boolean, name = 'The team') {
  const inq = await getInquiry(id)
  if (!inq) throw new HttpError(404, 'Conversation not found.')
  inq.replies.push({ by: 'admin', text: cleanText(text, 4000), at: nowSec() })
  inq.status = close ? 'closed' : 'open'
  inq.adminSeen = true
  await saveInquiry(inq)
  await audit(actor, 'inquiry.reply', inq.id, close ? 'replied and closed' : 'replied')
  if (inq.userId) await notify(inq.userId, { kind: 'account', title: `We replied: ${inq.subject}`.slice(0, 120), body: text.slice(0, 200), href: `/inquiry/${inq.id}`, dedupe: `inq-reply-user:${inq.id}:${inq.replies.length}` })
  if (inq.discord) {
    await postTeamReply(inq, cleanText(text, 3800), name)
    if (close) await closeTicket(inq, 'the team')
  }
  return inq
}

/** Tell one person something: a notification, and optionally an email and a Discord message. */
export async function messageUser(actor: Actor, ip: string | null, userId: string, m: { title: string; text: string; href?: string; email?: boolean }) {
  const d = await db()
  const u = await d.prepare('SELECT u.id, u.email, u.name, p.display_name FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?1').bind(userId).first<{ id: string; email: string; name: string | null; display_name: string | null }>()
  if (!u || u.email.endsWith('@deleted.invalid')) throw new HttpError(404, 'Account not found.')
  if (m.href && !/^\/(?!\/)[\w\-./?=&%#]*$/.test(m.href) && !/^https:\/\/[^\s]+$/.test(m.href)) throw new HttpError(400, 'The link must be a page on this site or an https address.')
  await notify(userId, { kind: 'account', title: m.title, body: m.text, href: m.href, dedupe: `admin-msg:${userId}:${nowSec()}:${uid().slice(0, 6)}` })
  let emailed = false
  if (m.email) {
    try {
      const mail = plainMessageEmail(u.display_name ?? u.name ?? '', m.title, m.text, m.href)
      await sendEmail({ to: u.email, subject: mail.subject, html: mail.html, text: mail.text, template: 'admin message' })
      emailed = true
    } catch {
      emailed = false
    }
  }
  const discord = await dmUser(userId, `**${m.title}**${m.text ? `\n${m.text}` : ''}`)
  await audit(actor, 'user.message', u.email, m.title, ip)
  return { emailed, discord }
}
