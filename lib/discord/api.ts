import { setting } from '../db'
import { primeIcons } from './icon-prime'
import { tidy } from './ui'

// DISCORD_API_BASE is only for tests on a developer machine (a stand-in for Discord). It is never set on Cloudflare.
const API = (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' && process.env.DISCORD_API_BASE) || 'https://discord.com/api/v10'

export type Embed = {
  title?: string
  description?: string
  url?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
  thumbnail?: { url: string }
  image?: { url: string }
  footer?: { text: string; icon_url?: string }
  author?: { name: string; icon_url?: string; url?: string }
  timestamp?: string
}
export type Component = { type: 1; components: ({ type: 2; style: 1 | 2 | 3 | 4 | 5; label: string; custom_id?: string; url?: string; emoji?: { name: string; id?: string }; /** one of our gradient icons: becomes the button's emoji when the message is sent (see ui.ts) */ icon?: string; disabled?: boolean })[] }
/** A part of a Components V2 message (a container, a text display, a media gallery...): see v2.ts. */
export type V2Node = { type: number; [key: string]: unknown }
export type Message = { /** Words written by a person: posted exactly as they are (no wording changes, no emoji removed). */ raw?: boolean; content?: string; embeds?: Embed[]; components?: (Component | V2Node)[]; flags?: number; allowed_mentions?: { parse?: string[]; users?: string[]; roles?: string[] } }

// everything the bot says goes through `tidy` (see ui.ts): no emoji, the site's wording
const isMessagePath = (path: string) => /\/messages(\/|$)/.test(path)

export type Call<T = unknown> = { ok: boolean; status: number; json: T | null }

/** One call to Discord as the bot. Never throws; check `ok`. */
export async function discord<T = unknown>(method: string, path: string, body?: unknown, timeoutMs = 6000): Promise<Call<T>> {
  const token = await setting('DISCORD_BOT_TOKEN')
  if (!token) return { ok: false, status: 0, json: null }
  if (isMessagePath(path)) await primeIcons() // the gradient icons in a message need to be known before it is built (see ui.ts)
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { authorization: `Bot ${token}`, ...(body !== undefined ? { 'content-type': 'application/json' } : {}), 'user-agent': 'DiscordBot (https://logoless.io, 1.0)' },
      body: body !== undefined ? JSON.stringify(isMessagePath(path) ? tidy(body as Message) : body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
    const json = (await res.json().catch(() => null)) as T | null
    return { ok: res.ok, status: res.status, json }
  } catch {
    return { ok: false, status: 0, json: null }
  }
}

export const botReady = async () => Boolean((await setting('DISCORD_BOT_TOKEN')) && (await setting('DISCORD_APP_ID')) && (await setting('DISCORD_PUBLIC_KEY')))

export const postMessage = (channelId: string, m: Message) => discord<{ id: string }>('POST', `/channels/${channelId}/messages`, m)

export async function sendDm(discordId: string, m: Message): Promise<boolean> {
  const ch = await discord<{ id: string }>('POST', '/users/@me/channels', { recipient_id: discordId })
  if (!ch.ok || !ch.json?.id) return false
  return (await postMessage(ch.json.id, m)).ok
}

export const addRole = (guild: string, user: string, role: string) => discord('PUT', `/guilds/${guild}/members/${user}/roles/${role}`)
export const removeRole = (guild: string, user: string, role: string) => discord('DELETE', `/guilds/${guild}/members/${user}/roles/${role}`)
export const getMember = (guild: string, user: string) => discord<{ roles: string[]; user?: { username: string } }>('GET', `/guilds/${guild}/members/${user}`)

/** Replaces the bot's slash commands. With a guild id they appear at once; without, Discord can take up to an hour. */
export async function registerCommands(appId: string, guildId: string | null, commands: unknown[]) {
  return discord<unknown>('PUT', guildId ? `/applications/${appId}/guilds/${guildId}/commands` : `/applications/${appId}/commands`, commands, 15000)
}

/** Edits the reply to a slash command that was answered with "thinking…". No bot token needed: the interaction token is the key. */
export async function editOriginal(appId: string, interactionToken: string, m: Message) {
  await primeIcons()
  try {
    await fetch(`${API}/webhooks/${appId}/${interactionToken}/messages/@original`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(tidy(m)), signal: AbortSignal.timeout(8000) })
  } catch {
    /* the person simply keeps seeing "thinking" */
  }
}

/**
 * A follow-up to an interaction, for up to 15 minutes after it. With `ephemeral` only the person who pressed the button sees it:
 * this is the only way a bot can put a message in a channel that one person alone can see.
 */
export async function followUp(appId: string, interactionToken: string, m: Message, ephemeral = true): Promise<boolean> {
  await primeIcons()
  try {
    const res = await fetch(`${API}/webhooks/${appId}/${interactionToken}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...tidy(m), ...(ephemeral ? { flags: (m.flags ?? 0) | 64 } : {}) }), signal: AbortSignal.timeout(8000) })
    return res.ok
  } catch {
    return false
  }
}

export const siteUrl = 'https://logoless.io'
export const abs = (path: string | null | undefined) => (!path ? undefined : path.startsWith('http') ? path : `${siteUrl}${path.startsWith('/') ? '' : '/'}${path}`)

/**
 * Turns a refusal from Discord into a sentence that says what to do. Discord always sends a number saying why, and the
 * number matters more than the status: a 403 can mean "cannot see the channel" or "cannot post in it".
 */
export function explainDiscord(r: Call<unknown>, what = 'that channel'): string {
  const j = r.json as { code?: number; message?: string } | null
  const code = j?.code
  if (r.status === 401) return 'Discord rejected the bot token. Check DISCORD_BOT_TOKEN in Cloudflare.'
  if (code === 50001) return `The bot cannot see ${what} (Missing Access). Either it is not in this server, or the channel is hidden from it. Give the bot's role View Channel on that channel, or give the role Administrator.`
  if (code === 50013) return `The bot can see ${what} but is not allowed to post there (Missing Permissions). Allow Send Messages and Embed Links for the bot's role on that channel.`
  if (code === 10003) return `Discord says ${what} does not exist. Check the channel ID, and that it belongs to your server.`
  if (code === 10004) return 'Discord says that server does not exist. Check the server ID.'
  if (code === 50007) return 'That person has direct messages from server members switched off.'
  if (r.status === 0) return 'Could not reach Discord. Try again in a moment.'
  return `Discord refused it (${r.status}${code ? `, code ${code}` : ''}${j?.message ? `: ${j.message}` : ''}). Press "Check the bot's access" on the Discord page to see what is missing.`
}
