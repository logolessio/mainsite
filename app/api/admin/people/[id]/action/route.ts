import { z } from 'zod'
import { requireAdminSecret } from '@/lib/admin-secret'
import { audit } from '@/lib/chain'
import { BADGE_BY_ID } from '@/lib/badges-defs'
import { db, nowSec, uid } from '@/lib/db'
import { dmUser } from '@/lib/discord-bot'
import { sendEmail } from '@/lib/email'
import { plainMessageEmail } from '@/lib/email-templates'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { balances } from '@/lib/ledger'
import { notify } from '@/lib/notify'
import { markVerified } from '@/lib/verification'
import { requireAdmin } from '@/lib/user'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('message'), title: z.string().trim().min(2).max(100), text: z.string().trim().max(240).default(''), href: z.string().trim().max(200).optional(), email: z.boolean().optional() }),
  z.object({ action: z.literal('verify') }),
  z.object({ action: z.literal('adjust'), account: z.enum(['brand', 'clipper']), amount: z.number().refine((n) => n !== 0 && Math.abs(n) <= 10_000, 'Between $0.01 and $10,000, positive or negative.'), note: z.string().trim().min(3).max(120), secret: z.string().max(200).optional() }),
  z.object({ action: z.literal('badge'), badge: z.string().max(40), on: z.boolean() }),
])

/** Things an admin can do to one person: tell them something, verify them, correct a balance, give or take a badge. All of it is audited. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-person', max: 60, windowSec: 600, userId: admin.id })
  const { id } = await params
  const parsed = schema.safeParse(await body(req, 4096))
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'That request is not valid.')
  const a = parsed.data
  const d = await db()
  const u = await d.prepare('SELECT u.id, u.email, u.name, p.display_name FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?1').bind(id).first<{ id: string; email: string; name: string | null; display_name: string | null }>()
  if (!u || u.email.endsWith('@deleted.invalid')) throw new HttpError(404, 'Account not found.')
  const actor = { id: admin.id, email: admin.email }
  const ip = await ipHash(req)
  const t = nowSec()

  if (a.action === 'message') {
    if (a.href && !/^\/(?!\/)[\w\-./?=&%#]*$/.test(a.href) && !/^https:\/\/[^\s]+$/.test(a.href)) throw new HttpError(400, 'The link must be a page on this site or an https address.')
    await notify(id, { kind: 'account', title: a.title, body: a.text, href: a.href, dedupe: `admin-msg:${id}:${t}:${uid().slice(0, 6)}` })
    let emailed = false
    if (a.email) {
      try {
        const mail = plainMessageEmail(u.display_name ?? u.name ?? '', a.title, a.text, a.href)
        await sendEmail({ to: u.email, subject: mail.subject, html: mail.html, text: mail.text, template: 'admin message' })
        emailed = true
      } catch {
        emailed = false
      }
    }
    const dm = await dmUser(id, `**${a.title}**${a.text ? `\n${a.text}` : ''}`)
    await audit(actor, 'user.message', u.email, a.title, ip)
    return json({ ok: true, emailed, discord: dm })
  }

  if (a.action === 'verify') {
    await markVerified(id)
    await audit(actor, 'user.verify', u.email, null, ip)
    return json({ ok: true })
  }

  if (a.action === 'badge') {
    if (!BADGE_BY_ID[a.badge]) throw new HttpError(400, 'Unknown badge.')
    if (a.on) {
      await d.prepare('INSERT OR IGNORE INTO badges_unlocked (user_id, badge_id, unlocked_at) VALUES (?1, ?2, ?3)').bind(id, a.badge, t).run()
      await notify(id, { kind: 'badge', title: `Badge unlocked: ${BADGE_BY_ID[a.badge].name}`, body: BADGE_BY_ID[a.badge].how, href: '/dashboard/achievements', dedupe: `badge:${a.badge}` })
    } else {
      await d.prepare('DELETE FROM badges_unlocked WHERE user_id = ?1 AND badge_id = ?2').bind(id, a.badge).run()
    }
    await audit(actor, a.on ? 'user.badge_give' : 'user.badge_take', u.email, a.badge, ip)
    return json({ ok: true })
  }

  // adjust: move money by hand, with a reason. Needs the admin password. A debit can never take a balance below zero.
  await requireAdminSecret(admin.id, a.secret)
  const cents = Math.round(a.amount * 100)
  const rowId = uid()
  const res = await d
    .prepare(
      a.account === 'clipper'
        ? `INSERT INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at)
           SELECT ?1, ?2, 'clipper', 'adjustment', ?3, ?4, ?1, ?5, ?4
           WHERE ?3 >= 0 OR (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger WHERE user_id = ?2 AND account = 'clipper' AND available_at <= ?4) >= -?3`
        : `INSERT INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at)
           SELECT ?1, ?2, 'brand', 'adjustment', ?3, ?4, ?1, ?5, ?4
           WHERE ?3 >= 0 OR (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger WHERE user_id = ?2 AND account = 'brand') >= -?3`,
    )
    .bind(rowId, id, cents, t, `Adjusted by the logoless team: ${a.note}`)
    .run()
  if (res.meta.changes !== 1) throw new HttpError(409, 'That would take the balance below zero.')
  const now = await balances(id)
  const dollars = `${cents < 0 ? '-' : '+'}$${(Math.abs(cents) / 100).toFixed(2)}`
  await notify(id, { kind: a.account === 'clipper' ? 'earning' : 'payout', title: `Your ${a.account === 'clipper' ? 'earnings were' : 'balance was'} adjusted ${dollars}`, body: a.note, href: a.account === 'clipper' ? '/dashboard/earnings' : '/brand/balance', dedupe: `adjust:${rowId}` })
  await audit(actor, 'user.adjust', u.email, `${a.account} ${dollars}: ${a.note}`, ip)
  return json({ ok: true, balance: a.account === 'clipper' ? now.available + now.pending : now.brand })
})
