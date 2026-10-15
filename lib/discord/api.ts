import { setting } from '../db'

const API = 'https://discord.com/api/v10'

export type Embed = {
  title?: string
  description?: string
  url?: string
  color?: number
  fields?: { name: string; value: string; inline?: boolean }[]
  thumbnail?: { url: string }
  image?: { url: string }
  footer?: { text: string }
  author?: { name: string; icon_url?: string; url?: string }
  timestamp?: string
}
export type Component = { type: 1; components: ({ type: 2; style: 1 | 2 | 3 | 4 | 5; label: string; custom_id?: string; url?: string; emoji?: { name: string }; disabled?: boolean })[] }
export type Message = { content?: string; embeds?: Embed[]; components?: Component[]; flags?: number; allowed_mentions?: { parse?: string[]; users?: string[]; roles?: string[] } }

export const WHITE = 0xf3f2ee
export const GREEN = 0x5be09a
export const RED = 0xff6b5e

export type Call<T = unknown> = { ok: boolean; status: number; json: T | null }

/** One call to Discord as the bot. Never throws; check `ok`. */
export async function discord<T = unknown>(method: string, path: string, body?: unknown, timeoutMs = 6000): Promise<Call<T>> {
  const token = await setting('DISCORD_BOT_TOKEN')
  if (!token) return { ok: false, status: 0, json: null }
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { authorization: `Bot ${token}`, ...(body !== undefined ? { 'content-type': 'application/json' } : {}), 'user-agent': 'DiscordBot (https://logoless.io, 1.0)' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
  try {
    await fetch(`${API}/webhooks/${appId}/${interactionToken}/messages/@original`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(m), signal: AbortSignal.timeout(8000) })
  } catch {
    /* the person simply keeps seeing "thinking" */
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
