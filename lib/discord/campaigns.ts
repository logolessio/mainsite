import { type CampaignRow, campaignRow } from '../campaigns-db'
import { db, nowSec } from '../db'
import { abs, botReady, discord, type Message, postMessage } from './api'
import { announceCard, trackerCard } from './cards'
import { type DiscordConfig, getDiscordConfig, slug } from './config'

/**
 * Campaigns in the server. Every artist has a channel (made when their first campaign goes live), where each campaign gets a card
 * with the cover, the details and a live tracker that keeps itself up to date. New campaigns are announced in the new-campaigns
 * channel with a Join button. An artist with no live campaign has their channel moved to the inactive category.
 */
const SOON = 20 // seconds between card edits for one campaign
const sleepless = async (p: Promise<unknown>) => {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    getCloudflareContext().ctx.waitUntil(p)
  } catch {
    void p
  }
}

const put = async (key: string, value: string) => {
  const d = await db()
  await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(key, value, nowSec()).run()
}
const get = async (key: string) => (await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(key).first<{ value: string }>())?.value ?? null

// ---------- artist channels ----------
const channelName = (creator: string) => creator.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'artist'

/** The channel for an artist: the one set by hand, the one the bot made before, or (when `create`) a new one. */
export async function artistChannel(creator: string, create: boolean, cfg?: DiscordConfig): Promise<string | null> {
  const c = cfg ?? (await getDiscordConfig())
  const key = slug(creator)
  const manual = c.artists.find((a) => slug(a.name) === key)?.channel
  const made = manual || (await get(`discord:artist:${key}`))
  if (made) {
    const alive = await discord<{ id: string }>('GET', `/channels/${made}`)
    if (alive.ok) return made
    if (alive.status !== 404) return made // Discord hiccup: keep using what we have
  }
  if (!create || !c.guildId || !(await botReady())) return null
  const res = await discord<{ id: string }>('POST', `/guilds/${c.guildId}/channels`, {
    name: channelName(creator),
    type: 0,
    ...(c.artistsCategory ? { parent_id: c.artistsCategory } : {}),
    topic: `Campaigns for ${creator}. The card below tracks every one live: budget left, paid out, clips.`.slice(0, 1000),
  })
  if (!res.ok || !res.json?.id) return null
  await put(`discord:artist:${key}`, res.json.id)
  return res.json.id
}

/** True if the artist has at least one live campaign right now. */
async function hasLive(creator: string) {
  const d = await db()
  const rows = (await d.prepare("SELECT creator FROM campaigns WHERE status = 'live' AND id NOT LIKE 'mock-%'").all<{ creator: string }>()).results
  return rows.some((r) => slug(r.creator) === slug(creator))
}

/** Puts the artist's channel in the right category: with the artists while something is live, in the inactive one when nothing is. */
export async function syncArtist(creator: string, create = false): Promise<string | null> {
  const cfg = await getDiscordConfig()
  if (!cfg.guildId || !(await botReady())) return null
  const live = await hasLive(creator)
  const id = await artistChannel(creator, create && live, cfg)
  if (!id) return null
  const want = live ? cfg.artistsCategory : cfg.inactiveCategory
  if (want) {
    const now = await discord<{ parent_id: string | null }>('GET', `/channels/${id}`)
    if (now.ok && now.json && now.json.parent_id !== want) await discord('PATCH', `/channels/${id}`, { parent_id: want, lock_permissions: false })
  }
  return id
}

/** Goes through every artist the site knows and files their channel where it belongs. */
export async function syncAllArtists() {
  const d = await db()
  const rows = (await d.prepare("SELECT DISTINCT creator FROM campaigns WHERE status IN ('live','paused','ended') ").all<{ creator: string }>()).results
  let moved = 0
  for (const r of rows) if (await syncArtist(r.creator, false)) moved++
  return { artists: rows.length, checked: moved }
}

// ---------- the card ----------
async function stats(c: CampaignRow) {
  const d = await db()
  const [paid, clips, joined] = await Promise.all([
    d.prepare('SELECT COALESCE(SUM(net_cents), 0) AS n FROM earnings WHERE campaign_id = ?1').bind(c.id).first<{ n: number }>(),
    d.prepare("SELECT COUNT(*) AS clips, COALESCE(SUM(views_verified), 0) AS views, COUNT(DISTINCT user_id) AS clippers FROM submissions WHERE campaign_id = ?1 AND status = 'approved'").bind(c.id).first<{ clips: number; views: number; clippers: number }>(),
    d.prepare('SELECT COUNT(*) AS n FROM favorites WHERE campaign_id = ?1').bind(c.id).first<{ n: number }>(),
  ])
  const paidCents = paid?.n ?? 0
  return { paidCents, leftCents: Math.max(0, c.budget_cents - paidCents), leftPct: c.budget_cents > 0 ? Math.max(0, Math.min(100, Math.round(((c.budget_cents - paidCents) / c.budget_cents) * 100))) : 100, clips: clips?.clips ?? 0, views: clips?.views ?? 0, clippers: clips?.clippers ?? 0, joined: joined?.n ?? 0 }
}

const list = (j: string, n = 4): string[] => {
  try {
    return (JSON.parse(j) as string[]).slice(0, n)
  } catch {
    return []
  }
}

/** The live card for a campaign: cover, details and the numbers that change. */
export async function campaignCard(c: CampaignRow, cfg: DiscordConfig, channelId?: string | null): Promise<Message> {
  const s = await stats(c)
  return trackerCard({
    id: c.id,
    title: c.title,
    creator: c.creator,
    status: c.status,
    summary: c.summary,
    cover: abs(c.cover_url),
    rateCents: c.rate_cents,
    budgetCents: c.budget_cents,
    platforms: list(c.platforms_json, 6),
    leftPct: s.leftPct,
    leftCents: s.leftCents,
    paidCents: s.paidCents,
    approved: s.clips,
    views: s.views,
    joined: s.joined,
    endsOn: c.ends_on,
    guildId: cfg.guildId,
    getStartedChannel: cfg.channels.getStarted,
    here: channelId === cfg.channels.getStarted,
  })
}

/** Updates the card in the artist's channel, or posts it the first time. Edits are spaced out so the numbers do not hammer Discord. */
export async function refreshCampaignCard(campaignId: string, force = false): Promise<boolean> {
  try {
    const cfg = await getDiscordConfig()
    if (!cfg.guildId || !(await botReady())) return false
    const c = await campaignRow(campaignId)
    if (!c || !['live', 'paused', 'ended'].includes(c.status)) return false
    const t = nowSec()
    if (!force) {
      const last = await get(`discord:camp-at:${campaignId}`)
      if (last && t - Number(last) < SOON) return false
    }
    await put(`discord:camp-at:${campaignId}`, String(t))
    const saved = await get(`discord:camp-msg:${campaignId}`)
    const [savedChannel, savedMessage] = (saved ?? ':').split(':')
    if (savedChannel && savedMessage) {
      const edited = await discord('PATCH', `/channels/${savedChannel}/messages/${savedMessage}`, await campaignCard(c, cfg, savedChannel))
      if (edited.ok) return true
    }
    if (c.status !== 'live') return false // only start a card for something that is running
    const channel = await syncArtist(c.creator, true)
    if (!channel) return false
    const posted = await postMessage(channel, await campaignCard(c, cfg, channel))
    if (posted.ok && posted.json?.id) await put(`discord:camp-msg:${campaignId}`, `${channel}:${posted.json.id}`)
    return posted.ok
  } catch {
    return false
  }
}

/** Something about a campaign changed (status, budget, a payout): refresh its card and file the artist's channel. Does not make the caller wait. */
export async function campaignChanged(campaignId: string) {
  const job = (async () => {
    try {
      const c = await campaignRow(campaignId)
      if (!c) return
      await refreshCampaignCard(campaignId, c.status !== 'live')
      await syncArtist(c.creator, false)
    } catch {
      /* the server is a nice-to-have */
    }
  })()
  await sleepless(job)
}

// ---------- the announcement ----------
/** A campaign just went live: the artist's channel and card, and an announcement with a Join button. Only once per campaign. */
export async function announceNewCampaign(campaignId: string) {
  try {
    const cfg = await getDiscordConfig()
    if (!(await botReady())) return
    const c = await campaignRow(campaignId)
    if (!c) return
    if (await get(`discord:camp-announced:${campaignId}`)) {
      await campaignChanged(campaignId)
      return
    }
    await put(`discord:camp-announced:${campaignId}`, String(nowSec()))
    const channel = await syncArtist(c.creator, true)
    await refreshCampaignCard(campaignId, true)
    const target = cfg.channels.newCampaigns || cfg.channels.news
    if (!target) return
    const s = await stats(c)
    await postMessage(
      target,
      announceCard({
        id: c.id,
        title: c.title,
        creator: c.creator,
        summary: c.summary,
        cover: abs(c.cover_url),
        rateCents: c.rate_cents,
        budgetCents: c.budget_cents,
        platforms: list(c.platforms_json, 6),
        endsOn: c.ends_on,
        channelId: channel,
        joined: s.joined,
        guildId: cfg.guildId,
        getStartedChannel: cfg.channels.getStarted,
      }),
    )
  } catch {
    /* an announcement is a nice-to-have */
  }
}
