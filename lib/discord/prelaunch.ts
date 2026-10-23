import { db, nowSec } from '../db'
import { launchNotice } from './notice'
import { botReady, discord, postMessage, sendDm } from './api'
import { getDiscordConfig } from './config'
import { discordIdFor } from './link'
import { welcomeCard, welcomeDmMessage, rejectionMessage, type Who } from './member-cards'
import { syncRoles } from './roles'
import { chan } from './ui'

/**
 * The Discord half of the pre-launch sign-up (the web half is lib/prelaunch.ts and /api/pre/*). When someone finishes it they are made Verified (and, if the site is
 * still shut, a founding member): the Unverified role comes off, the server opens for them, a clean welcome goes up in the welcome channel with their Discord
 * picture and their status, and a direct message tells them the same, and whether they are a founding member.
 */

const get = async (key: string) => (await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(key).first<{ value: string }>())?.value ?? null
const put = async (key: string, value: string) =>
  void (await (await db()).prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(key, value, nowSec()).run())

/** The id of the text channel with this name (found once, then remembered). `look` allows asking Discord; without it only what is remembered is used. */
async function channelNamed(name: string, look: boolean): Promise<string | null> {
  const cached = await get(`discord:chan:${name}`)
  if (cached) return cached
  const old = name === 'general' ? await get('discord:general-channel') : null // where it was kept before
  if (old) return old
  if (!look || !(await botReady())) return null
  const cfg = await getDiscordConfig()
  if (!cfg.guildId) return null
  const list = await discord<{ id: string; name: string; type: number }[]>('GET', `/guilds/${cfg.guildId}/channels`)
  const found = (Array.isArray(list.json) ? list.json : []).find((c) => c.type === 0 && c.name === name)?.id ?? null
  if (found) await put(`discord:chan:${name}`, found)
  return found
}

/** Where "Open the server" should land: the general chat if there is one, otherwise the server itself. */
export async function communityUrl(opts: { look?: boolean } = {}): Promise<string | null> {
  const cfg = await getDiscordConfig()
  if (!cfg.guildId) return null
  const general = await channelNamed('general', Boolean(opts.look))
  return general ? chan(cfg.guildId, general) : `https://discord.com/channels/${cfg.guildId}`
}

/** A person's Discord picture (or, with none, the grey default for their id), as an address Discord can show. */
async function avatarOf(discordId: string): Promise<string> {
  const u = await discord<{ avatar?: string | null }>('GET', `/users/${discordId}`)
  const hash = u.json?.avatar
  if (hash) return `https://cdn.discordapp.com/avatars/${discordId}/${hash}.${hash.startsWith('a_') ? 'gif' : 'png'}?size=256`
  return `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(discordId) >> BigInt(22)) % 6}.png`
}

/**
 * Makes someone Verified: the roles are brought in line with their account (Verified on, Unverified off, Founding member if they were let in before the site opened),
 * the welcome goes up for everyone, and they get the direct message. Never throws: the web page must still finish. Answers whether they are in the server: if not
 * (the Discord sign-in could not add them), the live loop gives them their roles once they have joined.
 */
export async function grantVerified(userId: string, n: number, founding: boolean): Promise<boolean> {
  let inServer = true
  try {
    if (!(await botReady())) return true
    const did = await discordIdFor(userId)
    inServer = (await syncRoles(userId)).ok
    const cfg = await getDiscordConfig()
    const d = await db()
    const p = await d.prepare('SELECT p.handle, p.display_name FROM profiles p WHERE p.user_id = ?1').bind(userId).first<{ handle: string; display_name: string }>()
    const who: Who = { name: p?.display_name || 'there', handle: p?.handle ?? null, discordId: did, n, founding }
    // the welcome in the welcome channel (or the general chat, or the staff channel if neither exists), once
    if (inServer && did) {
      const claimed = await d.prepare("INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?1, '1', ?2)").bind(`discord:welcomed-public:${userId}`, nowSec()).run()
      if (claimed.meta.changes === 1) {
        const target = (await channelNamed('welcome', true)) ?? (await channelNamed('general', true)) ?? cfg.channels.system
        if (target) await postMessage(target, welcomeCard({ ...who, avatar: await avatarOf(did), at: nowSec() }))
      }
    }
    if (did) await sendDm(did, welcomeDmMessage(who, await communityUrl({ look: true }), await launchNotice()))
  } catch {
    /* the roles can be given again with /sync; finishing the sign-up must not fail because Discord is slow */
  }
  return inServer
}

/** A held sign-up was let through (they are made Verified) or turned down (a short, kind message). */
export async function tellDecision(userId: string, approved: boolean, n: number | null, founding = true): Promise<void> {
  try {
    if (approved && n) return void (await grantVerified(userId, n, founding))
    const did = await discordIdFor(userId)
    if (!did || !(await botReady())) return
    await sendDm(did, rejectionMessage())
  } catch {
    /* best effort */
  }
}
