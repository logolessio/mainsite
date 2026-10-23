import type { Component, Embed, Message, V2Node } from './api'
import { container, gallery, sep, text, v2 } from './v2'
import { SITE_URL } from './ui'

/**
 * The look of the bot's setup and welcome messages, taken from the servers whose bots people already know (a rules message with a heading and a divider per
 * rule, panels with two or three titled buttons, a brief with a checklist and a progress bar): a title with a picture word in front, short bold headings,
 * dividers, coloured buttons (green for the main one, grey for the rest, blue for a check), and our gradient along the edge of every card.
 *
 * Unlike the older messages (see ui.ts, which strips every emoji), these are marked `raw` so their emoji stay. Pure data: nothing here reads the database.
 */
export const BANNER = `${SITE_URL}/discord/gradient-banner.jpg`
export const BAR = `${SITE_URL}/discord/gradient-bar.png`
/** The violet of the gradient: the bar down the side of a card. */
export const ACCENT = 0x8647ff
export const GREEN = 0x3ba55d

type Style = 'green' | 'grey' | 'blurple' | 'red'
const STYLE: Record<Style, 1 | 2 | 3 | 4> = { blurple: 1, grey: 2, green: 3, red: 4 }
type Button = Component['components'][number]

/** A button that sends `id` back to the bot. `emoji` is the picture word in front of its label. */
export const pbtn = (label: string, id: string, style: Style = 'grey', emoji?: string): Button => ({ type: 2, style: STYLE[style], label: label.slice(0, 80), custom_id: id.slice(0, 100), ...(emoji ? { emoji: { name: emoji } } : {}) })
/** A button that opens an address (a path on logoless.io, or a full https address). */
export const plink = (label: string, where: string, emoji?: string): Button => ({ type: 2, style: 5, label: label.slice(0, 80), url: where.startsWith('/') ? `${SITE_URL}${where}` : where, ...(emoji ? { emoji: { name: emoji } } : {}) })
export const prow = (...b: Button[]): Component => ({ type: 1, components: b.slice(0, 5) })

/** The line that says the service is not open yet, shown on the welcome and setup messages for as long as the launch page is up. */
export function notice(end: number | null): string {
  const when = end ? `It opens <t:${end}:D> (<t:${end}:R>). ` : ''
  return `🚧 **logoless is not live yet, so there are no campaigns yet.** ${when}We are gathering our founding members first. Set up your account and link your accounts now, and you will be ready (and verified) when the first campaigns arrive here.`
}

/** An embed in the new look: a titled card with the gradient along the bottom. */
export function embedCard(o: { title: string; text?: string; notice?: string | null; fields?: { name: string; value: string; inline?: boolean }[]; bar?: boolean; thumb?: string; foot?: string }): Embed {
  return {
    title: o.title.slice(0, 250),
    description: [o.text, o.notice ? `> ${o.notice}` : ''].filter(Boolean).join('\n\n').slice(0, 4000) || undefined,
    color: ACCENT,
    fields: o.fields?.map((f) => ({ name: f.name.slice(0, 250), value: f.value.slice(0, 1000), inline: f.inline ?? true })),
    thumbnail: o.thumb ? { url: o.thumb } : undefined,
    image: o.bar === false ? undefined : { url: BAR },
    footer: o.foot ? { text: o.foot } : undefined,
  }
}
export const embedMessage = (e: Embed, buttons?: Button[]): Message => ({ raw: true, embeds: [e], components: buttons?.length ? [prow(...buttons)] : undefined, allowed_mentions: { parse: [] } })

/**
 * A Components V2 card: the gradient banner on top (when asked), a big title, a line under it, an optional notice, then blocks of text with a divider between each,
 * the gradient bar, and the buttons. At most ten parts fit in a container, so the blocks are the ones to keep few.
 */
export function panel(o: { banner?: boolean; accent?: number; title: string; sub?: string; notice?: string | null; blocks: string[]; buttons?: Button[]; bar?: boolean }): Message {
  const parts: (V2Node | Component)[] = []
  if (o.banner) parts.push(gallery({ url: BANNER }))
  parts.push(text(`# ${o.title}${o.sub ? `\n-# ${o.sub}` : ''}`))
  if (o.notice) parts.push(text(`> ${o.notice}`))
  o.blocks.forEach((b) => {
    parts.push(sep())
    parts.push(text(b))
  })
  if (o.bar !== false) parts.push(gallery({ url: BAR }))
  if (o.buttons?.length) parts.push(prow(...o.buttons))
  return { ...v2(container(o.accent ?? ACCENT, ...parts)), raw: true }
}
