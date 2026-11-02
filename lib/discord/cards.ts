import type { Component, Embed, Message } from './api'
import { panel, plink } from './look'
import { big, card, go, join, num, row, SITE_URL } from './ui'

/**
 * The messages the bot sends, built from plain data. Nothing here reads the database or calls Discord.
 */
const quiet = { parse: [] as string[] }
const msg = (embeds: Embed[], components?: Component[]): Message => ({ embeds, components, allowed_mentions: quiet })
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

// ---------- small answers ----------
export const done = (text: string, title?: string) => msg([card({ icon: 'check', label: title ?? 'Done', text })])
export const problem = (text: string) => msg([card({ icon: 'cross', label: 'Could not do that', text, mute: true })])

// ---------- help, linking ----------
export const helpCard = (): Message =>
  msg(
    [
      card({
        icon: 'help',
        label: 'Help',
        title: 'logoless bot',
        text: join('`/link` `/unlink` `/sync` `/roles`', '`/profile` shows a page', '`/8ball` `/coinflip` `/roll` `/choose` `/hype`'),
      }),
    ],
    [row(go('Open logoless.io', '/'))],
  )

export const notLinkedCard = (): Message =>
  msg(
    [card({ icon: 'lock', label: 'Not connected', title: 'Connect your Discord', text: 'It takes a few seconds on logoless.io, and gives you your roles here.' })],
    [row(go('Connect Discord', '/api/discord/connect'))],
  )

// ---------- a page ----------
export type ProfileData = {
  name: string
  handle: string
  bio: string
  since: string
  /** Their pre-launch number, when they have one ("Founding member #3"). */
  member?: { n: number; founding: boolean }
}
/** Their page: the name, the address, one line of words and one button. */
export const profileCard = (p: ProfileData): Message =>
  msg(
    [
      card({
        icon: 'user',
        label: 'Page',
        title: p.name,
        url: `${SITE_URL}/${p.handle}`,
        text: join(`logoless.io/${p.handle}`, p.bio && clip(p.bio, 200), p.member && `**${p.member.founding ? 'Founding' : 'Verified'} member #${p.member.n}**`),
        foot: `Member since ${p.since}`,
      }),
    ],
    [row(go('Open page', `/${p.handle}`))],
  )

// ---------- posts from the team ----------
export const postCard = (a: { where: 'news' | 'updates'; title: string; text: string; url?: string; label?: string }): Message =>
  panel({
    banner: true,
    icon: a.where === 'news' ? 'megaphone' : 'sparkles',
    title: a.title,
    sub: `${a.where === 'news' ? 'News' : 'Product update'} · <t:${Math.floor(Date.now() / 1000)}:D>`,
    blocks: [clip(a.text, 3500)],
    buttons: a.url ? [plink(a.label ?? 'Read more', a.url, 'arrow')] : undefined,
  })

export const logCard = (a: { text: string }): Message => ({ content: clip(a.text, 1900), allowed_mentions: quiet })

// ---------- the team's own command ----------
export type SiteNow = { users: number; newToday: number; online: number; pages: number }
export const siteNowCard = (r: SiteNow): Message =>
  msg([
    card({
      icon: 'chart',
      label: 'Team',
      title: 'The site right now',
      text: big(num(r.users), 'people'),
      fields: [
        { name: 'New today', value: num(r.newToday), inline: true },
        { name: 'Online now', value: num(r.online), inline: true },
        { name: 'Pages made', value: num(r.pages), inline: true },
      ],
    }),
  ])
