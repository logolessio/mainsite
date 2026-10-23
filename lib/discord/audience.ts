import { db } from '../db'
import { discord } from './api'
import { getDiscordConfig } from './config'

/**
 * The numbers to show an artist before there are any campaigns: how many people are in the server, how many made an account, how many proved a TikTok,
 * YouTube or Instagram account is theirs, and how many followers the proven TikTok accounts have between them (read from the profile at the moment of proof;
 * the other platforms do not give a follower count that can be trusted, so they are counted but not added up).
 */
export type Audience = {
  members: number | null // people in the Discord server (Discord's own count), null when it cannot be read
  accounts: number // logoless accounts made
  linked: number // accounts linked to a Discord
  withAccounts: number // accounts that have linked at least one social account
  verified: { tiktok: number; youtube: number; instagram: number } // social accounts proven with a code in the bio (or by the team)
  verifiedPeople: number // people with at least one proven account
  tiktokFollowers: number // followers of the proven TikTok accounts, added up
  paypal: number // people who added a PayPal address
}

export async function audience(): Promise<Audience> {
  const d = await db()
  const one = async (sql: string) => (await d.prepare(sql).first<{ n: number }>())?.n ?? 0
  const cfg = await getDiscordConfig()
  let members: number | null = null
  if (cfg.guildId) {
    const g = await discord<{ approximate_member_count?: number }>('GET', `/guilds/${cfg.guildId}?with_counts=true`)
    if (g.ok && typeof g.json?.approximate_member_count === 'number') members = g.json.approximate_member_count
  }
  const [accounts, direct, byLogin, withAccounts, tt, yt, ig, people, followers, paypal] = await Promise.all([
    one("SELECT COUNT(*) AS n FROM users WHERE email NOT LIKE 'deleted-%@deleted.invalid'"),
    one("SELECT COUNT(*) AS n FROM settings WHERE key LIKE 'discord-user:%'"),
    one("SELECT COUNT(*) AS n FROM settings WHERE key LIKE 'discord-email:%'"),
    one("SELECT COUNT(*) AS n FROM profiles WHERE links_json != '[]'"),
    one("SELECT COUNT(*) AS n FROM settings WHERE key LIKE 'acctowner:tiktok:%'"),
    one("SELECT COUNT(*) AS n FROM settings WHERE key LIKE 'acctowner:youtube:%'"),
    one("SELECT COUNT(*) AS n FROM settings WHERE key LIKE 'acctowner:instagram:%'"),
    one("SELECT COUNT(DISTINCT value) AS n FROM settings WHERE key LIKE 'acctowner:%'"),
    // only accounts that are still proven by the person who proved them
    one("SELECT COALESCE(SUM(CAST(json_extract(f.value, '$.n') AS INTEGER)), 0) AS n FROM settings f JOIN settings o ON o.key = 'acctowner:' || substr(f.key, 7) AND o.value = json_extract(f.value, '$.u') WHERE f.key LIKE 'acctf:tiktok:%'"),
    one("SELECT COUNT(*) AS n FROM settings WHERE key LIKE 'paypal-emails:%'"),
  ])
  return { members, accounts, linked: direct + byLogin, withAccounts, verified: { tiktok: tt, youtube: yt, instagram: ig }, verifiedPeople: people, tiktokFollowers: followers, paypal }
}

/** 8400000 becomes "8.4M", 12300 "12.3K". */
export const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}K` : String(n)).replace('.0', '')

/** One line for a pitch or a card: "1,240 members · 310 creators with a proven account · 8.4M TikTok followers between them". */
export function pitchLine(a: Audience): string {
  const parts = [
    a.members ? `${a.members.toLocaleString('en-US')} members` : `${a.accounts.toLocaleString('en-US')} accounts`,
    a.verifiedPeople > 0 && `${a.verifiedPeople.toLocaleString('en-US')} creators with a proven account`,
    a.tiktokFollowers > 0 && `${short(a.tiktokFollowers)} TikTok followers between them`,
  ].filter(Boolean)
  return parts.join(' · ')
}
