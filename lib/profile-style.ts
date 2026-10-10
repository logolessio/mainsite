// Shared (browser + server) definitions for profile customisation. No secrets or database code here.

export const FONT_OPTIONS = [
  { id: 'geist', label: 'Geist', note: 'The site font' },
  { id: 'mono', label: 'Mono', note: 'Typewriter' },
  { id: 'serif', label: 'Serif', note: 'Editorial' },
  { id: 'condensed', label: 'Condensed', note: 'Poster' },
  { id: 'grotesk', label: 'Grotesk', note: 'Sharp' },
  { id: 'hand', label: 'Handwritten', note: 'Personal' },
] as const
export type FontId = (typeof FONT_OPTIONS)[number]['id']
export const FONT_IDS = FONT_OPTIONS.map((f) => f.id) as string[]

export const BANNER_PRESETS = [
  { id: 'noir', label: 'Noir', css: 'linear-gradient(135deg,#050505 0%,#1a1a1c 55%,#050505 100%)' },
  { id: 'chrome', label: 'Chrome', css: 'linear-gradient(120deg,#2b2b2e 0%,#d9d9de 22%,#4a4a50 45%,#f4f4f6 60%,#34343a 80%,#111 100%)' },
  { id: 'dusk', label: 'Dusk', css: 'linear-gradient(135deg,#0b0b1e 0%,#2a1b4d 50%,#7a3b6e 100%)' },
  { id: 'ember', label: 'Ember', css: 'linear-gradient(135deg,#120505 0%,#5a1408 50%,#e0521f 100%)' },
  { id: 'ocean', label: 'Ocean', css: 'linear-gradient(135deg,#02080f 0%,#06304a 55%,#1b8fa8 100%)' },
  { id: 'forest', label: 'Forest', css: 'linear-gradient(135deg,#030a05 0%,#0f3a1d 55%,#4c9a53 100%)' },
  { id: 'rose', label: 'Rose', css: 'linear-gradient(135deg,#120309 0%,#5a1030 55%,#e86a92 100%)' },
  {
    id: 'grid',
    label: 'Grid',
    css: 'linear-gradient(rgb(255 255 255/.07) 1px,transparent 1px) 0 0/28px 28px,linear-gradient(90deg,rgb(255 255 255/.07) 1px,transparent 1px) 0 0/28px 28px,#050505',
  },
  { id: 'halftone', label: 'Halftone', css: 'radial-gradient(circle,rgb(255 255 255/.22) 1.4px,transparent 1.6px) 0 0/12px 12px,#050505' },
] as const
export const BANNER_PRESET_IDS = BANNER_PRESETS.map((b) => b.id) as string[]

export const DOT_SWATCHES = ['#ffffff', '#c9c9d1', '#ff4d4d', '#ff9f43', '#ffe14d', '#5eff9a', '#4de1ff', '#6d8bff', '#b36dff', '#ff6dd0']
export const ACCENT_SWATCHES = DOT_SWATCHES

export const LINK_PLATFORMS = [
  { id: 'tiktok', label: 'TikTok', hosts: ['tiktok.com'], placeholder: 'https://tiktok.com/@you' },
  { id: 'youtube', label: 'YouTube', hosts: ['youtube.com', 'youtu.be'], placeholder: 'https://youtube.com/@you' },
  { id: 'instagram', label: 'Instagram', hosts: ['instagram.com'], placeholder: 'https://instagram.com/you' },
  { id: 'x', label: 'X', hosts: ['x.com', 'twitter.com'], placeholder: 'https://x.com/you' },
  { id: 'twitch', label: 'Twitch', hosts: ['twitch.tv'], placeholder: 'https://twitch.tv/you' },
  { id: 'discord', label: 'Discord', hosts: ['discord.gg', 'discord.com'], placeholder: 'https://discord.gg/yourserver' },
  { id: 'spotify', label: 'Spotify', hosts: ['spotify.com', 'open.spotify.com'], placeholder: 'https://open.spotify.com/artist/…' },
  { id: 'soundcloud', label: 'SoundCloud', hosts: ['soundcloud.com'], placeholder: 'https://soundcloud.com/you' },
  { id: 'github', label: 'GitHub', hosts: ['github.com'], placeholder: 'https://github.com/you' },
] as const
export type LinkPlatform = (typeof LINK_PLATFORMS)[number]['id']

export type ProfileLink = { platform: LinkPlatform; url: string }

/** Which parts of a profile strangers can see. Each defaults to the value below. */
export const SHOW_OPTIONS = [
  { key: 'badges', label: 'Equipped badges', hint: 'Up to five from your achievements', on: true },
  { key: 'clips', label: 'Clips submitted', hint: 'How many clips you have posted', on: true },
  { key: 'views', label: 'Views generated', hint: 'Total verified views', on: false },
  { key: 'earnings', label: 'Total earned', hint: 'Your lifetime earnings', on: false },
  { key: 'campaigns', label: 'Campaigns clipped', hint: 'How many campaigns you have joined', on: false },
  { key: 'joined', label: 'Join date', hint: 'When you created your account', on: true },
  { key: 'country', label: 'Country', hint: 'Shown as a country code', on: false },
  { key: 'links', label: 'Social links', hint: 'Your links and website', on: true },
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
  bannerKind: 'preset' | 'image'
  banner: string
  dotColor: string
  accent: string
  font: FontId
  links: ProfileLink[]
  website: string | null
  badges: string[]
  show: ShowMap
  joinedAt: number
  country: string | null
  isStaff: boolean
}

export type ProfileStats = { clips: number; views: number; earnedCents: number; campaigns: number }
