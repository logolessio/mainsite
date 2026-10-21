// Shared (browser + server) definitions for profile customisation. No secrets or database code here.
import { bannerCss, LOOKS } from './looks'
import type { ProfileExtras } from './profile-extras'

export const FONT_OPTIONS = [
  { id: 'geist', label: 'Sans', note: 'Clean' },
  { id: 'bricolage', label: 'Bricolage', note: 'Editorial grotesque' },
  { id: 'funnel', label: 'Funnel', note: 'Sleek display' },
  { id: 'special', label: 'Expanded', note: 'Wide and confident' },
  { id: 'syne', label: 'Syne', note: 'Art gallery' },
  { id: 'unbounded', label: 'Unbounded', note: 'Round and futuristic' },
  { id: 'young', label: 'Young Serif', note: 'Warm and bold' },
  { id: 'gloock', label: 'Gloock', note: 'Magazine drama' },
  { id: 'newsreader', label: 'Newsreader', note: 'Fine editorial' },
  { id: 'martian', label: 'Martian', note: 'Wide mono' },
  { id: 'medieval', label: 'Medieval', note: 'Knights and castles' },
  { id: 'gothic', label: 'Gothic', note: 'Old blackletter' },
  { id: 'regal', label: 'Regal', note: 'Carved stone' },
  { id: 'vampyre', label: 'Vampyre', note: 'Dripping and dark' },
  { id: 'bit8', label: '8-Bit', note: 'Arcade pixels' },
  { id: 'tempo', label: 'Tempo', note: 'Loud and heavy' },
  { id: 'jelly', label: 'Jellybean', note: 'Soft and bouncy' },
  { id: 'modern', label: 'Modern', note: 'Future sans' },
  { id: 'script', label: 'Script', note: 'Brush lettering' },
  { id: 'serif', label: 'Serif', note: 'Editorial' },
  { id: 'mono', label: 'Mono', note: 'Typewriter' },
  { id: 'condensed', label: 'Poster', note: 'Tall and tight' },
  { id: 'grotesk', label: 'Grotesk', note: 'Sharp' },
  { id: 'hand', label: 'Handwritten', note: 'Personal' },
] as const
export type FontId = (typeof FONT_OPTIONS)[number]['id']
export const FONT_IDS = FONT_OPTIONS.map((f) => f.id) as string[]

/** How the display name is painted. Colours come from the person's two theme colours. */
export const NAME_EFFECTS = [
  { id: 'solid', label: 'Solid' },
  { id: 'gradient', label: 'Gradient' },
  { id: 'neon', label: 'Neon' },
  { id: 'toon', label: 'Toon' },
  { id: 'pop', label: 'Pop' },
  { id: 'glow', label: 'Glow' },
  // newer ones, offered in the profile studio
  { id: 'rainbow', label: 'Rainbow', studio: true },
  { id: 'chrome', label: 'Chrome', studio: true },
  { id: 'glitch', label: 'Glitch', studio: true },
  { id: 'shimmer', label: 'Shimmer', studio: true },
] as const
export type NameEffect = (typeof NAME_EFFECTS)[number]['id']
export const NAME_EFFECT_IDS = NAME_EFFECTS.map((e) => e.id) as string[]

/** Little animated particles that float over the card. */
export const CARD_EFFECTS = [
  { id: 'none', label: 'None' },
  { id: 'snow', label: 'Snow' },
  { id: 'rain', label: 'Rain' },
  { id: 'embers', label: 'Embers' },
  { id: 'sparkle', label: 'Glitter' },
  { id: 'stars', label: 'Starfield' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'fireflies', label: 'Fireflies' },
  { id: 'petals', label: 'Petals' },
  { id: 'bubbles', label: 'Bubbles' },
  { id: 'lightning', label: 'Storm' },
  { id: 'smoke', label: 'Smoke' },
  { id: 'leaves', label: 'Autumn' },
  { id: 'confetti', label: 'Confetti' },
  { id: 'fireworks', label: 'Fireworks' },
  { id: 'rays', label: 'Light shafts' },
  { id: 'caustics', label: 'Underwater' },
  { id: 'code', label: 'Code' },
  { id: 'film', label: 'Old film' },
  { id: 'vhs', label: 'VHS' },
] as const
export type CardEffect = (typeof CARD_EFFECTS)[number]['id']
export const CARD_EFFECT_IDS = CARD_EFFECTS.map((e) => e.id) as string[]

export const BANNER_PRESETS = [
  { id: 'noir', label: 'Noir', css: `${bannerCss({ id: 'noir', name: 'Noir', light: '#2a2a2e', mid: '#101012', dark: '#030303' })}` },
  ...LOOKS.map((l) => ({ id: l.id, label: l.name, css: bannerCss(l) })),
  { id: 'chrome', label: 'Chrome', css: 'linear-gradient(120deg,#2b2b2e 0%,#d9d9de 22%,#4a4a50 45%,#f4f4f6 60%,#34343a 80%,#111 100%)' },
  {
    id: 'grid',
    label: 'Grid',
    css: 'linear-gradient(rgb(255 255 255/.07) 1px,transparent 1px) 0 0/28px 28px,linear-gradient(90deg,rgb(255 255 255/.07) 1px,transparent 1px) 0 0/28px 28px,#050505',
  },
  { id: 'halftone', label: 'Halftone', css: 'radial-gradient(circle,rgb(255 255 255/.22) 1.4px,transparent 1.6px) 0 0/12px 12px,#050505' },
] as { id: string; label: string; css: string }[]
export const BANNER_PRESET_IDS = BANNER_PRESETS.map((b) => b.id) as string[]

export const DOT_SWATCHES = ['#ffffff', '#c9c9d1', '#ff4d4d', '#ff9f43', '#ffe14d', '#5eff9a', '#4de1ff', '#6d8bff', '#b36dff', '#ff6dd0']
export const ACCENT_SWATCHES = DOT_SWATCHES

type P = { id: string; label: string; hosts: readonly string[]; placeholder: string; group: 'Social' | 'Music' | 'Gaming' | 'Support' | 'Other' }
const P = (id: string, label: string, hosts: string[], placeholder: string, group: P['group']): P => ({ id, label, hosts, placeholder, group })

export const LINK_PLATFORMS = [
  P('tiktok', 'TikTok', ['tiktok.com'], 'https://tiktok.com/@you', 'Social'),
  P('youtube', 'YouTube', ['youtube.com', 'youtu.be'], 'https://youtube.com/@you', 'Social'),
  P('instagram', 'Instagram', ['instagram.com'], 'https://instagram.com/you', 'Social'),
  P('x', 'X', ['x.com', 'twitter.com'], 'https://x.com/you', 'Social'),
  P('discord', 'Discord', ['discord.gg', 'discord.com'], 'https://discord.gg/yourserver', 'Social'),
  P('twitch', 'Twitch', ['twitch.tv'], 'https://twitch.tv/you', 'Social'),
  P('snapchat', 'Snapchat', ['snapchat.com'], 'https://snapchat.com/add/you', 'Social'),
  P('reddit', 'Reddit', ['reddit.com'], 'https://reddit.com/user/you', 'Social'),
  P('facebook', 'Facebook', ['facebook.com', 'fb.com'], 'https://facebook.com/you', 'Social'),
  P('threads', 'Threads', ['threads.net', 'threads.com'], 'https://threads.net/@you', 'Social'),
  P('bluesky', 'Bluesky', ['bsky.app'], 'https://bsky.app/profile/you', 'Social'),
  P('telegram', 'Telegram', ['t.me', 'telegram.me'], 'https://t.me/you', 'Social'),
  P('whatsapp', 'WhatsApp', ['wa.me', 'whatsapp.com'], 'https://wa.me/…', 'Social'),
  P('pinterest', 'Pinterest', ['pinterest.com'], 'https://pinterest.com/you', 'Social'),
  P('kick', 'Kick', ['kick.com'], 'https://kick.com/you', 'Social'),
  P('spotify', 'Spotify', ['spotify.com'], 'https://open.spotify.com/artist/…', 'Music'),
  P('soundcloud', 'SoundCloud', ['soundcloud.com'], 'https://soundcloud.com/you', 'Music'),
  P('applemusic', 'Apple Music', ['music.apple.com'], 'https://music.apple.com/…', 'Music'),
  P('bandcamp', 'Bandcamp', ['bandcamp.com'], 'https://you.bandcamp.com', 'Music'),
  P('audiomack', 'Audiomack', ['audiomack.com'], 'https://audiomack.com/you', 'Music'),
  P('steam', 'Steam', ['steamcommunity.com', 'steampowered.com'], 'https://steamcommunity.com/id/you', 'Gaming'),
  P('epicgames', 'Epic Games', ['epicgames.com'], 'https://epicgames.com/…', 'Gaming'),
  P('playstation', 'PlayStation', ['psnprofiles.com', 'playstation.com'], 'https://psnprofiles.com/you', 'Gaming'),
  P('patreon', 'Patreon', ['patreon.com'], 'https://patreon.com/you', 'Support'),
  P('kofi', 'Ko-fi', ['ko-fi.com'], 'https://ko-fi.com/you', 'Support'),
  P('buymeacoffee', 'Buy Me a Coffee', ['buymeacoffee.com'], 'https://buymeacoffee.com/you', 'Support'),
  P('paypal', 'PayPal', ['paypal.me', 'paypal.com'], 'https://paypal.me/you', 'Support'),
  P('github', 'GitHub', ['github.com'], 'https://github.com/you', 'Other'),
  P('behance', 'Behance', ['behance.net'], 'https://behance.net/you', 'Other'),
  P('dribbble', 'Dribbble', ['dribbble.com'], 'https://dribbble.com/you', 'Other'),
  P('artstation', 'ArtStation', ['artstation.com'], 'https://artstation.com/you', 'Other'),
  P('vimeo', 'Vimeo', ['vimeo.com'], 'https://vimeo.com/you', 'Other'),
  P('tumblr', 'Tumblr', ['tumblr.com'], 'https://you.tumblr.com', 'Other'),
  P('medium', 'Medium', ['medium.com'], 'https://medium.com/@you', 'Other'),
  P('substack', 'Substack', ['substack.com'], 'https://you.substack.com', 'Other'),
  P('linktree', 'Linktree', ['linktr.ee'], 'https://linktr.ee/you', 'Other'),
  P('website', 'Website', [], 'https://your-site.com', 'Other'),
] as const
export type LinkPlatform = (typeof LINK_PLATFORMS)[number]['id']

/** Platforms where a username is enough. `{u}` is replaced with it. Others need the full link (a song, a numeric ID…). */
export const USERNAME_LINKS: Record<string, { tpl: string; label: string }> = {
  tiktok: { tpl: 'https://tiktok.com/@{u}', label: 'tiktok.com/@' },
  youtube: { tpl: 'https://youtube.com/@{u}', label: 'youtube.com/@' },
  instagram: { tpl: 'https://instagram.com/{u}', label: 'instagram.com/' },
  x: { tpl: 'https://x.com/{u}', label: 'x.com/' },
  twitch: { tpl: 'https://twitch.tv/{u}', label: 'twitch.tv/' },
  snapchat: { tpl: 'https://snapchat.com/add/{u}', label: 'snapchat.com/add/' },
  reddit: { tpl: 'https://reddit.com/user/{u}', label: 'reddit.com/user/' },
  facebook: { tpl: 'https://facebook.com/{u}', label: 'facebook.com/' },
  threads: { tpl: 'https://threads.net/@{u}', label: 'threads.net/@' },
  bluesky: { tpl: 'https://bsky.app/profile/{u}', label: 'bsky.app/profile/' },
  telegram: { tpl: 'https://t.me/{u}', label: 't.me/' },
  whatsapp: { tpl: 'https://wa.me/{u}', label: 'wa.me/' },
  pinterest: { tpl: 'https://pinterest.com/{u}', label: 'pinterest.com/' },
  kick: { tpl: 'https://kick.com/{u}', label: 'kick.com/' },
  discord: { tpl: 'https://discord.gg/{u}', label: 'discord.gg/' },
  soundcloud: { tpl: 'https://soundcloud.com/{u}', label: 'soundcloud.com/' },
  audiomack: { tpl: 'https://audiomack.com/{u}', label: 'audiomack.com/' },
  bandcamp: { tpl: 'https://{u}.bandcamp.com', label: '.bandcamp.com' },
  steam: { tpl: 'https://steamcommunity.com/id/{u}', label: 'steamcommunity.com/id/' },
  patreon: { tpl: 'https://patreon.com/{u}', label: 'patreon.com/' },
  kofi: { tpl: 'https://ko-fi.com/{u}', label: 'ko-fi.com/' },
  buymeacoffee: { tpl: 'https://buymeacoffee.com/{u}', label: 'buymeacoffee.com/' },
  paypal: { tpl: 'https://paypal.me/{u}', label: 'paypal.me/' },
  github: { tpl: 'https://github.com/{u}', label: 'github.com/' },
  behance: { tpl: 'https://behance.net/{u}', label: 'behance.net/' },
  dribbble: { tpl: 'https://dribbble.com/{u}', label: 'dribbble.com/' },
  artstation: { tpl: 'https://artstation.com/{u}', label: 'artstation.com/' },
  vimeo: { tpl: 'https://vimeo.com/{u}', label: 'vimeo.com/' },
  tumblr: { tpl: 'https://{u}.tumblr.com', label: '.tumblr.com' },
  medium: { tpl: 'https://medium.com/@{u}', label: 'medium.com/@' },
  substack: { tpl: 'https://{u}.substack.com', label: '.substack.com' },
  linktree: { tpl: 'https://linktr.ee/{u}', label: 'linktr.ee/' },
  spotify: { tpl: 'https://open.spotify.com/user/{u}', label: 'open.spotify.com/user/' },
  applemusic: { tpl: 'https://music.apple.com/profile/{u}', label: 'music.apple.com/profile/' },
  epicgames: { tpl: 'https://store.epicgames.com/u/{u}', label: 'epicgames.com/u/' },
  playstation: { tpl: 'https://psnprofiles.com/{u}', label: 'psnprofiles.com/' },
}

/**
 * Turns whatever someone typed into a full https link. A username ("@you" or "you") is slotted into the platform's
 * address; a pasted link (with or without https://) is tidied up. Returns an error message when it cannot work.
 */
export function buildLink(platform: string, raw: string): { url: string } | { error: string } {
  const m = LINK_PLATFORMS.find((p) => p.id === platform)
  const input = raw.trim()
  if (!m || !input) return { error: 'Type your username or paste your link.' }
  const spec = USERNAME_LINKS[platform]
  const bare = input.replace(/^https?:\/\//i, '').toLowerCase()
  const isLink = /^https?:\/\//i.test(input) || input.includes('/') || (m.hosts as readonly string[]).some((h) => bare === h || bare.endsWith(`.${h}`))
  if (isLink || !spec) {
    const bad = spec ? 'Type your username, or paste the full link.' : 'Paste the full link to it.'
    let u: URL
    try {
      u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`)
    } catch {
      return { error: bad }
    }
    if (!u.hostname.includes('.')) return { error: bad }
    u.protocol = 'https:'
    if (m.hosts.length && !m.hosts.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))) return { error: `That does not look like a ${m.label} link.` }
    return { url: u.toString() }
  }
  const name = input.replace(/^@+/, '')
  const ok = platform === 'whatsapp' ? /^\d{6,16}$/.test(name.replace(/^\+/, '')) : /^[A-Za-z0-9._-]{1,60}$/.test(name)
  if (!ok) return { error: platform === 'whatsapp' ? 'Type your number with the country code, digits only.' : 'Usernames use letters, numbers, dots, dashes and underscores only.' }
  return { url: spec.tpl.replace('{u}', platform === 'whatsapp' ? name.replace(/^\+/, '') : name) }
}

/** The username part of a saved link, so editing shows "you" instead of the whole address. */
export function usernameOf(platform: string, url: string): string {
  const spec = USERNAME_LINKS[platform]
  if (!spec || !url) return url
  const [pre, post = ''] = spec.tpl.split('{u}')
  const clean = url.replace(/\/$/, '')
  if (clean.startsWith(pre) && (!post || clean.endsWith(post))) {
    const name = clean.slice(pre.length, post ? clean.length - post.length : undefined)
    if (name && !name.includes('/') && !name.includes('?')) return name
  }
  return url
}
/** The only accounts a profile can show: the ones a member clips from. */
export const CLIPPING_PLATFORMS: string[] = ['tiktok', 'youtube', 'instagram']
export const LINK_GROUPS = ['Social', 'Music', 'Gaming', 'Support', 'Other'] as const
/** Links that open the "you are leaving logoless" page first, because they are the ones scammers use. */
export const WARN_PLATFORMS = ['website', 'discord', 'linktree', 'telegram', 'whatsapp']
export const MAX_LINKS = 12

export type ProfileLink = { platform: LinkPlatform; url: string }

/** Which parts of a profile strangers can see. Each defaults to the value below. */
export const SHOW_OPTIONS = [
  { key: 'badges', label: 'Equipped badges', hint: 'Up to five from your achievements', on: true },
  { key: 'clips', label: 'Submissions made', hint: 'How many submissions you have posted', on: true },
  { key: 'views', label: 'Views generated', hint: 'Total verified views', on: false },
  { key: 'earnings', label: 'Total earned', hint: 'Your lifetime earnings', on: false },
  { key: 'campaigns', label: 'Campaigns clipped', hint: 'How many campaigns you have joined', on: false },
  { key: 'joined', label: 'Join date', hint: 'When you created your account', on: true },
  { key: 'country', label: 'Country', hint: 'Shown as a country code', on: false },
  { key: 'links', label: 'Creator accounts', hint: 'Show the TikTok, YouTube and Instagram accounts you post from', on: false },
  { key: 'status', label: 'Online status', hint: 'A green dot when you are on logoless', on: true },
  { key: 'feed', label: 'Clips on the public feed', hint: 'Your approved clips on the Submissions page, with your name', on: true },
] as const
export type ShowKey = (typeof SHOW_OPTIONS)[number]['key']
export type ShowMap = Record<ShowKey, boolean>
export const DEFAULT_SHOW = Object.fromEntries(SHOW_OPTIONS.map((o) => [o.key, o.on])) as ShowMap

export const HANDLE_RE = /^[a-z0-9_]{3,20}$/
/** Names that look official. Only the owner account may use them, so nobody can pose as staff. */
export const RESERVED_WORDS = ['logoless', 'admin', 'administrator', 'support', 'staff', 'official', 'moderator', 'mod', 'help', 'security', 'billing', 'team', 'system', 'root', 'null', 'undefined', 'api', 'www']

export type ProfileView = {
  handle: string
  displayName: string
  bio: string
  avatar: string | null
  bannerKind: 'preset' | 'image' | 'color'
  banner: string
  dotColor: string
  accent: string
  accent2: string
  font: FontId
  nameEffect: NameEffect
  cardEffect: CardEffect
  effectIntensity: number
  effectSpeed: number
  pronouns: string
  online: boolean
  links: ProfileLink[]
  website: string | null
  badges: string[]
  show: ShowMap
  joinedAt: number
  country: string | null
  isStaff: boolean
  /** The profile studio choices, always complete (defaults filled in). */
  extras: ProfileExtras
}

export type ProfileStats = { clips: number; views: number; earnedCents: number; campaigns: number }
