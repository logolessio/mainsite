import type { Component, Message, V2Node } from './api'

/**
 * Components V2: Discord's newer way of laying out a message. Instead of an embed there is a container (with the pale bar down its
 * side) holding text, separators, pictures, a gallery that plays video files in place, and rows of buttons. It is what lets a
 * campaign show an example edit that plays right in the channel. A message built this way carries the flag below and has no `content`
 * and no `embeds`; once a message is made this way it stays this way, so an older message is replaced rather than edited into one.
 */
export const V2_FLAG = 1 << 15

export const text = (content: string): V2Node => ({ type: 10, content: content.slice(0, 4000) })
export const sep = (divider = true, large = false): V2Node => ({ type: 14, divider, spacing: large ? 2 : 1 })
export const thumb = (url: string, description?: string): V2Node => ({ type: 11, media: { url }, ...(description ? { description: description.slice(0, 1024) } : {}) })
/** Pictures and video files shown together. A video file plays in place; a link to a page (TikTok, YouTube) cannot. */
export const gallery = (...items: { url: string; description?: string }[]): V2Node => ({ type: 12, items: items.slice(0, 10).map((i) => ({ media: { url: i.url }, ...(i.description ? { description: i.description.slice(0, 1024) } : {}) })) })
/** Words on the left and a small picture on the right. */
export const section = (texts: string[], accessory: V2Node): V2Node => ({ type: 9, components: texts.slice(0, 3).map(text), accessory })
export const container = (color: number, ...children: (V2Node | Component)[]): V2Node => ({ type: 17, accent_color: color, components: children.slice(0, 10) })
export const v2 = (...top: (V2Node | Component)[]): Message => ({ flags: V2_FLAG, components: top, allowed_mentions: { parse: [] } })

/** A direct video file (not a page): the only kind Discord plays in a message. */
export const isVideoFile = (url: string) => {
  try {
    return /\.(mp4|webm|mov|m4v)$/i.test(new URL(url).pathname)
  } catch {
    return false
  }
}
