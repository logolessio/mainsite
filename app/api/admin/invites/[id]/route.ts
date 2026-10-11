import { z } from 'zod'
import { audit } from '@/lib/chain'
import { db } from '@/lib/db'
import { inviteEmail, sendEmail } from '@/lib/email'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { inviteUrl } from '@/lib/invite-shared'
import { inviteById } from '@/lib/invites'
import { requireAdmin } from '@/lib/user'
import { nowSec } from '@/lib/db'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('revoke') }),
  z.object({ action: z.literal('restore') }),
  z.object({ action: z.literal('unclaim') }),
  z.object({ action: z.literal('delete') }),
  z.object({ action: z.literal('email'), to: z.string().trim().toLowerCase().email().max(120).optional() }),
  z.object({
    action: z.literal('edit'),
    artistName: z.string().trim().min(2).max(60).optional(),
    email: z.string().trim().toLowerCase().email().max(120).nullable().optional().or(z.literal('')),
    lock: z.boolean().optional(),
    note: z.string().trim().max(500).nullable().optional(),
  }),
])

export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-invite-act', max: 80, windowSec: 600, userId: admin.id })
  const { id } = await params
  const parsed = schema.safeParse(await body(req, 4096))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const a = parsed.data
  const inv = await inviteById(id)
  if (!inv) throw new HttpError(404, 'Invite not found.')
  const d = await db()
  const actor = { id: admin.id, email: admin.email }
  const ip = await ipHash(req)

  switch (a.action) {
    case 'revoke':
      await d.prepare("UPDATE artist_invites SET status = 'revoked' WHERE id = ?1").bind(id).run()
      break
    case 'restore':
      if (inv.status !== 'revoked') throw new HttpError(409, 'That link is not switched off.')
      await d.prepare("UPDATE artist_invites SET status = ?2 WHERE id = ?1").bind(id, inv.user_id ? 'claimed' : 'sent').run()
      break
    case 'unclaim':
      // hands the link back so a different account can take it (for example if the wrong person signed in first)
      if (inv.campaign_id) throw new HttpError(409, 'A campaign was already made from this link, so it cannot be handed to someone else.')
      await d.prepare("UPDATE artist_invites SET user_id = NULL, status = 'sent', claimed_at = NULL, step = 0, data_json = '{}' WHERE id = ?1").bind(id).run()
      break
    case 'delete':
      if (inv.user_id || inv.campaign_id) throw new HttpError(409, 'This link has been used. Switch it off instead of deleting it.')
      await d.prepare('DELETE FROM artist_invites WHERE id = ?1').bind(id).run()
      break
    case 'email': {
      const to = a.to || inv.contact_email
      if (!to) throw new HttpError(400, 'Add an email address first.')
      if (inv.status === 'revoked') throw new HttpError(409, 'This link is switched off.')
      const mail = inviteEmail(inv.artist_name, inviteUrl(inv.slug))
      await sendEmail({ to, subject: mail.subject, html: mail.html, text: mail.text, template: 'invite' })
      await d.prepare('UPDATE artist_invites SET emailed_at = ?2 WHERE id = ?1').bind(id, nowSec()).run()
      break
    }
    case 'edit': {
      if (inv.user_id && (a.email !== undefined || a.lock !== undefined)) throw new HttpError(409, 'The link is already claimed, so its email lock cannot change.')
      await d
        .prepare(
          `UPDATE artist_invites SET artist_name = COALESCE(?2, artist_name),
             contact_email = CASE WHEN ?3 = 1 THEN ?4 ELSE contact_email END,
             email_lock = CASE WHEN ?7 = 1 THEN ?8 ELSE email_lock END,
             note = CASE WHEN ?5 = 1 THEN ?6 ELSE note END WHERE id = ?1`,
        )
        .bind(id, a.artistName ?? null, a.email !== undefined ? 1 : 0, a.email || null, a.note !== undefined ? 1 : 0, a.note || null, a.lock !== undefined ? 1 : 0, a.lock ? 1 : 0)
        .run()
      break
    }
  }
  await audit(actor, `invite.${a.action}`, inv.slug, inv.artist_name, ip)
  return json({ ok: true })
})
