import { applyWording } from '../wording'
import type { Component, Embed, Message } from './api'

/**
 * How every message from the bot looks. One style, so it reads the same wherever it shows up:
 *  - monochrome: a pale bar for normal things, a grey one for endings and problems, our own line icons, no emoji
 *  - a small header (icon and the kind of message), a short title, then the one thing that matters in large type
 *  - buttons are all plain grey. A button that opens a page is a real link button (`go` below; Discord draws a small arrow on those),
 *    the others run a command or open a form
 *  - short: a few lines and a button to the site, where the real work happens (set-up, details, instructions)
 *  - words written by a person (tickets) are sent as plain text, exactly as written
 */
export const INK = 0xf3f2ee
export const MUTE = 0x8a8a90

export const SITE_URL = 'https://logoless.io'
export const OWNER_URL = 'https://owner.logoless.io'

/** The line icons in public/discord/icons (PNG, because embeds cannot show SVG). */
export type IconName =
  | 'bell' | 'book' | 'campaign' | 'chart' | 'check' | 'clip' | 'clock' | 'cross' | 'eye' | 'flag' | 'help' | 'info' | 'link'
  | 'lock' | 'logo' | 'mail' | 'money' | 'plus' | 'shield' | 'spark' | 'star' | 'ticket' | 'trophy' | 'user' | 'users' | 'wallet'
export const icon = (name: IconName) => `${SITE_URL}/discord/icons/${name}.png`

type Field = { name: string; value: string; inline?: boolean }
export type CardOptions = {
  icon: IconName
  /** The small line at the top: what kind of message this is. */
  label: string
  title?: string
  url?: string
  /** The body. Markdown, with `big()` for a figure and `small()` for fine print. */
  text?: string
  fields?: Field[]
  thumb?: string
  image?: string
  foot?: string
  /** A grey bar for something that ended or went wrong. */
  mute?: boolean
  time?: boolean | number
}

export function card(o: CardOptions): Embed {
  return {
    author: { name: o.label, icon_url: icon(o.icon) },
    title: o.title?.slice(0, 250),
    url: o.url,
    description: o.text?.slice(0, 4000),
    color: o.mute ? MUTE : INK,
    fields: o.fields?.slice(0, 12).map((f) => ({ name: f.name.slice(0, 250), value: f.value.slice(0, 1000) || '-', inline: f.inline })),
    thumbnail: o.thumb ? { url: o.thumb } : undefined,
    image: o.image ? { url: o.image } : undefined,
    footer: o.foot ? { text: o.foot.slice(0, 200) } : undefined,
    timestamp: o.time ? new Date(typeof o.time === 'number' ? o.time * 1000 : Date.now()).toISOString() : undefined,
  }
}

// ---------- the few bits of markup we use ----------
/** A figure in large type with a line of fine print under it. */
export const big = (value: string, note?: string) => `## ${value}${note ? `\n-# ${note}` : ''}`
export const small = (text: string) => `-# ${text}`
/** A word in a small grey pill, for statuses. */
export const chip = (text: string) => `\`${text}\``
export const bullets = (list: string[]) => list.map((x) => `• ${x}`).join('\n')
export const join = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join('\n')
export const dot = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' · ')
/** Ten blocks that fill with a percentage. */
export const meter = (pct: number) => {
  const filled = Math.max(0, Math.min(10, Math.round(pct / 10)))
  return `${'▰'.repeat(filled)}${'▱'.repeat(10 - filled)}`
}
export const usd = (cents: number, whole = false) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`
export const num = (n: number) => n.toLocaleString('en-US')

// ---------- buttons ----------
type Button = Component['components'][number]
/** A plain grey button that sends `custom_id` back to the bot. */
export const btn = (label: string, customId: string): Button => ({ type: 2, style: 2, label: label.slice(0, 80), custom_id: customId.slice(0, 100) })
export const row = (...b: Button[]): Component => ({ type: 1, components: b.slice(0, 5) })

/**
 * A button that opens an address: a path on logoless.io (like /campaign/x) or a full https address. Discord draws a small arrow on
 * every link button and that cannot be turned off, but it is the only kind of button that really takes you there.
 */
export const go = (label: string, where: string): Button => ({ type: 2, style: 5, label: label.slice(0, 80), url: where.startsWith('/') ? `${SITE_URL}${where}` : where })

/** The address of a channel in the server. */
export const chan = (guildId: string, channelId: string) => `https://discord.com/channels/${guildId}/${channelId}`

/** Older messages have buttons that ask the bot for the address (`go:` ids). They still work. */
export function goTarget(id: string, guildId?: string): { url: string; label: string } | null {
  const raw = id.slice(3)
  if (raw.startsWith('#') && guildId) return { url: `https://discord.com/channels/${guildId}/${raw.slice(1)}`, label: 'this channel' }
  if (raw.startsWith('o:')) return { url: `${OWNER_URL}${raw.slice(2)}`, label: 'owner dashboard' }
  if (raw.startsWith('/')) return { url: `${SITE_URL}${raw}`, label: `logoless.io${raw === '/' ? '' : raw}` }
  if (/^https:\/\/(logoless\.io|owner\.logoless\.io|dev\.logoless\.io)(\/|$)/.test(raw)) return { url: raw, label: raw.replace('https://', '') }
  return null
}

// ---------- tidying a whole message before it is sent ----------
// no emoji anywhere (the bar, the icons and the words do the job), and the site's wording: clip is submission or content
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu
const clean = (s: string | undefined) => (s === undefined ? s : applyWording(s.replace(EMOJI, '').replace(/ {2,}/g, ' ').trim()))

export function tidy(message: Message): Message {
  const { raw, ...m } = message
  if (raw) return m // words written by a person are sent exactly as they are
  return {
    ...m,
    content: clean(m.content),
    embeds: m.embeds?.map((e) => ({
      ...e,
      title: clean(e.title),
      description: clean(e.description),
      author: e.author ? { ...e.author, name: clean(e.author.name) ?? '' } : undefined,
      footer: e.footer ? { ...e.footer, text: clean(e.footer.text) ?? '' } : undefined,
      fields: e.fields?.map((f) => ({ ...f, name: clean(f.name) || '-', value: clean(f.value) || '-' })),
    })),
    components: m.components?.map((r) => ({ ...r, components: r.components.map((c) => ({ ...c, label: clean(c.label) ?? c.label, emoji: undefined })) })),
  }
}

/** Which icon goes with a kind of site notification. */
export const kindIcon = (kind: string): IconName =>
  ({ earning: 'money', payout: 'wallet', submission: 'clip', clip: 'clip', campaign: 'campaign', account: 'shield', badge: 'star', favorite: 'star', report: 'flag', inbox: 'mail', admin: 'shield' } as Record<string, IconName>)[kind] ?? 'bell'
