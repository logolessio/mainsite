import { z } from 'zod'
import { requireAdminSecret } from '@/lib/admin-secret'
import { audit } from '@/lib/chain'
import { db, nowSec, uid } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { plainMessageEmail } from '@/lib/email-templates'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

const schema = z.object({
  audience: z.enum(['everyone', 'clippers', 'brands', 'active', 'team', 'one', 'discord']),
  discord: z.enum(['news', 'updates']).optional(), // also post it in the Discord server
  to: z.string().trim().toLowerCase().max(254).optional(), // an email, for "one"
  title: z.string().trim().min(3).max(100),
  text: z.string().trim().max(240).default(''),
  href: z.string().trim().max(200).optional(),
  email: z.boolean().optional(),
  secret: z.string().max(200).optional(),
})

const LIVE = "u.status = 'active' AND u.email NOT LIKE 'deleted-%@deleted.invalid'"
const IS_BRAND = "(EXISTS (SELECT 1 FROM campaigns c WHERE c.brand_user_id = u.id) OR EXISTS (SELECT 1 FROM ledger l WHERE l.user_id = u.id AND l.account = 'brand'))"
const AUDIENCE: Record<string, string> = {
  everyone: LIVE,
  clippers: `${LIVE} AND NOT ${IS_BRAND}`,
  brands: `${LIVE} AND ${IS_BRAND}`,
  active: `${LIVE} AND u.last_seen_at > %NOW% - 7 * 86400`,
  team: `${LIVE} AND (u.role = 'admin' OR EXISTS (SELECT 1 FROM settings s WHERE s.key = 'roles:' || u.id AND s.value != '[]'))`,
}
const MAX_EMAILS = 40

/** Tell a group of people something. It lands in their notifications (and optionally their inbox); big groups need the admin password. */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-broadcast', max: 10, windowSec: 3600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 4096))
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'That is not valid.')
  const a = parsed.data
  if (a.href && !/^\/(?!\/)[\w\-./?=&%#]*$/.test(a.href) && !/^https:\/\/[^\s]+$/.test(a.href)) throw new HttpError(400, 'The link must be a page on this site or an https address.')
  if (a.audience === 'discord' && !a.discord) throw new HttpError(400, 'Pick a Discord channel.')
  if (a.audience !== 'one' && a.audience !== 'team') await requireAdminSecret(admin.id, a.secret)

  const d = await db()
  const t = nowSec()
  const batch = uid().slice(0, 8)
  // `where(n)` is the audience as SQL; for one person it uses placeholder ?n for their email
  let args: unknown[] = []
  if (a.audience === 'one' && !a.to) throw new HttpError(400, 'Enter the email of the person.')
  if (a.audience === 'one') args = [a.to]
  const where = (n: number) => (a.audience === 'one' ? `${LIVE} AND u.email = ?${n}` : AUDIENCE[a.audience].replace('%NOW%', String(t)))

  const onlyDiscord = a.audience === 'discord'
  const res = onlyDiscord
    ? { meta: { changes: 0 } }
    : await d
    .prepare(
      `INSERT OR IGNORE INTO notifications (id, user_id, kind, title, body, href, dedupe_key, created_at)
       SELECT lower(hex(randomblob(16))), u.id, 'account', ?1, ?2, ?3, ?4 || u.id, ?5 FROM users u WHERE ${where(6)}`,
    )
    .bind(a.title, a.text, a.href ?? null, `broadcast:${batch}:`, t, ...args)
    .run()
  const sent = res.meta.changes ?? 0
  if (a.audience === 'one' && sent === 0) throw new HttpError(404, 'Nobody with that email.')
  let posted: boolean | null = null
  if (a.discord) {
    const { postTo } = await import('@/lib/discord/outbound')
    posted = await postTo(a.discord, { title: a.title, text: a.text, href: a.href })
    if (onlyDiscord && !posted) throw new HttpError(502, 'Could not post in Discord. Set that channel on the Discord page, and check the bot can post there.')
  }

  let emailed = 0
  let emailNote = ''
  if (a.email && !onlyDiscord) {
    const rows = (await d.prepare(`SELECT u.email, COALESCE(p.display_name, u.name, '') AS name FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE ${where(1)} LIMIT ${MAX_EMAILS + 1}`).bind(...args).all<{ email: string; name: string }>()).results
    if (rows.length > MAX_EMAILS) emailNote = `Too many people to email from here (more than ${MAX_EMAILS}). They were all notified on the site.`
    else {
      for (const r of rows) {
        try {
          const mail = plainMessageEmail(r.name, a.title, a.text, a.href)
          await sendEmail({ to: r.email, subject: mail.subject, html: mail.html, text: mail.text, template: 'broadcast' })
          emailed++
        } catch {
          /* one failure must not stop the rest */
        }
      }
    }
  }
  await audit({ id: admin.id, email: admin.email }, 'broadcast.send', a.audience === 'one' ? a.to ?? '' : a.audience, `${a.title} · ${sent} people${emailed ? `, ${emailed} emailed` : ''}${a.discord ? `, Discord #${a.discord}${posted ? '' : ' (failed)'}` : ''}`, await ipHash(req))
  return json({ ok: true, sent, emailed, emailNote, posted })
})
