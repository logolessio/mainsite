import { db, nowSec } from '../db'
import { HttpError } from '../http'

/**
 * Who is who. A logoless account and a Discord account are joined two ways, both with Discord's own OAuth2 approval page: by
 * signing in with Discord (the id is kept by email, see auth.ts), or by "Connect Discord" in Settings (see connect.ts).
 */
const put = async (key: string, value: string) => {
  const d = await db()
  await d
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(key, value, nowSec())
    .run()
}
const del = async (key: string) => (await db()).prepare('DELETE FROM settings WHERE key = ?1').bind(key).run()
const get = async (key: string) => (await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(key).first<{ value: string }>())?.value ?? null

export async function discordIdFor(userId: string): Promise<string | null> {
  const direct = await get(`discord:${userId}`)
  if (direct) return direct
  const d = await db()
  // signed in with Discord: kept by email (see auth.ts)
  const r = await d.prepare("SELECT s.value FROM settings s JOIN users u ON s.key = 'discord-email:' || u.email WHERE u.id = ?1").bind(userId).first<{ value: string }>()
  return r?.value ?? null
}

export async function userByDiscord(discordId: string): Promise<string | null> {
  const direct = await get(`discord-user:${discordId}`)
  if (direct) return direct
  const d = await db()
  const r = await d.prepare("SELECT u.id FROM settings s JOIN users u ON s.key = 'discord-email:' || u.email WHERE s.value = ?1 LIMIT 1").bind(discordId).first<{ id: string }>()
  return r?.id ?? null
}

export async function linkDiscord(userId: string, discordId: string) {
  const owner = await userByDiscord(discordId)
  if (owner && owner !== userId) throw new HttpError(409, 'That Discord account is already linked to a different logoless account.')
  await put(`discord:${userId}`, discordId)
  await put(`discord-user:${discordId}`, userId)
}

export async function unlinkDiscord(userId: string) {
  const id = await get(`discord:${userId}`)
  await del(`discord:${userId}`)
  if (id) await del(`discord-user:${id}`)
  const d = await db()
  // also forget an automatic link made by signing in with Discord, so unlinking sticks
  await d.prepare("DELETE FROM settings WHERE key = (SELECT 'discord-email:' || email FROM users WHERE id = ?1)").bind(userId).run()
}

export async function dmEnabled(userId: string) {
  return (await get(`discord-dm:${userId}`)) !== 'off'
}
export async function setDmEnabled(userId: string, on: boolean) {
  if (on) await del(`discord-dm:${userId}`)
  else await put(`discord-dm:${userId}`, 'off')
}
