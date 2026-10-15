import { db, nowSec } from '../db'

/** Where the bot posts and which Discord roles it hands out. Not secret, so it lives in the settings table and is edited from the admin area. */
export type DiscordConfig = {
  guildId: string
  channels: { announce: string; clips: string; leaderboard: string; logs: string; support: string }
  roles: { linked: string; clipper: string; brand: string; team: string; tiers: { minUsd: number; role: string }[] }
  dm: boolean // direct-message linked members their notifications
}

export const EMPTY: DiscordConfig = {
  guildId: '',
  channels: { announce: '', clips: '', leaderboard: '', logs: '', support: '' },
  roles: { linked: '', clipper: '', brand: '', team: '', tiers: [] },
  dm: true,
}

const KEY = 'discord:config'
export const snowflake = (v: unknown) => (typeof v === 'string' && /^\d{15,22}$/.test(v.trim()) ? v.trim() : '')

export function clean(input: unknown): DiscordConfig {
  const i = (input ?? {}) as Partial<DiscordConfig>
  const ch = (i.channels ?? {}) as Partial<DiscordConfig['channels']>
  const ro = (i.roles ?? {}) as Partial<DiscordConfig['roles']>
  const tiers = (Array.isArray(ro.tiers) ? ro.tiers : [])
    .map((t) => ({ minUsd: Math.max(0, Math.min(1_000_000, Math.round(Number(t?.minUsd) || 0))), role: snowflake(t?.role) }))
    .filter((t) => t.role)
    .sort((a, b) => a.minUsd - b.minUsd)
    .slice(0, 12)
  return {
    guildId: snowflake(i.guildId),
    channels: { announce: snowflake(ch.announce), clips: snowflake(ch.clips), leaderboard: snowflake(ch.leaderboard), logs: snowflake(ch.logs), support: snowflake(ch.support) },
    roles: { linked: snowflake(ro.linked), clipper: snowflake(ro.clipper), brand: snowflake(ro.brand), team: snowflake(ro.team), tiers },
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
