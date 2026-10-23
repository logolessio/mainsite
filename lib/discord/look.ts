import type { Component, Embed, Message, V2Node } from './api'
import type { IconName } from './icon-names'
import { container, gallery, sep, text, v2 } from './v2'
import { icon, ic, SITE_URL } from './ui'

/**
 * The look of the bot's setup and welcome messages. One system, so every message reads as part of the same site:
 *  - no emoji anywhere. The picture in front of a title, a line or a button is one of our gradient icons (public/discord/icons), the bot's own emoji on Discord,
 *    written as {ic:name} in text and as an `icon` on a button (ui.ts turns them into the real thing when the message is sent, and into nothing if they have not
 *    been uploaded yet). An embed also shows its icon next to a small label at the top.
 *  - the gradient of the site: a banner on top of the big messages and a bar along the bottom of every card, the violet of it down the side
 *  - a title, one line under it in small type, then short bold headings with a line each, a divider between them
 *  - buttons: the main one is Discord's blurple (the nearest to the violet of the gradient), the rest grey, a red one only for something that removes
 * Pure data: nothing here reads the database.
 */
export const BANNER = `${SITE_URL}/discord/gradient-banner.jpg`
export const BAR = `${SITE_URL}/discord/gradient-bar.png`
/** The violet of the gradient: the bar down the side of a card. */
export const ACCENT = 0x8647ff

type Style = 'green' | 'grey' | 'blurple' | 'red'
// "green" is what the main button was called when it was green; it is the main (blurple) button now
const STYLE: Record<Style, 1 | 2 | 3 | 4> = { blurple: 1, green: 1, grey: 2, red: 4 }
type Button = Component['components'][number]

/** A button that sends `id` back to the bot. `withIcon` is the gradient icon in front of its label. */
export const pbtn = (label: string, id: string, style: Style = 'grey', withIcon?: IconName): Button => ({ type: 2, style: STYLE[style], label: label.slice(0, 80), custom_id: id.slice(0, 100), ...(withIcon ? { icon: withIcon } : {}) })
/** A button that opens an address (a path on logoless.io, or a full https address). */
export const plink = (label: string, where: string, withIcon?: IconName): Button => ({ type: 2, style: 5, label: label.slice(0, 80), url: where.startsWith('/') ? `${SITE_URL}${where}` : where, ...(withIcon ? { icon: withIcon } : {}) })
export const prow = (...b: Button[]): Component => ({ type: 1, components: b.slice(0, 5) })

/** The line that says the service is not open yet, shown on the welcome and setup messages for as long as the launch page is up. */
export function notice(end: number | null): string {
  const when = end ? `It opens <t:${end}:D> (<t:${end}:R>). ` : ''
  return `**logoless is not live yet, so there are no campaigns yet.** ${when}We are gathering our founding members first. Sign up now and link your accounts, and you will be ready (and verified) when the first campaigns arrive here.`
}

/**
 * An embed: a small gradient icon and label at the top (what kind of message it is), a title, the words, and the gradient along the bottom.
 * `notice` is the "not live yet" line, set in small type under the words.
 */
export function embedCard(o: {
  icon?: IconName
  label?: string
  title: string
  text?: string
  notice?: string | null
  fields?: { name: string; value: string; inline?: boolean }[]
  bar?: boolean
  thumb?: string
  foot?: string
}): Embed {
  return {
    author: o.icon || o.label ? { name: o.label ?? 'logoless', ...(o.icon ? { icon_url: icon(o.icon) } : {}) } : undefined,
    title: o.title.slice(0, 250),
    description: [o.text, o.notice ? `> ${o.notice}` : ''].filter(Boolean).join('\n\n').slice(0, 4000) || undefined,
    color: ACCENT,
    fields: o.fields?.map((f) => ({ name: f.name.slice(0, 250), value: f.value.slice(0, 1000), inline: f.inline ?? true })),
    thumbnail: o.thumb ? { url: o.thumb } : undefined,
    image: o.bar === false ? undefined : { url: BAR },
    footer: o.foot ? { text: o.foot } : undefined,
  }
}
export const embedMessage = (e: Embed, buttons?: Button[]): Message => ({ embeds: [e], components: buttons?.length ? [prow(...buttons)] : undefined, allowed_mentions: { parse: [] } })

/** A heading with its gradient icon in front, and a line of words under it: the building block of a panel. */
export const item = (withIcon: IconName, title: string, body?: string) => `### ${ic(withIcon)} ${title}${body ? `\n${body}` : ''}`

/**
 * A Components V2 card: the gradient banner on top (when asked), a big title with its icon, a line under it in small type, an optional notice, then blocks of
 * text with a divider between each, the gradient bar, and the buttons. At most ten parts fit in a container, so the blocks are the ones to keep few.
 */
export function panel(o: { banner?: boolean; accent?: number; icon?: IconName; title: string; sub?: string; notice?: string | null; blocks: string[]; buttons?: Button[]; bar?: boolean }): Message {
  const parts: (V2Node | Component)[] = []
  if (o.banner) parts.push(gallery({ url: BANNER }))
  parts.push(text(`# ${o.icon ? `${ic(o.icon)} ` : ''}${o.title}${o.sub ? `\n-# ${o.sub}` : ''}`))
  if (o.notice) parts.push(text(`> ${o.notice}`))
  o.blocks.forEach((b) => {
    parts.push(sep())
    parts.push(text(b))
  })
  if (o.bar !== false) parts.push(gallery({ url: BAR }))
  if (o.buttons?.length) parts.push(prow(...o.buttons))
  return v2(container(o.accent ?? ACCENT, ...parts))
}
