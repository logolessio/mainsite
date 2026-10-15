import { campaignRow } from '../campaigns-db'
import { db, nowSec } from '../db'
import { runHealth } from '../health'
import { abs, botReady, discord, type Embed, postMessage, siteUrl, WHITE, GREEN } from './api'
import { getDiscordConfig, slug } from './config'
import { discordIdFor } from './link'
import { logoUrl, statusMessage } from './panels'

const usd = (c: number) => `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
const linkRow = (label: string, url: string) => [{ type: 1 as const, components: [{ type: 2 as const, style: 5 as const, label, url }] }]

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
export async function logToDiscord(text: string) {
  try {
    const cfg = await getDiscordConfig()
    if (!cfg.channels.logs || !(await botReady())) return
    await postMessage(cfg.channels.logs, { content: text.slice(0, 1900), allowed_mentions: { parse: [] } })
  } catch {
    /* logging must never get in the way */
  }
}

/** A new campaign is live: tell the server, in the artist's own channel when there is one, otherwise in news. */
export async function announceCampaign(campaignId: string) {
  try {
    const cfg = await getDiscordConfig()
    if (!(await botReady())) return
    const c = await campaignRow(campaignId)
    if (!c) return
    const artist = cfg.artists.find((a) => slug(a.name) === slug(c.creator) || slug(a.name) === slug(c.title))
    const target = artist?.channel || cfg.channels.news
    if (!target) return
    const platforms = (() => {
      try {
        return (JSON.parse(c.platforms_json) as string[]).join(', ')
      } catch {
        return ''
      }
    })()
    const embed: Embed = {
      title: `New campaign: ${c.title}`,
      url: `${siteUrl}/campaign/${c.id}`,
      description: `${c.summary.slice(0, 300)}${c.summary.length > 300 ? '…' : ''}`,
      color: WHITE,
      thumbnail: abs(c.cover_url) ? { url: abs(c.cover_url)! } : undefined,
      fields: [
        { name: 'Pays', value: `${usd(c.rate_cents)} per 1,000 views`, inline: true },
        { name: 'Budget', value: usd(c.budget_cents), inline: true },
        ...(platforms ? [{ name: 'Platforms', value: platforms, inline: true }] : []),
      ],
      footer: { text: `${c.creator} · logoless` },
    }
    await postMessage(target, { embeds: [embed], components: linkRow('Open the campaign', `${siteUrl}/campaign/${c.id}`) })
  } catch {
    /* an announcement is a nice-to-have */
  }
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
    await postMessage(cfg.channels.clips, {
      embeds: [{ description: showEarnings ? `**${p.display_name}** just earned **${usd(netCents)}** on **${campaignTitle}**.` : `**${p.display_name}** just got paid on **${campaignTitle}**.`, url: `${siteUrl}/@${p.handle}`, color: GREEN }],
      allowed_mentions: { parse: [] },
    })
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
  const res = await postMessage(channel, {
    embeds: [{ title: post.title.slice(0, 250), description: post.text.slice(0, 3800) || undefined, url, color: WHITE, thumbnail: { url: logoUrl }, footer: { text: where === 'news' ? 'logoless news' : 'logoless update' }, timestamp: new Date().toISOString() }],
    components: url ? linkRow(post.label ?? 'Read more', url) : undefined,
    allowed_mentions: { parse: [] },
  })
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
    const color = /^#[0-9a-f]{6}$/i.test(p.accent) ? parseInt(p.accent.slice(1), 16) : WHITE
    const fields = [
      { name: 'Member', value: `#${p.n.toLocaleString('en-US')}`, inline: true },
      { name: 'Joined as', value: p.brand ? 'A brand' : 'A creator', inline: true },
      ...(p.country ? [{ name: 'From', value: p.country, inline: true }] : []),
      ...(platforms.length ? [{ name: 'Clips from', value: platforms.join(', '), inline: true }] : []),
      ...(niches.length ? [{ name: 'Into', value: niches.slice(0, 4).join(', '), inline: true }] : []),
    ]
    const claimed = await d.prepare("INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?1, '1', ?2)").bind(`discord:welcomed:${userId}`, nowSec()).run()
    if (claimed.meta.changes !== 1) return
    await postMessage(cfg.channels.system, {
      content: did ? `Welcome <@${did}>` : undefined,
      embeds: [
        {
          title: `Welcome, ${p.display_name}`,
          url: `${siteUrl}/@${p.handle}`,
          description: [`**@${p.handle}** just joined logoless.`, p.bio ? `“${p.bio.slice(0, 200)}”` : ''].filter(Boolean).join('\n'),
          color,
          thumbnail: p.avatar_key ? { url: abs(`/api/img/${p.avatar_key}`)! } : { url: logoUrl },
          image: p.banner_kind === 'image' ? { url: abs(`/api/img/${p.banner_value}`)! } : undefined,
          fields,
          footer: { text: 'logoless · welcome' },
        },
      ],
      components: linkRow('View profile', `${siteUrl}/@${p.handle}`),
      allowed_mentions: { parse: [] },
    })
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
