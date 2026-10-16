/**
 * Connecting a Discord account with OAuth2, the standard "Sign in with Discord" way. The person approves on Discord's own page:
 * who they are (identify) and that the logoless bot may add them to the server (guilds.join). We keep the Discord id and nothing
 * else: the access token is used once, right away, to add them to the server, and is then thrown away.
 * Nothing in this file reads the database or the settings, so it can be tested on its own.
 */
const API = 'https://discord.com/api/v10'
export const SCOPES = 'identify guilds.join'

export const redirectUri = (origin: string) => `${origin}/api/discord/callback`

export function authorizeUrl(a: { clientId: string; origin: string; state: string }) {
  const q = new URLSearchParams({ client_id: a.clientId, response_type: 'code', redirect_uri: redirectUri(a.origin), scope: SCOPES, state: a.state, prompt: 'none' })
  return `https://discord.com/oauth2/authorize?${q}`
}

export type Token = { access: string; scope: string }

/** Trades the one-time code for an access token. Returns null if Discord refuses (a used or expired code, a wrong redirect address). */
export async function exchangeCode(a: { clientId: string; clientSecret: string; code: string; origin: string }): Promise<Token | null> {
  try {
    const res = await fetch(`${API}/oauth2/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: a.clientId, client_secret: a.clientSecret, grant_type: 'authorization_code', code: a.code, redirect_uri: redirectUri(a.origin) }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const j = (await res.json()) as { access_token?: string; scope?: string }
    return j.access_token ? { access: j.access_token, scope: j.scope ?? '' } : null
  } catch {
    return null
  }
}

export type DiscordMe = { id: string; username: string; name: string }

export async function fetchMe(token: string): Promise<DiscordMe | null> {
  try {
    const res = await fetch(`${API}/users/@me`, { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const j = (await res.json()) as { id?: string; username?: string; global_name?: string | null }
    return j.id && /^\d{15,22}$/.test(j.id) ? { id: j.id, username: j.username ?? '', name: j.global_name || j.username || '' } : null
  } catch {
    return null
  }
}

/**
 * Adds the person to the server, as the bot (needs the bot in the server, with Create Invite) and with the access token they just
 * granted. `roles` are given when they are added. true when they are in the server afterwards (added now or already there).
 */
export async function joinGuild(a: { botToken: string; guildId: string; discordId: string; accessToken: string; roles?: string[] }): Promise<boolean> {
  try {
    const res = await fetch(`${API}/guilds/${a.guildId}/members/${a.discordId}`, {
      method: 'PUT',
      headers: { authorization: `Bot ${a.botToken}`, 'content-type': 'application/json', 'user-agent': 'DiscordBot (https://logoless.io, 1.0)' },
      body: JSON.stringify({ access_token: a.accessToken, ...(a.roles?.length ? { roles: a.roles } : {}) }),
      signal: AbortSignal.timeout(8000),
    })
    return res.status === 201 || res.status === 204
  } catch {
    return false
  }
}
