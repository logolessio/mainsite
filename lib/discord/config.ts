import { db, nowSec } from '../db'

/**
 * Where the bot posts and which Discord roles it hands out. Not secret, so it lives in the settings table and is edited from the
 * admin area. The server is laid out as: Welcome (get-started), Info (rules, site, support, status), Landing (news, system, updates),
 * the community, and one channel per artist.
 */
export type DiscordConfig = {
  guildId: string
  channels: {
    getStarted: string
    rules: string
    site: string
    support: string
    status: string
    news: string
    system: string
    updates: string
    clips: string
    logs: string
  }
  /** The category that private ticket channels are created under. */
  ticketCategory: string
  roles: { linked: string; clipper: string; brand: string; team: string; staff: string; tiers: { minUsd: number; role: string }[] }
  /** One channel per artist: the artist's name (as written on the campaign) and the channel its campaigns are announced in. */
  artists: { name: string; channel: string }[]
  dm: boolean // direct-message linked members their notifications
}

export const EMPTY_CHANNELS: DiscordConfig['channels'] = { getStarted: '', rules: '', site: '', support: '', status: '', news: '', system: '', updates: '', clips: '', logs: '' }

export const EMPTY: DiscordConfig = {
  guildId: '',
  channels: EMPTY_CHANNELS,
  ticketCategory: '',
  roles: { linked: '', clipper: '', brand: '', team: '', staff: '', tiers: [] },
  artists: [],
  dm: true,
}

const KEY = 'discord:config'
export const snowflake = (v: unknown) => (typeof v === 'string' && /^\d{15,22}$/.test(v.trim()) ? v.trim() : '')
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')

export function clean(input: unknown): DiscordConfig {
  const i = (input ?? {}) as Partial<DiscordConfig> & { channels?: Record<string, unknown> }
  const ch = (i.channels ?? {}) as Record<string, unknown>
  const ro = (i.roles ?? {}) as Partial<DiscordConfig['roles']>
  const tiers = (Array.isArray(ro.tiers) ? ro.tiers : [])
    .map((t) => ({ minUsd: Math.max(0, Math.min(1_000_000, Math.round(Number(t?.minUsd) || 0))), role: snowflake(t?.role) }))
    .filter((t) => t.role)
    .sort((a, b) => a.minUsd - b.minUsd)
    .slice(0, 12)
  const artists = (Array.isArray(i.artists) ? i.artists : [])
    .map((a) => ({ name: String(a?.name ?? '').trim().slice(0, 60), channel: snowflake(a?.channel) }))
    .filter((a) => a.name && a.channel)
    .slice(0, 60)
  return {
    guildId: snowflake(i.guildId),
    channels: {
      getStarted: snowflake(ch.getStarted),
      rules: snowflake(ch.rules),
      site: snowflake(ch.site),
      support: snowflake(ch.support),
      status: snowflake(ch.status),
      news: snowflake(ch.news) || snowflake(ch.announce), // "announce" was the first name for the news channel
      system: snowflake(ch.system),
      updates: snowflake(ch.updates),
      clips: snowflake(ch.clips),
      logs: snowflake(ch.logs),
    },
    ticketCategory: snowflake(i.ticketCategory),
    roles: { linked: snowflake(ro.linked), clipper: snowflake(ro.clipper), brand: snowflake(ro.brand), team: snowflake(ro.team), staff: snowflake(ro.staff), tiers },
    artists,
    dm: i.dm !== false,
  }
}

export async function getDiscordConfig(): Promise<DiscordConfig> {
  try {
    const d = await db()
    const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(KEY).first<{ value: string }>()
    return clean(r ? JSON.parse(r.value) : EMPTY)
  } catch {
    return EMPTY
  }
}

export async function saveDiscordConfig(c: unknown) {
  const cfg = clean(c)
  const d = await db()
  await d
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(KEY, JSON.stringify(cfg), nowSec())
    .run()
  return cfg
}

/** A link to a channel, for buttons and messages. */
export const channelUrl = (guildId: string, channelId: string) => `https://discord.com/channels/${guildId}/${channelId}`
