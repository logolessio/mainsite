import { botReady, sendDm } from './discord/api'
import { discordIdFor, dmEnabled } from './discord/link'
import { getDiscordConfig } from './discord/config'

/** Kept for the code that already calls it: who is this person on Discord, and can the bot reach them. */
export const discordIdOf = discordIdFor
export { botReady }

/** Sends a direct message to someone's linked Discord. Returns true if Discord accepted it. Never throws. */
export async function dmUser(userId: string, text: string): Promise<boolean> {
  try {
    if (!(await botReady())) return false
    const id = await discordIdFor(userId)
    if (!id) return false
    return await sendDm(id, { content: text.slice(0, 1900), allowed_mentions: { parse: [] } })
  } catch {
    return false
  }
}

/** Passes a site notification on to Discord, when the person linked it, did not switch it off, and the bot is set up. */
export async function dmNotification(userId: string, n: { kind: string; title: string; body?: string; href?: string }) {
  try {
    if (n.kind === 'favorite') return false // too noisy for a message in your inbox
    const cfg = await getDiscordConfig()
    if (!cfg.dm || !(await botReady()) || !(await dmEnabled(userId))) return false
    const id = await discordIdFor(userId)
    if (!id) return false
    const url = n.href ? (n.href.startsWith('http') ? n.href : `https://logoless.io${n.href}`) : undefined
    return await sendDm(id, { embeds: [{ title: n.title.slice(0, 250), description: n.body?.slice(0, 500), url, color: 0xf3f2ee, footer: { text: 'logoless' } }], allowed_mentions: { parse: [] } })
  } catch {
    return false
  }
}
