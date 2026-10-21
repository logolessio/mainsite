import { contactPref } from './contact-pref'
import { db, nowSec, uid } from './db'
import { botReady, sendDm } from './discord/api'
import { notificationCard } from './discord/cards'
import { getDiscordConfig } from './discord/config'
import { discordIdFor, dmEnabled } from './discord/link'
import { kindIcon } from './discord/ui'
import { emailEnabled, sendEmail } from './email'
import { notificationsEmail } from './email-templates'
import { featureOn } from './features'
import { type Channel, type NotifyPrefs, cleanPrefs, defaultPrefs, isNoteKind, isQuietNow, nextLocal } from './notify-prefs'

/**
 * The notification centre (feature switch "notification-center"). Every notification lands on the site; each person then chooses,
 * kind by kind, whether it also comes by email and by Discord message, when to stay quiet, and whether to get one bundle a day or
 * a week instead of a message per thing. Messages that have to wait sit in notification_outbox until the scheduled job sends them.
 */
export const centerOn = () => featureOn('notification-center')

export async function getPrefs(userId: string): Promise<NotifyPrefs> {
  const d = await db()
  const row = await d.prepare('SELECT prefs_json FROM notification_prefs WHERE user_id = ?1').bind(userId).first<{ prefs_json: string }>().catch(() => null)
  const base = defaultPrefs(await contactPref(userId))
  if (!row) return base
  try {
    return cleanPrefs(JSON.parse(row.prefs_json), base)
  } catch {
    return base
  }
}

export async function savePrefs(userId: string, input: unknown) {
  const prefs = cleanPrefs(input, await getPrefs(userId))
  const d = await db()
  await d
    .prepare('INSERT INTO notification_prefs (user_id, prefs_json, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(user_id) DO UPDATE SET prefs_json = excluded.prefs_json, updated_at = excluded.updated_at')
    .bind(userId, JSON.stringify(prefs), nowSec())
    .run()
  return prefs
}

/** Whether this kind should be hidden on the site for this person. */
export const mutedOnSite = (p: NotifyPrefs, kind: string) => isNoteKind(kind) && !p.m[kind].site

type Item = { kind: string; title: string; body?: string; href?: string | null }

/** Can the bot message this person right now? (Linked, the bot is set up, Discord messages are on for the site and for them.) */
async function discordTarget(userId: string) {
  const cfg = await getDiscordConfig()
  if (!cfg.dm || !(await botReady()) || !(await dmEnabled(userId))) return null
  return discordIdFor(userId)
}

async function sendNow(userId: string, channel: Exclude<Channel, 'site'>, items: Item[], digest: 'daily' | 'weekly' | null) {
  if (!items.length) return false
  if (channel === 'discord') {
    const id = await discordTarget(userId)
    if (!id) return false
    const one = items.length === 1 ? items[0] : null
    const card = one
      ? notificationCard({ kind: one.kind, icon: kindIcon(one.kind), title: one.title, body: one.body, href: one.href ?? undefined })
      : notificationCard({ kind: 'logoless', icon: kindIcon('inbox'), title: digest === 'weekly' ? 'Your week on logoless' : digest === 'daily' ? 'Your day on logoless' : `${items.length} new notifications`, body: items.slice(0, 15).map((n) => `• ${n.title}`).join('\n'), href: '/dashboard/notifications' })
    return sendDm(id, card)
  }
  if (!(await emailEnabled())) return false
  const d = await db()
  const u = await d.prepare("SELECT u.email, COALESCE(p.display_name, u.name, '') AS name FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?1").bind(userId).first<{ email: string; name: string }>()
  if (!u || u.email.endsWith('@deleted.invalid') || u.email.endsWith('.invalid')) return false
  const mail = notificationsEmail(u.name, items, digest)
  await sendEmail({ to: u.email, subject: mail.subject, html: mail.html, text: mail.text, template: digest ? 'digest' : 'notification' })
  return true
}

/**
 * A notification was just created: send it by email and Discord as the person chose, now or later.
 * `forceEmail` keeps the older promise of `reach()`: things that matter are emailed unless the person switched email off for that kind.
 */
export async function deliver(userId: string, n: Item, prefs?: NotifyPrefs) {
  try {
    const p = prefs ?? (await getPrefs(userId))
    if (!isNoteKind(n.kind)) return
    const now = nowSec()
    const quiet = isQuietNow(p, now)
    for (const ch of ['email', 'discord'] as const) {
      if (!p.m[n.kind][ch]) continue
      if (ch === 'discord' && !(await discordTarget(userId))) continue // not linked, or Discord messages are off
      const every = p.digest[ch]
      let due = now
      if (every !== 'off') due = nextLocal(now, p.tz, p.digest.at, every === 'weekly' ? 1 : undefined)
      if (quiet) due = Math.max(due, nextLocal(now, p.tz, p.quiet.to))
      if (due <= now) {
        await sendNow(userId, ch, [n], null).catch(() => false)
        continue
      }
      const d = await db()
      await d
        .prepare('INSERT INTO notification_outbox (id, user_id, channel, kind, title, body, href, due_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
        .bind(uid(), userId, ch, n.kind, n.title.slice(0, 120), (n.body ?? '').slice(0, 240), n.href ?? null, due, now)
        .run()
    }
  } catch (e) {
    console.error('deliver failed', e instanceof Error ? e.message : e)
  }
}

/** For the scheduled job: sends everything whose time has come, one bundle per person and channel. Safe to run often. */
export async function flushOutbox(limit = 400) {
  const d = await db()
  const now = nowSec()
  const rows = (
    await d
      .prepare('SELECT id, user_id, channel, kind, title, body, href FROM notification_outbox WHERE sent_at IS NULL AND due_at <= ?1 ORDER BY due_at LIMIT ?2')
      .bind(now, limit)
      .all<{ id: string; user_id: string; channel: 'email' | 'discord'; kind: string; title: string; body: string; href: string | null }>()
      .catch(() => ({ results: [] as never[] }))
  ).results
  const groups = new Map<string, typeof rows>()
  for (const r of rows) {
    const k = `${r.user_id}\n${r.channel}`
    groups.set(k, [...(groups.get(k) ?? []), r])
  }
  let sent = 0
  for (const list of groups.values()) {
    // claim the rows first, so two runs at once never send the same thing twice
    const ids = list.map((r) => r.id)
    const claimed = await d.prepare(`UPDATE notification_outbox SET sent_at = ?1 WHERE sent_at IS NULL AND id IN (${ids.map((_, i) => `?${i + 2}`).join(',')})`).bind(now, ...ids).run()
    if (!claimed.meta.changes) continue
    const { user_id: userId, channel } = list[0]
    const p = await getPrefs(userId)
    // they may have switched the channel off since, or still be in quiet hours (the job runs every half hour)
    const items = list.filter((r) => isNoteKind(r.kind) && p.m[r.kind][channel])
    if (isQuietNow(p, now)) {
      const later = nextLocal(now, p.tz, p.quiet.to)
      await d.prepare(`UPDATE notification_outbox SET sent_at = NULL, due_at = ?1 WHERE id IN (${ids.map((_, i) => `?${i + 2}`).join(',')})`).bind(later, ...ids).run()
      continue
    }
    const every = p.digest[channel]
    if (await sendNow(userId, channel, items, items.length > 1 && every !== 'off' ? every : null).catch(() => false)) sent++
  }
  // a month later, forget what was sent
  await d.prepare('DELETE FROM notification_outbox WHERE sent_at IS NOT NULL AND sent_at < ?1').bind(now - 30 * 86400).run().catch(() => {})
  return { digestsSent: sent }
}

/** Account deletion: their settings and anything still waiting to be sent. */
export async function forgetNotifyData(userId: string) {
  const d = await db()
  await d.batch([
    d.prepare('DELETE FROM notification_prefs WHERE user_id = ?1').bind(userId),
    d.prepare('DELETE FROM notification_outbox WHERE user_id = ?1').bind(userId),
    d.prepare('DELETE FROM dashboard_state WHERE user_id = ?1').bind(userId),
  ])
}
