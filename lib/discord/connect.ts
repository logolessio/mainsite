import { db, nowSec, setting } from '../db'
import { notify } from '../notify'
import { addRole, botReady } from './api'
import { getDiscordConfig } from './config'
import { linkDiscord } from './link'
import { exchangeCode, fetchMe, joinGuild } from './oauth'
import { syncRoles } from './roles'

/**
 * Connecting Discord to a logoless account, in two steps: start (remember who is connecting, send them to Discord to approve) and
 * finish (Discord sends them back with a one-time code). The site address for the redirect must be listed in the Discord
 * developer portal under OAuth2, Redirects: https://logoless.io/api/discord/callback (and the same for dev.logoless.io).
 */
const TTL = 10 * 60
const rand = () => [...crypto.getRandomValues(new Uint8Array(18))].map((b) => b.toString(16).padStart(2, '0')).join('')

/** The Discord application that signs people in. The same application is the bot, so its id is also the bot's. */
export async function oauthClient() {
  const id = (await setting('AUTH_DISCORD_ID')) ?? (await setting('DISCORD_APP_ID'))
  const secret = await setting('AUTH_DISCORD_SECRET')
  return id && secret ? { id: id.trim(), secret: secret.trim() } : null
}

/** A path on this site, or the settings page. Never an address on another site. */
export const safeBack = (v: string | null | undefined) => (v && /^\/(?!\/)[\w\-./?=&%#]*$/.test(v) ? v : '/dashboard/settings')

export async function startConnect(userId: string, back: string) {
  const state = rand()
  const d = await db()
  await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)').bind(`dstate:${state}`, JSON.stringify({ userId, back: safeBack(back), exp: nowSec() + TTL }), nowSec()).run()
  return state
}

export type Finished = { ok: true; back: string; joined: boolean } | { ok: false; back: string; why: 'state' | 'discord' | 'taken' | 'setup' }

/** Discord sent the person back: check it is the same person who started, link the account, add them to the server and give their roles. */
export async function finishConnect(a: { userId: string; code: string; state: string; origin: string }): Promise<Finished> {
  const d = await db()
  const row = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(`dstate:${a.state}`).first<{ value: string }>()
  await d.prepare('DELETE FROM settings WHERE key = ?1').bind(`dstate:${a.state}`).run() // works once
  let saved: { userId: string; back: string; exp: number } | null = null
  try {
    saved = row ? (JSON.parse(row.value) as { userId: string; back: string; exp: number }) : null
  } catch {
    saved = null
  }
  const back = safeBack(saved?.back)
  if (!saved || saved.userId !== a.userId || saved.exp < nowSec()) return { ok: false, back, why: 'state' }
  const client = await oauthClient()
  if (!client) return { ok: false, back, why: 'setup' }
  const token = await exchangeCode({ clientId: client.id, clientSecret: client.secret, code: a.code, origin: a.origin })
  const me = token ? await fetchMe(token.access) : null
  if (!token || !me) return { ok: false, back, why: 'discord' }
  try {
    await linkDiscord(a.userId, me.id)
  } catch {
    return { ok: false, back, why: 'taken' }
  }
  let joined = false
  const cfg = await getDiscordConfig()
  const botToken = await setting('DISCORD_BOT_TOKEN')
  if (cfg.guildId && botToken && token.scope.includes('guilds.join')) joined = await joinGuild({ botToken, guildId: cfg.guildId, discordId: me.id, accessToken: token.access, roles: [cfg.roles.unverified, cfg.roles.linked].filter(Boolean) })
  if (joined) await syncRoles(a.userId) // someone already in the server did not get the roles above
  // account and Discord both done: the next steps in #get-started and the rundown by direct message, once (see welcome.ts)
  const { welcomeOnce } = await import('./welcome')
  await welcomeOnce(a.userId)
  await notify(a.userId, { kind: 'account', title: 'Discord connected', body: `Linked to ${me.name}.${joined ? ' You are in the server now.' : ''} You will get your notifications there too.`, href: '/dashboard/settings', dedupe: `discord-linked:${me.id}:${nowSec()}` })
  return { ok: true, back, joined }
}

/**
 * Someone signed in with Discord (see auth.ts): the same approval covers joining the server, so add them and give them the
 * linked role, quietly. The sign-in never waits on, or fails because of, any of this.
 */
export async function joinAfterSignIn(discordId: string, accessToken: string | undefined) {
  try {
    if (!accessToken || !(await botReady())) return
    const cfg = await getDiscordConfig()
    const botToken = await setting('DISCORD_BOT_TOKEN')
    if (!cfg.guildId || !botToken) return
    // a new member comes in as Unverified (they see only #get-started until they have signed up); someone already in the server only gets Linked
    const ok = await joinGuild({ botToken, guildId: cfg.guildId, discordId, accessToken, roles: [cfg.roles.unverified, cfg.roles.linked].filter(Boolean) })
    if (ok && cfg.roles.linked) await addRole(cfg.guildId, discordId, cfg.roles.linked) // already a member: the roles above only apply to new ones
  } catch {
    /* nothing here may stop a sign-in */
  }
}

/** The address Discord sends people back to. On logoless.io and dev.logoless.io it is that address itself (the owner dashboard uses logoless.io). */
export function siteOrigin(req: Request) {
  const host = (req.headers.get('host') ?? new URL(req.url).host).toLowerCase().split(':')[0]
  if (host === 'dev.logoless.io') return 'https://dev.logoless.io'
  if (host === 'logoless.io' || host.endsWith('.logoless.io')) return 'https://logoless.io'
  return new URL(req.url).origin
}
