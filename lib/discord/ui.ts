import { applyWording } from '../wording'
import { iconIds } from './icon-cache'
import type { IconName } from './icon-names'
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
/** The violet of the logo's gradient: the bar down the side of a card. */
export const ACCENT = 0x8647ff
/** The gradient banner on top of the big messages, and the bar along the bottom of every card. */
export const BANNER = `${SITE_URL}/discord/gradient-banner.jpg`
export const BAR = `${SITE_URL}/discord/gradient-bar.png`
export const OWNER_URL = 'https://owner.logoless.io'

/** The gradient icons in public/discord/icons (PNG, because embeds cannot show SVG): see scripts/make-discord-icons.mjs. */
export type { IconName }
// the ?v= is the picture's version: Discord keeps its own copy of every picture by its address, so a changed picture needs a changed address to show (the icons went from white to gradient: v=2)
export const icon = (name: IconName) => `${SITE_URL}/discord/icons/${name}.png?v=3`
/**
 * A gradient icon inside text (a title, a field, a line of a list): written as a token, and turned into the bot's own emoji of that name when the message is sent
 * (see `tidy`). Until the icons are uploaded to Discord, or in a place that cannot show them, it is simply left out.
 */
export const ic = (name: IconName) => `{ic:${name}}`

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
  /** The gradient along the bottom: on by default for a card with a title or fields, off for a one-line answer or a card that ended. */
  bar?: boolean
  time?: boolean | number
}

export function card(o: CardOptions): Embed {
  return {
    author: { name: o.label, icon_url: icon(o.icon) },
    title: o.title?.slice(0, 250),
    url: o.url,
    description: o.text?.slice(0, 4000),
    color: o.mute ? MUTE : ACCENT,
    fields: o.fields?.slice(0, 12).map((f) => ({ name: f.name.slice(0, 250), value: f.value.slice(0, 1000) || '-', inline: f.inline })),
    thumbnail: o.thumb ? { url: o.thumb } : undefined,
    image: o.image ? { url: o.image } : (o.bar ?? (!o.mute && Boolean(o.title || o.fields?.length))) ? { url: BAR } : undefined,
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
export const btn = (label: string, customId: string, withIcon?: IconName): Button => ({ type: 2, style: 2, label: label.slice(0, 80), custom_id: customId.slice(0, 100), ...(withIcon ? { icon: withIcon } : {}) })
export const row = (...b: Button[]): Component => ({ type: 1, components: b.slice(0, 5) })

/**
 * A button that opens an address: a path on logoless.io (like /campaign/x) or a full https address. Discord draws a small arrow on
 * every link button and that cannot be turned off, but it is the only kind of button that really takes you there.
 */
export const go = (label: string, where: string, withIcon?: IconName): Button => ({ type: 2, style: 5, label: label.slice(0, 80), url: where.startsWith('/') ? `${SITE_URL}${where}` : where, ...(withIcon ? { icon: withIcon } : {}) })

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
// no Unicode emoji anywhere (the gradient icons, the bar and the words do the job), and the site's wording: clip is submission or content.
// An icon written as {ic:name} becomes the bot's own emoji of that name (<:lg_name:id>) if it has been uploaded, and nothing if not.
const EMOJI = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu
const TOKEN = /\{ic:([a-z0-9]+)\}/g
const emojiOf = (name: string) => {
  const id = iconIds()[name]
  return id ? { id, name: `lg_${name}` } : null
}
const clean = (s: string | undefined) => {
  if (s === undefined) return s
  // the wording is applied to the words only, never to an icon's name
  const parts = s.split(TOKEN)
  const joined = parts.map((p, i) => (i % 2 ? (emojiOf(p) ? `<:lg_${p}:${iconIds()[p]}>` : '') : applyWording(p.replace(EMOJI, '')))).join('')
  return joined.replace(/ {2,}/g, ' ').trim()
}

/** Every text inside a Components V2 message gets the same treatment: no emoji, the site's wording, icons as the bot's emoji. A button's `icon` becomes its emoji. */
function tidyNode(n: unknown): unknown {
  if (Array.isArray(n)) return n.map(tidyNode)
  if (n && typeof n === 'object') {
    const out: Record<string, unknown> = {}
    const o = n as Record<string, unknown>
    for (const [k, v] of Object.entries(o)) {
      if (k === 'emoji' || k === 'icon') continue
      out[k] = (k === 'content' || k === 'label' || k === 'description' || k === 'placeholder') && typeof v === 'string' ? clean(v) : tidyNode(v)
    }
    if (typeof o.icon === 'string') {
      const e = emojiOf(o.icon)
      if (e) out.emoji = e
    }
    return out
  }
  return n
}

export function tidy(message: Message): Message {
  const { raw, ...m } = message
  if (raw) return m // words written by a person are sent exactly as they are
  // a Components V2 message (flag 1 << 15) is all components: there is no content or embed to tidy
  if (m.flags && m.flags & (1 << 15)) return { ...m, components: tidyNode(m.components) as Message['components'] }
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
    components: m.components?.map((r) => ('components' in r && Array.isArray(r.components) ? { ...r, components: (r as Component).components.map(({ icon: withIcon, ...c }) => ({ ...c, label: clean(c.label) ?? c.label, emoji: withIcon ? (emojiOf(withIcon) ?? undefined) : undefined })) } : r)) as Message['components'],
  }
}

/** Which icon goes with a kind of site notification. */
export const kindIcon = (kind: string): IconName =>
  ({ earning: 'money', payout: 'wallet', submission: 'clip', clip: 'clip', campaign: 'campaign', account: 'shield', badge: 'star', favorite: 'star', report: 'flag', inbox: 'mail', admin: 'shield' } as Record<string, IconName>)[kind] ?? 'bell'
