import { db, setting } from './db'

/**
 * The logoless Discord bot. For now it only sends direct messages, and only when a bot token (DISCORD_BOT_TOKEN) is set.
 * Until then every call quietly does nothing, so features that want to message someone can already call it.
 * It is meant for people who signed up without an email address: it is the only way to reach them.
 */
export async function discordIdOf(userId: string): Promise<string | null> {
  try {
    const d = await db()
    // saved by email when someone signs in with Discord (see auth.ts), so it works before their account row exists
    const r = await d.prepare("SELECT s.value FROM settings s JOIN users u ON s.key = 'discord-email:' || u.email WHERE u.id = ?1").bind(userId).first<{ value: string }>()
    return r?.value ?? null
  } catch {
    return null
  }
}

export async function botReady() {
  return Boolean(await setting('DISCORD_BOT_TOKEN'))
}

/** Sends a direct message. Returns true if Discord accepted it. Never throws. */
export async function dmUser(userId: string, text: string): Promise<boolean> {
  try {
    const token = await setting('DISCORD_BOT_TOKEN')
    const id = await discordIdOf(userId)
    if (!token || !id) return false
    const headers = { authorization: `Bot ${token}`, 'content-type': 'application/json' }
    const ch = await fetch('https://discord.com/api/v10/users/@me/channels', { method: 'POST', headers, body: JSON.stringify({ recipient_id: id }) })
    if (!ch.ok) return false
    const { id: channel } = (await ch.json()) as { id?: string }
    if (!channel) return false
    const sent = await fetch(`https://discord.com/api/v10/channels/${channel}/messages`, { method: 'POST', headers, body: JSON.stringify({ content: text.slice(0, 1900) }) })
    return sent.ok
  } catch {
    return false
  }
}
