import { db, nowSec } from '../db'
import { botReady, discord, postMessage, sendDm } from './api'
import { getDiscordConfig } from './config'
import { discordIdFor } from './link'
import { embedCard, embedMessage, plink } from './look'
import { launchNotice } from './notice'
import { syncRoles } from './roles'
import { chan } from './ui'

/**
 * The Discord half of the pre-launch sign-up (the web half is lib/prelaunch.ts and /api/pre/*): giving the Founding member role, and the messages that go with
 * it. The role is what opens the community channels, so it is given only when the sign-up is let in.
 */
const GENERAL_KEY = 'discord:general-channel'

const get = async (key: string) => (await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(key).first<{ value: string }>())?.value ?? null

/** Where "Open Discord" should land: the general chat if there is one (found once, then remembered), otherwise the server itself. */
export async function communityUrl(opts: { look?: boolean } = {}): Promise<string | null> {
  const cfg = await getDiscordConfig()
  if (!cfg.guildId) return null
  let general = await get(GENERAL_KEY)
  if (!general && opts.look && (await botReady())) {
    const list = await discord<{ id: string; name: string; type: number }[]>('GET', `/guilds/${cfg.guildId}/channels`)
    general = (Array.isArray(list.json) ? list.json : []).find((c) => c.type === 0 && c.name === 'general')?.id ?? null
    if (general) await (await db()).prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(GENERAL_KEY, general, nowSec()).run()
  }
  return general ? chan(cfg.guildId, general) : `https://discord.com/channels/${cfg.guildId}`
}

/**
 * Gives the Founding member role (and any other role their account earns), says so in a direct message, and tells the team. Never throws: the web page must
 * still finish. Answers whether they are in the server: if not (the Discord sign-in could not add them), the role is given by the live loop once they have joined.
 */
export async function grantFounding(userId: string, n: number): Promise<boolean> {
  let inServer = true
  try {
    if (!(await botReady())) return true
    const did = await discordIdFor(userId)
    inServer = (await syncRoles(userId)).ok
    const url = await communityUrl({ look: true })
    if (did) {
      await sendDm(
        did,
        embedMessage(
          embedCard({
            title: `🏅 You are founding member #${n}`,
            text: 'Your **Founding member** role is on, so the community channels are open: general chat, introductions, clip showcase and the rest. Say hello.\n\nWe will message you here the moment the first campaigns go live.',
            notice: await launchNotice(),
          }),
          url ? [plink('Open the server', url, '💬')] : undefined,
        ),
      )
    }
    const cfg = await getDiscordConfig()
    if (cfg.channels.system) {
      const d = await db()
      const p = await d.prepare('SELECT p.handle, p.display_name FROM profiles p WHERE p.user_id = ?1').bind(userId).first<{ handle: string; display_name: string }>()
      await postMessage(cfg.channels.system, embedMessage(embedCard({ title: `🏅 Founding member #${n}`, text: p ? `**${p.display_name}** (@${p.handle}) finished the pre-launch sign-up.` : 'Someone finished the pre-launch sign-up.', bar: false })))
    }
  } catch {
    /* the role can be given again with /sync; finishing the sign-up must not fail because Discord is slow */
  }
  return inServer
}

/** A held sign-up was let through (the role is given) or turned down (a short, kind message). */
export async function tellDecision(userId: string, approved: boolean, n: number | null): Promise<void> {
  try {
    if (approved && n) return void (await grantFounding(userId, n))
    const did = await discordIdFor(userId)
    if (!did || !(await botReady())) return
    await sendDm(did, embedMessage(embedCard({ title: 'About your sign-up', text: 'We could not confirm your pre-launch sign-up, so the community channels stay closed for now. If that is a mistake, open a ticket in the server and we will take another look.', bar: false })))
  } catch {
    /* best effort */
  }
}
