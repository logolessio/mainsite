// Shared (browser + server) definitions for profile customisation. No secrets or database code here.

export const FONT_OPTIONS = [
  { id: 'geist', label: 'Sans', note: 'Clean' },
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
] as const
export type CardEffect = (typeof CARD_EFFECTS)[number]['id']
export const CARD_EFFECT_IDS = CARD_EFFECTS.map((e) => e.id) as string[]

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
  P('youtubemusic', 'YouTube Music', ['music.youtube.com'], 'https://music.youtube.com/…', 'Music'),
  P('bandcamp', 'Bandcamp', ['bandcamp.com'], 'https://you.bandcamp.com', 'Music'),
  P('beatport', 'Beatport', ['beatport.com'], 'https://beatport.com/artist/…', 'Music'),
  P('audiomack', 'Audiomack', ['audiomack.com'], 'https://audiomack.com/you', 'Music'),
  P('deezer', 'Deezer', ['deezer.com'], 'https://deezer.com/artist/…', 'Music'),
  P('tidal', 'Tidal', ['tidal.com'], 'https://tidal.com/artist/…', 'Music'),
  P('steam', 'Steam', ['steamcommunity.com', 'steampowered.com'], 'https://steamcommunity.com/id/you', 'Gaming'),
  P('roblox', 'Roblox', ['roblox.com'], 'https://roblox.com/users/…', 'Gaming'),
  P('epicgames', 'Epic Games', ['epicgames.com'], 'https://epicgames.com/…', 'Gaming'),
  P('playstation', 'PlayStation', ['playstation.com'], 'https://playstation.com/…', 'Gaming'),
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
export const LINK_GROUPS = ['Social', 'Music', 'Gaming', 'Support', 'Other'] as const
/** Links that open the "you are leaving logoless" page first, because they are the ones scammers use. */
export const WARN_PLATFORMS = ['website', 'discord', 'linktree', 'telegram', 'whatsapp']
export const MAX_LINKS = 12

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
  { key: 'links', label: 'Connections', hint: 'The links you add', on: true },
  { key: 'status', label: 'Online status', hint: 'A green dot when you are on logoless', on: true },
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
}

export type ProfileStats = { clips: number; views: number; earnedCents: number; campaigns: number }
