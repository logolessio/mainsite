import { botReady, sendDm } from './discord/api'
import { notificationCard } from './discord/cards'
import { kindIcon } from './discord/ui'
import { discordIdFor, dmEnabled } from './discord/link'
import { getDiscordConfig } from './discord/config'
import { contactPref } from './contact-pref'

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
    const pref = await contactPref(userId)
    if (pref === 'email' || pref === 'site') return false // they chose not to be messaged on Discord
    const id = await discordIdFor(userId)
    if (!id) return false
    return await sendDm(id, notificationCard({ kind: n.kind, icon: kindIcon(n.kind), title: n.title, body: n.body, href: n.href }))
  } catch {
    return false
  }
}
