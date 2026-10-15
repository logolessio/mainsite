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
export type Message = { content?: string; embeds?: Embed[]; components?: Component[]; flags?: number; allowed_mentions?: { parse: string[] } }

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
