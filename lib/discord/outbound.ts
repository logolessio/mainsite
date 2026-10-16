import { db, nowSec } from '../db'
import { runHealth } from '../health'
import { abs, botReady, discord, postMessage, siteUrl } from './api'
import { logCard, postCard, shoutoutCard, welcomeMemberCard } from './cards'
import { getDiscordConfig } from './config'
import { discordIdFor } from './link'
import { statusMessage } from './panels'
import type { IconName } from './ui'

/** Runs a Discord post to the end even after the page has been answered. */
async function background(p: Promise<unknown>) {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    getCloudflareContext().ctx.waitUntil(p)
  } catch {
    void p
  }
}

/** A line in the team's log channel. Quiet when the bot is not set up. */
export async function logToDiscord(text: string, icon: IconName = 'info') {
  try {
    const cfg = await getDiscordConfig()
    if (!cfg.channels.logs || !(await botReady())) return
    await postMessage(cfg.channels.logs, logCard({ icon, text }))
  } catch {
    /* logging must never get in the way */
  }
}

/** A new campaign is live: its artist channel and live card, and the announcement with a Join button (see campaigns.ts). */
export async function announceCampaign(campaignId: string) {
  const { announceNewCampaign } = await import('./campaigns')
  await announceNewCampaign(campaignId)
}

/** Someone just earned a good amount: say so in the clips channel. */
export async function shoutout(clipperUserId: string, netCents: number, campaignTitle: string) {
  try {
    const cfg = await getDiscordConfig()
    if (!cfg.channels.clips || !(await botReady()) || netCents < 5000) return
    const d = await db()
    const p = await d.prepare('SELECT p.handle, p.display_name, p.show_json FROM profiles p WHERE p.user_id = ?1').bind(clipperUserId).first<{ handle: string; display_name: string; show_json: string }>()
    if (!p) return
    let showEarnings = false
    try {
      showEarnings = JSON.parse(p.show_json).earnings === true
    } catch {
      /* private by default */
    }
    await postMessage(cfg.channels.clips, shoutoutCard({ name: p.display_name, handle: p.handle, campaign: campaignTitle, cents: showEarnings ? netCents : null }))
  } catch {
    /* ignore */
  }
}

export type Post = { title: string; text: string; href?: string; label?: string }

/** An announcement from the team, in #news or #updates. Returns false if Discord would not take it. */
export async function postTo(where: 'news' | 'updates', post: Post): Promise<boolean> {
  const cfg = await getDiscordConfig()
  const channel = cfg.channels[where]
  if (!channel || !(await botReady())) return false
  const url = post.href ? (post.href.startsWith('http') ? post.href : `${siteUrl}${post.href}`) : undefined
  const res = await postMessage(channel, postCard({ where, title: post.title, text: post.text.slice(0, 3800), url, label: post.label }))
  return res.ok
}

/** Welcome a new member in #system, once, with what they chose when they made their account. */
export async function welcomeMember(userId: string) {
  try {
    const cfg = await getDiscordConfig()
    if (!cfg.channels.system || !(await botReady())) return
    const d = await db()
    const done = await d.prepare('SELECT 1 AS x FROM settings WHERE key = ?1').bind(`discord:welcomed:${userId}`).first()
    if (done) return
    const p = await d
      .prepare(
        `SELECT p.handle, p.display_name, p.bio, p.avatar_key, p.banner_kind, p.banner_value, p.accent, p.country, p.links_json, p.niches_json, u.created_at,
           (SELECT COUNT(*) FROM users x WHERE x.created_at <= u.created_at AND x.email NOT LIKE 'deleted-%@deleted.invalid') AS n,
           (EXISTS (SELECT 1 FROM campaigns c WHERE c.brand_user_id = u.id)) AS brand
         FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?1`,
      )
      .bind(userId)
      .first<{ handle: string; display_name: string; bio: string; avatar_key: string | null; banner_kind: string; banner_value: string; accent: string; country: string | null; links_json: string; niches_json: string; created_at: number; n: number; brand: number }>()
    if (!p) return
    const parse = <T>(s: string, f: T): T => {
      try {
        return JSON.parse(s) as T
      } catch {
        return f
      }
    }
    const links = parse<{ platform: string }[]>(p.links_json, [])
    const niches = parse<string[]>(p.niches_json, [])
    const platforms = [...new Set(links.map((l) => l.platform).filter((x) => ['tiktok', 'youtube', 'instagram'].includes(x)))]
    const did = await discordIdFor(userId)
    const claimed = await d.prepare("INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?1, '1', ?2)").bind(`discord:welcomed:${userId}`, nowSec()).run()
    if (claimed.meta.changes !== 1) return
    await postMessage(
      cfg.channels.system,
      welcomeMemberCard({
        name: p.display_name,
        handle: p.handle,
        bio: p.bio,
        avatar: p.avatar_key ? abs(`/api/img/${p.avatar_key}`) : undefined,
        banner: p.banner_kind === 'image' ? abs(`/api/img/${p.banner_value}`) : undefined,
        member: p.n,
        brand: Boolean(p.brand),
        country: p.country,
        platforms,
        niches,
        discordId: did,
      }),
    )
  } catch {
    /* a welcome is a nice-to-have */
  }
}

const STATUS_KEY = 'discord:status-msg'
const STATUS_AT = 'discord:status-at'

/** Updates the live status card in #status (or posts it the first time). With `force` it ignores the two-minute pause. */
export async function refreshStatus(force = false): Promise<boolean> {
  try {
    const cfg = await getDiscordConfig()
    if (!cfg.channels.status || !(await botReady())) return false
    const d = await db()
    const t = nowSec()
    if (!force) {
      const last = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(STATUS_AT).first<{ value: string }>()
      if (last && t - Number(last.value) < 120) return false
    }
    await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(STATUS_AT, String(t), t).run()
    const msg = statusMessage(await runHealth())
    const saved = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(STATUS_KEY).first<{ value: string }>()
    const [savedChannel, savedMessage] = (saved?.value ?? ':').split(':')
    if (savedMessage && savedChannel === cfg.channels.status) {
      const edited = await discord('PATCH', `/channels/${savedChannel}/messages/${savedMessage}`, msg)
      if (edited.ok) return true
    }
    const posted = await postMessage(cfg.channels.status, msg)
    if (posted.ok && posted.json?.id) {
      await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(STATUS_KEY, `${cfg.channels.status}:${posted.json.id}`, t).run()
    }
    return posted.ok
  } catch {
    return false
  }
}

/** Refreshes the status card without making the caller wait. */
export const refreshStatusSoon = () => background(refreshStatus(false))
