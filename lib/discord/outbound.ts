import { botReady, postMessage, siteUrl } from './api'
import { logCard, postCard } from './cards'
import { getDiscordConfig } from './config'
import type { IconName } from './ui'

/** A line in the team's log channel: plain text, nothing else. Quiet when the bot is not set up. (The icon is kept for old callers.) */
export async function logToDiscord(text: string, _icon?: IconName) {
  void _icon
  try {
    const cfg = await getDiscordConfig()
    if (!cfg.channels.logs || !(await botReady())) return
    await postMessage(cfg.channels.logs, logCard({ text }))
  } catch {
    /* logging must never get in the way */
  }
}

export type Post = { title: string; text: string; href?: string; label?: string }

/** An announcement from the team, in #news or #updates. Returns false if Discord would not take it. */
export async function postTo(where: 'news' | 'updates', post: Post): Promise<boolean> {
  const cfg = await getDiscordConfig()
  const channel = cfg.channels[where]
  if (!channel || !(await botReady())) return false
  const url = post.href ? (post.href.startsWith('http') ? post.href : `${siteUrl}${post.href}`) : undefined
  const res = await postMessage(channel, postCard({ where, title: post.title, text: post.text.slice(0, 3800), url, label: post.label }))
  return res.ok
}
