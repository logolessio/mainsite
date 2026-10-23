import { db, nowSec, setting } from '../db'
import { featureOn } from '../features'
import { addRole, botReady, discord, postMessage } from './api'
import { payoutPostCard, submissionPostCard, withdrawalPostCard, type SubmissionPost } from './cards-more'
import { getDiscordConfig, type DiscordConfig } from './config'
import { videoInfo, type VideoInfo } from './video'

/**
 * The loop that keeps Discord (and the campaign numbers on the site) up to date. The scheduled job runs it every 30 seconds (a cron
 * every minute that runs it twice, see scripts/patch-open-next.mjs and app/api/cron/tick). Each part has its own feature switch, so
 * on logoless.io nothing here happens until that part is pushed. Every part is small, so one run takes a few seconds:
 *  1. views: a few submissions that are due for a view check (the usual two-hour rhythm per submission, spread evenly)
 *  2. campaigns: every live campaign's card is refreshed, and only edited when a number on it changed
 *  3. submissions: new submissions are posted in the submissions channel; posted ones are edited when they are reviewed or earn
 *  4. payouts: new earnings (and withdrawals sent) are posted in the payouts channel
 *  5. tickets: a ticket whose channel was deleted in Discord is closed on the site
 *  6. roles: a handful of linked members have their roles brought in line with the site
 *  7. newcomers: people who joined the server and have no role yet are made Unverified (they see only #get-started until they sign up)
 * A lock makes sure two runs never overlap, and a claim row in discord_posts makes sure nothing is ever posted twice.
 */
export type TickSummary = { at: number; skipped?: string; ms: number; parts: Record<string, string> }

const LOCK_FOR = 50
const BUDGET_MS = 22_000

const put = async (key: string, value: string) => {
  const d = await db()
  await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(key, value, nowSec()).run()
}
const get = async (key: string) => (await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(key).first<{ value: string }>())?.value ?? null

async function lock(): Promise<boolean> {
  const d = await db()
  const now = nowSec()
  const r = await d
    .prepare("INSERT INTO settings (key, value, updated_at) VALUES ('discord:tick-lock', ?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at WHERE CAST(settings.value AS INTEGER) < ?3")
    .bind(String(now), now, now - LOCK_FOR)
    .run()
  return r.meta.changes === 1
}
const unlock = async () => (await db()).prepare("DELETE FROM settings WHERE key = 'discord:tick-lock'").run()

/** Claims a post: true only for the one run that gets to make it. */
async function claim(kind: string, ref: string) {
  const d = await db()
  const t = nowSec()
  const r = await d.prepare('INSERT OR IGNORE INTO discord_posts (kind, ref_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)').bind(kind, ref, t).run()
  return r.meta.changes === 1
}
async function saved(kind: string, ref: string, channel: string, message: string, hash: string) {
  const d = await db()
  await d.prepare('UPDATE discord_posts SET channel_id = ?3, message_id = ?4, hash = ?5, updated_at = ?6 WHERE kind = ?1 AND ref_id = ?2').bind(kind, ref, channel, message, hash, nowSec()).run()
}

/** Where a feed got to: "<created_at>:<id>". The first time it starts from now, so switching a feed on never floods the channel. */
async function cursor(name: string): Promise<{ t: number; id: string }> {
  const v = await get(`discord:cursor:${name}`)
  if (!v) {
    const now = { t: nowSec(), id: '' }
    await put(`discord:cursor:${name}`, `${now.t}:`)
    return now
  }
  const [t, id] = v.split(':')
  return { t: Number(t) || 0, id: id ?? '' }
}

// ---------- submissions ----------
type SubRow = { id: string; url: string; platform: string; status: string; reject_reason: string | null; created_at: number; views_verified: number; earned_cents: number; campaign_id: string; title: string; rate_cents: number; handle: string | null; name: string | null }
const SUB_SQL = `SELECT s.id, s.url, s.platform, s.status, s.reject_reason, s.created_at, s.views_verified, s.earned_cents, s.campaign_id, c.title, c.rate_cents, p.handle, COALESCE(p.display_name, u.name) AS name
  FROM submissions s JOIN campaigns c ON c.id = s.campaign_id JOIN users u ON u.id = s.user_id LEFT JOIN profiles p ON p.user_id = s.user_id`
const subHash = (r: SubRow) => `${r.status}:${r.views_verified}:${r.earned_cents}`

function subMessage(r: SubRow, video: VideoInfo) {
  const data: SubmissionPost = {
    id: r.id,
    url: r.url,
    platform: r.platform,
    status: r.status,
    reason: r.reject_reason,
    campaign: r.title,
    campaignId: r.campaign_id,
    handle: r.handle || 'creator',
    name: r.name || r.handle || 'A creator',
    at: r.created_at,
    verifiedViews: r.views_verified,
    earnedCents: r.earned_cents,
    rateCents: r.rate_cents,
    video,
  }
  return submissionPostCard(data)
}

async function submissions(cfg: DiscordConfig, until: number): Promise<string> {
  const channel = cfg.channels.submissions
  if (!channel) return 'no channel'
  const d = await db()
  const youtubeKey = await setting('YOUTUBE_API_KEY')
  const c = await cursor('submissions')
  const rows = (await d.prepare(`${SUB_SQL} WHERE (s.created_at > ?1 OR (s.created_at = ?1 AND s.id > ?2)) AND c.id NOT LIKE 'mock-%' ORDER BY s.created_at, s.id LIMIT 4`).bind(c.t, c.id).all<SubRow>()).results
  let posted = 0
  for (const r of rows) {
    if (Date.now() > until) break
    if (await claim('submission', r.id)) {
      const video = await videoInfo(r.platform, r.url, { youtubeKey })
      const res = await postMessage(channel, subMessage(r, video))
      if (res.ok && res.json?.id) {
        await saved('submission', r.id, channel, res.json.id, subHash(r))
        posted++
      } else if (res.status !== 0 && res.status < 500) {
        // Discord refused it for good (a missing permission): leave the claim so it is not tried forever
        await saved('submission', r.id, channel, '', 'refused')
      } else {
        await d.prepare("DELETE FROM discord_posts WHERE kind = 'submission' AND ref_id = ?1").bind(r.id).run()
        break // try this one again next run
      }
    }
    await put('discord:cursor:submissions', `${r.created_at}:${r.id}`)
  }
  // posts from the last week whose status or numbers changed since they were posted
  let edited = 0
  if (Date.now() < until) {
    const changed = (
      await d
        .prepare(`${SUB_SQL} JOIN discord_posts dp ON dp.kind = 'submission' AND dp.ref_id = s.id WHERE dp.message_id != '' AND dp.created_at > ?1 AND dp.hash != (s.status || ':' || s.views_verified || ':' || s.earned_cents) LIMIT 4`)
        .bind(nowSec() - 7 * 86400)
        .all<SubRow & { channel_id?: string }>()
    ).results
    for (const r of changed) {
      if (Date.now() > until) break
      const p = await d.prepare("SELECT channel_id, message_id FROM discord_posts WHERE kind = 'submission' AND ref_id = ?1").bind(r.id).first<{ channel_id: string; message_id: string }>()
      if (!p?.message_id) continue
      const video = await videoInfo(r.platform, r.url, { youtubeKey })
      const res = await discord('PATCH', `/channels/${p.channel_id}/messages/${p.message_id}`, subMessage(r, video))
      if (res.ok || res.status === 404) await saved('submission', r.id, p.channel_id, res.ok ? p.message_id : '', subHash(r))
      if (res.ok) edited++
    }
  }
  return `${posted} posted, ${edited} updated`
}

// ---------- payouts ----------
async function payouts(cfg: DiscordConfig, until: number): Promise<string> {
  const channel = cfg.channels.payouts
  if (!channel) return 'no channel'
  const d = await db()
  const c = await cursor('earnings')
  const rows = (
    await d
      .prepare(
        `SELECT e.id, e.net_cents, e.note, e.created_at, e.campaign, e.campaign_id, c.rate_cents, COALESCE(p.handle, p.display_name, u.name, 'creator') AS name
         FROM earnings e LEFT JOIN campaigns c ON c.id = e.campaign_id LEFT JOIN profiles p ON p.user_id = e.clipper_user_id LEFT JOIN users u ON u.id = e.clipper_user_id
         WHERE (e.created_at > ?1 OR (e.created_at = ?1 AND e.id > ?2)) ORDER BY e.created_at, e.id LIMIT 6`,
      )
      .bind(c.t, c.id)
      .all<{ id: string; net_cents: number; note: string | null; created_at: number; campaign: string; campaign_id: string | null; rate_cents: number | null; name: string }>()
  ).results
  let posted = 0
  for (const r of rows) {
    if (Date.now() > until) break
    if (r.net_cents >= cfg.payoutMinCents && !(r.campaign_id ?? '').startsWith('mock-') && (await claim('earning', r.id))) {
      const views = Number(/^(\d+) views/.exec(r.note ?? '')?.[1] ?? NaN)
      const res = await postMessage(channel, payoutPostCard({ earningId: r.id, name: r.name, cents: r.net_cents, campaign: r.campaign, campaignId: r.campaign_id, views: Number.isFinite(views) ? views : null, rateCents: r.rate_cents, at: r.created_at }))
      if (res.ok && res.json?.id) {
        await saved('earning', r.id, channel, res.json.id, '')
        posted++
      } else if (res.status === 0 || res.status >= 500) {
        await d.prepare("DELETE FROM discord_posts WHERE kind = 'earning' AND ref_id = ?1").bind(r.id).run()
        break
      }
    }
    await put('discord:cursor:earnings', `${r.created_at}:${r.id}`)
  }
  // withdrawals that were sent since the last look
  const w = await cursor('withdrawals')
  const sent = (
    await d
      .prepare(
        `SELECT x.id, x.amount_cents, x.updated_at, COALESCE(p.handle, p.display_name, u.name, 'creator') AS name FROM payouts x LEFT JOIN profiles p ON p.user_id = x.user_id LEFT JOIN users u ON u.id = x.user_id
         WHERE x.status = 'sent' AND (x.updated_at > ?1 OR (x.updated_at = ?1 AND x.id > ?2)) ORDER BY x.updated_at, x.id LIMIT 4`,
      )
      .bind(w.t, w.id)
      .all<{ id: string; amount_cents: number; updated_at: number; name: string }>()
  ).results
  for (const r of sent) {
    if (Date.now() > until) break
    if (await claim('payout', r.id)) {
      const res = await postMessage(channel, withdrawalPostCard({ name: r.name, cents: r.amount_cents, at: r.updated_at }))
      if (res.ok && res.json?.id) await saved('payout', r.id, channel, res.json.id, '')
    }
    await put('discord:cursor:withdrawals', `${r.updated_at}:${r.id}`)
  }
  return `${posted} earnings posted, ${sent.length} withdrawals looked at`
}

// ---------- campaigns ----------
async function campaigns(until: number): Promise<string> {
  const { refreshCampaignCard, syncArtist } = await import('./campaigns')
  const d = await db()
  // live ones, and ones that stopped in the last hour (their card is taken down or marked ended, their channel filed)
  const rows = (await d.prepare("SELECT id, creator, status FROM campaigns WHERE id NOT LIKE 'mock-%' AND (status = 'live' OR (status IN ('paused','ended') AND updated_at > ?1)) ORDER BY status = 'live' DESC, updated_at DESC LIMIT 30").bind(nowSec() - 3600).all<{ id: string; creator: string; status: string }>()).results
  let n = 0
  const stopped = new Set<string>()
  for (const r of rows) {
    if (Date.now() > until) break
    if (await refreshCampaignCard(r.id)) n++
    if (r.status !== 'live') stopped.add(r.creator)
  }
  for (const creator of stopped) if (Date.now() < until) await syncArtist(creator, false)
  return `${n} of ${rows.length} cards checked`
}

// ---------- tickets ----------
async function tickets(cfg: DiscordConfig): Promise<string> {
  const d = await db()
  const open = (await d.prepare("SELECT key, value FROM settings WHERE key LIKE 'discord:ticket:%' LIMIT 100").all<{ key: string; value: string }>()).results
  if (open.length === 0 || !cfg.guildId) return 'none open'
  // one call lists every channel in the server; a ticket whose channel is not in it was deleted
  const list = await discord<{ id: string }[]>('GET', `/guilds/${cfg.guildId}/channels`)
  if (!list.ok || !Array.isArray(list.json)) return 'could not list channels'
  const alive = new Set(list.json.map((c) => c.id))
  const { getInquiry } = await import('../inquiries')
  const { ticketChannelGone } = await import('./tickets')
  let closed = 0
  for (const r of open) {
    const inq = await getInquiry(r.value)
    if (!inq?.discord) {
      await d.prepare('DELETE FROM settings WHERE key = ?1').bind(r.key).run()
      continue
    }
    if (!alive.has(inq.discord.channelId)) {
      await ticketChannelGone(inq)
      closed++
    }
  }
  return `${open.length} open, ${closed} closed because their channel was deleted`
}

// ---------- roles ----------
async function roles(): Promise<string> {
  const d = await db()
  const after = (await get('discord:cursor:roles')) ?? ''
  const rows = (await d.prepare("SELECT key, value FROM settings WHERE key LIKE 'discord-user:%' AND key > ?1 ORDER BY key LIMIT 4").bind(after).all<{ key: string; value: string }>()).results
  const { syncRoles } = await import('./roles')
  let changed = 0
  for (const r of rows) {
    const s = await syncRoles(r.value).catch(() => null)
    if (s?.ok && (s.added.length || s.removed.length)) changed++
  }
  await put('discord:cursor:roles', rows.length ? rows[rows.length - 1].key : '') // back to the start after the last one
  return `${rows.length} checked, ${changed} changed`
}

// ---------- newcomers ----------
/**
 * Somebody who joins the server from an invite link has no role. Discord only tells a bot about joins over a constant connection, which this site does not keep,
 * so once a minute the newest part of the member list is looked at and anyone with none of our roles is made Unverified. They can see only #get-started either way
 * (every other channel is for Verified, see "Lock the server to verified members"): the role is what says so, and what the sign-up takes away again.
 * Reading the member list needs the "Server Members Intent" switched on for the bot in the Discord developer portal; without it this says so and does nothing.
 */
async function newcomers(cfg: DiscordConfig): Promise<string> {
  const ro = cfg.roles
  if (!ro.unverified) return 'no Unverified role yet (Make the missing roles)'
  const after = (await get('discord:cursor:members')) ?? '0'
  const list = await discord<{ roles: string[]; user?: { id: string; bot?: boolean } }[]>('GET', `/guilds/${cfg.guildId}/members?limit=100&after=${after}`)
  if (!list.ok) return list.status === 403 ? 'cannot read the member list: switch on Server Members Intent for the bot in the Discord developer portal (Bot, Privileged Gateway Intents)' : `Discord answered ${list.status}`
  const members = Array.isArray(list.json) ? list.json : []
  const known = [ro.verified, ro.unverified, ro.founding, ro.admin, ro.team, ro.staff, ro.developer, ro.creator, ro.brand, ro.clipper].filter(Boolean)
  let given = 0
  let last = after
  for (const m of members) {
    if (!m.user) continue
    if (given >= 20) break // one run only has so many calls to make; the rest is picked up next time
    last = m.user.id
    if (m.user.bot || m.roles.some((r) => known.includes(r))) continue
    if ((await addRole(cfg.guildId, m.user.id, ro.unverified)).ok) given++
  }
  const finished = members.length < 100 && given < 20
  await put('discord:cursor:members', finished ? '0' : last) // back to the start once the whole list has been looked at
  return `${members.length} looked at, ${given} made Unverified`
}

// ---------- the run ----------
export async function discordTick(o: { force?: boolean } = {}): Promise<TickSummary> {
  const started = Date.now()
  const until = started + BUDGET_MS
  const parts: Record<string, string> = {}
  const out = (skipped?: string): TickSummary => ({ at: nowSec(), ms: Date.now() - started, parts, ...(skipped ? { skipped } : {}) })
  const on = async (id: string) => o.force || (await featureOn(id))
  if (!(await on('discord-live'))) return out('the live loop is switched off')
  if (!(await lock())) return out('another run is going')
  try {
    const step = async (name: string, feature: string, fn: () => Promise<string>) => {
      if (Date.now() > until) return void (parts[name] = 'out of time')
      if (!(await on(feature))) return void (parts[name] = 'switched off')
      try {
        parts[name] = await fn()
      } catch (e) {
        parts[name] = `failed: ${e instanceof Error ? e.message.slice(0, 120) : 'unknown'}`
      }
    }
    await step('views', 'discord-live', async () => {
      const { rescanViews } = await import('../views-rescan')
      const r = await rescanViews({ limit: 4 })
      return r.skipped ? r.skipped : `${r.checked} checked, ${r.updated} went up`
    })
    const ready = await botReady()
    const cfg = await getDiscordConfig()
    if (!ready || !cfg.guildId) {
      parts.discord = 'the bot is not set up'
      return out()
    }
    await step('campaigns', 'discord-campaigns', () => campaigns(until))
    await step('submissions', 'discord-submissions', () => submissions(cfg, until))
    await step('payouts', 'discord-payouts', () => payouts(cfg, until))
    await step('tickets', 'discord-tickets', () => tickets(cfg))
    await step('roles', 'discord-roles', () => roles())
    await step('newcomers', 'discord-roles', () => newcomers(cfg))
    const summary = out()
    await put('discord:tick-last', JSON.stringify(summary)).catch(() => null)
    return summary
  } finally {
    await unlock().catch(() => null)
  }
}

export async function lastTick(): Promise<TickSummary | null> {
  try {
    const v = await get('discord:tick-last')
    return v ? (JSON.parse(v) as TickSummary) : null
  } catch {
    return null
  }
}
