import { SITE } from './site'

/** One entry in the list the owner edits under Socials and links. It can appear as an icon in the footer, as a row on /links, or both. */
export type LinkItem = { id: string; platform: string; label: string; url: string; footer: boolean; page: boolean }

/** The places a link can point to, with the icon file in /public/brands. "website" is any other address. */
export const PLATFORMS: { id: string; label: string }[] = [
  { id: 'website', label: 'Website' },
  { id: 'discord', label: 'Discord' },
  { id: 'x', label: 'X' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'twitch', label: 'Twitch' },
  { id: 'kick', label: 'Kick' },
  { id: 'threads', label: 'Threads' },
  { id: 'bluesky', label: 'Bluesky' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'snapchat', label: 'Snapchat' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'spotify', label: 'Spotify' },
  { id: 'applemusic', label: 'Apple Music' },
  { id: 'soundcloud', label: 'SoundCloud' },
  { id: 'pinterest', label: 'Pinterest' },
  { id: 'tumblr', label: 'Tumblr' },
  { id: 'vimeo', label: 'Vimeo' },
  { id: 'github', label: 'GitHub' },
  { id: 'medium', label: 'Medium' },
  { id: 'substack', label: 'Substack' },
  { id: 'patreon', label: 'Patreon' },
  { id: 'kofi', label: 'Ko-fi' },
  { id: 'buymeacoffee', label: 'Buy Me a Coffee' },
]
export const PLATFORM_IDS = PLATFORMS.map((p) => p.id)
export const MAX_LINKS = 16

/** What the site starts with until the owner changes it: the five socials it already had, and two doors into the site. */
export const DEFAULT_LINKS: LinkItem[] = [
  { id: 'site', platform: 'website', label: 'logoless.io', url: SITE.url, footer: false, page: true },
  { id: 'earn', platform: 'website', label: 'Start earning from submissions', url: `${SITE.url}/onboarding?role=clipper`, footer: false, page: true },
  { id: 'launch', platform: 'website', label: 'Launch a campaign', url: `${SITE.url}/onboarding?role=brand`, footer: false, page: true },
  { id: 'discord', platform: 'discord', label: 'Join the Discord', url: SITE.social.discord, footer: true, page: true },
  { id: 'x', platform: 'x', label: 'X', url: SITE.social.x, footer: true, page: true },
  { id: 'tiktok', platform: 'tiktok', label: 'TikTok', url: SITE.social.tiktok, footer: true, page: true },
  { id: 'instagram', platform: 'instagram', label: 'Instagram', url: SITE.social.instagram, footer: true, page: true },
  { id: 'youtube', platform: 'youtube', label: 'YouTube', url: SITE.social.youtube, footer: true, page: true },
]

/** A safe address: https, or an email link. Anything else (javascript:, data:, plain http) is refused. */
export const safeUrl = (u: string) => /^https:\/\/[^\s<>"']+$/i.test(u) || /^mailto:[^\s<>"'@]+@[^\s<>"'@]+\.[^\s<>"'@]+$/i.test(u)

/** Checks a list from the browser or the database. Returns the cleaned list, or a message saying what is wrong. */
export function cleanLinks(input: unknown): { ok: true; links: LinkItem[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) return { ok: false, error: 'That is not a list of links.' }
  if (input.length > MAX_LINKS) return { ok: false, error: `Up to ${MAX_LINKS} links.` }
  const out: LinkItem[] = []
  const seen = new Set<string>()
  for (const raw of input) {
    const r = (raw ?? {}) as Record<string, unknown>
    const platform = typeof r.platform === 'string' && PLATFORM_IDS.includes(r.platform) ? r.platform : 'website'
    const label = typeof r.label === 'string' ? r.label.replace(/[\u0000-\u001f]/g, '').trim() : ''
    const url = typeof r.url === 'string' ? r.url.trim() : ''
    if (!label) return { ok: false, error: 'Every link needs a name.' }
    if (label.length > 40) return { ok: false, error: `"${label.slice(0, 20)}…" is too long. Keep names under 40 characters.` }
    if (!safeUrl(url) || url.length > 300) return { ok: false, error: `The address for "${label}" must start with https://` }
    let id = typeof r.id === 'string' && /^[a-z0-9-]{1,24}$/.test(r.id) ? r.id : ''
    if (!id || seen.has(id)) id = `l${Math.random().toString(36).slice(2, 9)}`
    seen.add(id)
    out.push({ id, platform, label, url, footer: r.footer === true, page: r.page !== false })
  }
  return { ok: true, links: out }
}
