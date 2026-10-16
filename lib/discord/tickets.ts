import { db, nowSec } from '../db'
import { createInquiry, clean, getInquiry, type Inquiry, saveInquiry } from '../inquiries'
import { notifyAdmins } from '../notify'
import { botReady, discord, postMessage, siteUrl } from './api'
import { teamReplyCard, ticketClosedCard, ticketThreadCard } from './cards'
import { channelUrl, getDiscordConfig, slug } from './config'
import { logToDiscord } from './outbound'

/**
 * Support tickets. A ticket is an ordinary conversation in the admin inbox that also has a private Discord channel. What the team
 * writes in the dashboard is posted in the channel (pinging the person), and the person answers with the Reply button, which puts
 * their words back in the dashboard. (The bot cannot read ordinary chat in the channel: that needs an always-on connection.)
 */
const VIEW = 1024
const SEND = 2048
const HISTORY = 65536
const ALLOW = String(VIEW + SEND + HISTORY)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
async function background(p: Promise<unknown>) {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    getCloudflareContext().ctx.waitUntil(p)
  } catch {
    void p
  }
}

export type OpenResult = { ok: true; inquiry: Inquiry; channelId: string | null } | { ok: false; message: string }

export async function openTicket(a: { discordId: string; discordName: string; user: { id: string; handle: string; name: string } | null; subject: string; message: string }): Promise<OpenResult> {
  const cfg = await getDiscordConfig()
  const d = await db()
  // one open ticket at a time per person
  const open = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(`discord:ticket:${a.discordId}`).first<{ value: string }>()
  if (open) {
    const prev = await getInquiry(open.value)
    if (prev && prev.status !== 'closed' && prev.discord) return { ok: false, message: `You already have an open ticket: <#${prev.discord.channelId}>. Close it first, or reply there.` }
  }
  const subject = clean(a.subject, 80) || 'Ticket from Discord'
  const text = clean(a.message, 1500)
  if (text.length < 3) return { ok: false, message: 'Tell us a little more.' }
  const inq = await createInquiry({
    kind: 'contact',
    topic: 'discord-ticket',
    subject,
    message: `${text}\n\n(opened in Discord by ${a.discordName})`,
    name: a.user?.name || a.discordName,
    userId: a.user?.id ?? null,
    handle: a.user?.handle ?? null,
    target: '',
  })

  let channelId: string | null = null
  if (cfg.guildId && cfg.ticketCategory && (await botReady())) {
    const overwrites = [
      { id: cfg.guildId, type: 0, deny: String(VIEW) },
      { id: a.discordId, type: 1, allow: ALLOW },
      ...(cfg.roles.staff ? [{ id: cfg.roles.staff, type: 0, allow: ALLOW }] : []),
    ]
    const name = `ticket-${slug(a.user?.handle || a.discordName).slice(0, 16) || 'member'}-${inq.id.slice(-4)}`
    const made = await discord<{ id: string }>('POST', `/guilds/${cfg.guildId}/channels`, { name, type: 0, parent_id: cfg.ticketCategory, topic: `${subject} · ${a.discordName}`.slice(0, 1000), permission_overwrites: overwrites })
    if (made.ok && made.json?.id) channelId = made.json.id
  }
  if (channelId) {
    inq.discord = { channelId, userId: a.discordId }
    await saveInquiry(inq)
    await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(`discord:ticket:${a.discordId}`, inq.id, nowSec()).run()
    await postMessage(
      channelId,
      ticketThreadCard({ ref: inq.id, subject, text, who: a.discordName, pings: `<@${a.discordId}>${cfg.roles.staff ? ` <@&${cfg.roles.staff}>` : ''}`, staffId: cfg.roles.staff || undefined, userId: a.discordId }),
    )
  }
  await notifyAdmins({ title: `New ticket: ${subject}`.slice(0, 120), body: text.slice(0, 160), href: `/admin/inbox/${inq.id}`, dedupe: `inq-discord:${inq.id}` })
  await logToDiscord(`New ticket from <@${a.discordId}>: ${subject}`, 'ticket')
  return { ok: true, inquiry: inq, channelId }
}

/** The team answered in the dashboard: say it in the ticket channel and ping the person. */
export async function postTeamReply(inq: Inquiry, text: string, who: string) {
  if (!inq.discord) return false
  const res = await postMessage(inq.discord.channelId, teamReplyCard({ who, text, ref: inq.id, userId: inq.discord.userId }))
  return res.ok
}

/** The person answered with the Reply button: it goes into the dashboard and the team is told. */
export async function addUserReply(inq: Inquiry, text: string) {
  const t = clean(text, 1500)
  inq.replies.push({ by: 'you', text: t, at: nowSec() })
  inq.status = 'open'
  inq.adminSeen = false
  await saveInquiry(inq)
  await notifyAdmins({ title: `Reply on a ticket: ${inq.subject}`.slice(0, 120), body: t.slice(0, 160), href: `/admin/inbox/${inq.id}`, dedupe: `inq-discord-reply:${inq.id}:${inq.replies.length}` })
  return t
}

/** Closes a ticket: marks it closed, locks the channel, and removes it a few seconds later. The conversation stays in the inbox. */
export async function closeTicket(inq: Inquiry, by: string) {
  inq.status = 'closed'
  await saveInquiry(inq)
  if (!inq.discord) return
  const { channelId, userId } = inq.discord
  const d = await db()
  await d.prepare('DELETE FROM settings WHERE key = ?1').bind(`discord:ticket:${userId}`).run()
  await postMessage(channelId, ticketClosedCard(by))
  await background(
    (async () => {
      await sleep(8000)
      await discord('DELETE', `/channels/${channelId}`)
    })(),
  )
}

export const ticketLink = (guildId: string, channelId: string) => channelUrl(guildId, channelId)
export const dashboardLink = (id: string) => `https://owner.logoless.io/admin/inbox/${id}`
export { siteUrl }
