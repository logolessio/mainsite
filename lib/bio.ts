// The link-in-bio pages (logoless.io/<name>): what a page is made of, its choices, and how any saved or posted JSON is brought to a complete, safe BioConfig.
// Shared by the browser (the editor, the live page) and the server (saving, rendering). No secrets and no database code here.
//
// A page starts black, white and grey. A person can switch on their own colours (`colors.on`): a background, a second background, text, and two accents that
// tint the name, the buttons, the glow and the moving backgrounds. Their own pictures and videos may bring colour too (`bg.mono` turns them to grey).
import { CARD_EFFECTS, LINK_PLATFORMS } from './profile-style'

/* ------------------------------------------------------------------ the layouts */

export const LAYOUTS = [
  { id: 'classic', name: 'Classic', note: 'your picture, name, bio and icons in the middle of a floating card.' },
  { id: 'card', name: 'Card', note: 'a profile card with a banner and your picture over its edge.' },
  { id: 'side', name: 'Side by side', note: 'your picture on the left, your name and bio on the right.' },
  { id: 'canvas', name: 'Canvas', note: 'a blank page. drag, resize and turn anything wherever you like.' },
] as const
export type LayoutId = (typeof LAYOUTS)[number]['id']
export const LAYOUT_IDS = LAYOUTS.map((l) => l.id) as string[]

/* ------------------------------------------------------------------ look */

export const BUTTON_STYLES = [
  { id: 'glass', name: 'Glass' },
  { id: 'solid', name: 'Solid' },
  { id: 'outline', name: 'Outline' },
  { id: 'ghost', name: 'Ghost' },
  { id: 'underline', name: 'Underline' },
  { id: 'brutal', name: 'Block' },
] as const
export type ButtonStyle = (typeof BUTTON_STYLES)[number]['id']

/** How the display name is painted. The last three use the page's own colours (grey if it has none). */
export const NAME_STYLES = [
  { id: 'solid', name: 'Solid' },
  { id: 'outline', name: 'Outline' },
  { id: 'chrome', name: 'Chrome' },
  { id: 'shimmer', name: 'Shimmer' },
  { id: 'glitch', name: 'Glitch' },
  { id: 'flicker', name: 'Flicker' },
  { id: 'ghost', name: 'Ghost' },
  { id: 'scramble', name: 'Scramble' },
  { id: 'gradient', name: 'Gradient' },
  { id: 'glow', name: 'Glow' },
  { id: 'neon', name: 'Neon' },
] as const
export type NameStyle = (typeof NAME_STYLES)[number]['id']

export const AVATAR_SHAPES = [
  { id: 'circle', name: 'Circle' },
  { id: 'rounded', name: 'Rounded' },
  { id: 'square', name: 'Square' },
  { id: 'arch', name: 'Arch' },
] as const
export type AvatarShape = (typeof AVATAR_SHAPES)[number]['id']

/** Behind everything: a flat colour, a still gradient, or a picture, GIF or video. (Nothing moves by itself; the moving things are the effects.) */
export const BG_KINDS = [
  { id: 'tone', name: 'Colour' },
  { id: 'gradient', name: 'Gradient' },
  { id: 'image', name: 'Picture' },
  { id: 'gif', name: 'GIF' },
  { id: 'video', name: 'Video' },
] as const
export type BioBgKind = (typeof BG_KINDS)[number]['id']

export const CARD_STYLES = [
  { id: 'glass', name: 'Glass' },
  { id: 'solid', name: 'Solid' },
  { id: 'outline', name: 'Outline' },
  { id: 'none', name: 'None' },
] as const
export type CardStyle = (typeof CARD_STYLES)[number]['id']

export const GRADIENT_STYLES = [
  { id: 'linear', name: 'Linear' },
  { id: 'radial', name: 'Radial' },
  { id: 'conic', name: 'Conic' },
  { id: 'mesh', name: 'Mesh' },
] as const
export type GradientStyle = (typeof GRADIENT_STYLES)[number]['id']

/** The effects that play over the background: snow, rain, embers, smoke and the rest (the painters live in components/profile/card-effect.tsx). */
export const OVERLAYS = [{ id: 'none', name: 'None' }, ...CARD_EFFECTS.filter((e) => e.id !== 'none').map((e) => ({ id: e.id, name: e.label }))] as readonly { id: (typeof CARD_EFFECTS)[number]['id']; name: string }[]
export type BioOverlay = (typeof CARD_EFFECTS)[number]['id']

export const CURSOR_TRAILS = [
  { id: 'none', name: 'None' },
  { id: 'dots', name: 'Dots' },
  { id: 'comet', name: 'Comet' },
  { id: 'ring', name: 'Ring' },
  { id: 'spark', name: 'Sparks' },
  { id: 'ink', name: 'Ink' },
] as const
export type CursorTrail = (typeof CURSOR_TRAILS)[number]['id']

export const ENTER_SCREENS = [
  { id: 'none', name: 'None' },
  { id: 'click', name: 'Click to enter' },
  { id: 'type', name: 'Typed in' },
  { id: 'curtain', name: 'Curtain' },
] as const
export type EnterScreen = (typeof ENTER_SCREENS)[number]['id']

export const REVEALS = [
  { id: 'rise', name: 'Rise' },
  { id: 'blur', name: 'Blur in' },
  { id: 'scale', name: 'Scale' },
  { id: 'none', name: 'None' },
] as const
export type Reveal = (typeof REVEALS)[number]['id']

/* ------------------------------------------------------------------ blocks (what is on the page) */

export type BioBlock =
  | { id: string; t: 'link'; title: string; url: string; icon: string; note: string; hidden: boolean; pin: boolean; emoji?: string; featured?: boolean; anim?: LinkAnim; /** show from and until (UTC, as an ISO string) */ from?: string; until?: string }
  | { id: string; t: 'social'; platform: string; url: string; hidden: boolean }
  | { id: string; t: 'heading'; text: string }
  | { id: string; t: 'text'; text: string }
  | { id: string; t: 'video'; url: string; title: string; hidden: boolean }
  | { id: string; t: 'divider' }

/** How a link asks for attention. */
export const LINK_ANIMS = [
  { id: 'none', name: 'None' },
  { id: 'pulse', name: 'Pulse' },
  { id: 'shake', name: 'Shake' },
  { id: 'glow', name: 'Glow' },
] as const
export type LinkAnim = (typeof LINK_ANIMS)[number]['id']

/** What a link is called on the page: its title, with its emoji in front if it has one. */
export const linkLabel = (b: { title: string; emoji?: string }) => (b.emoji ? `${b.emoji} ${b.title}` : b.title)

/** Is a link inside its schedule right now? (Anything that is not a link, or has no dates, always is.) */
export function isLive(b: BioBlock, now = Date.now()) {
  if (b.t !== 'link') return true
  if (b.from && Date.parse(b.from) > now) return false
  if (b.until && Date.parse(b.until) <= now) return false
  return true
}

export type BioBlockKind = BioBlock['t']
export const MAX_BLOCKS = 80
export const MAX_TITLE = 80
export const MAX_NOTE = 140
export const MAX_TEXT = 600

/** One thing on the canvas layout. x, y and w are in a page 390 wide (the page scales to the screen); r is degrees; z is the stacking order; a is text alignment; f is a text size multiplier. */
export type FreeBox = { x: number; y: number; w: number; r?: number; z?: number; a?: 'l' | 'c' | 'r'; f?: number }
export const FREE_W = 390
/** The pieces of a page that are not blocks. Every block is a piece too, under its own id. */
export const FREE_FIXED = ['avatar', 'name', 'bio'] as const

export type BioConfig = {
  v: 1
  /** which set of starting looks this page was made under: 2 is the flat, square one (a page saved before it still has the first set until it is read once) */
  look?: 2
  layout: LayoutId
  /** the canvas layout: where each thing sits (see `resolveFree`); anything not listed here is where the starting arrangement puts it */
  free?: Record<string, FreeBox>
  /** the page's own colours; while `on` is false the page is black, white and grey and these are ignored */
  colors: { on: boolean; bg: string; bg2: string; text: string; accent: string; accent2: string }
  theme: {
    /** the page's tone, 0 black to 100 white; the text turns itself the other way */
    tone: number
    font: string
    nameStyle: NameStyle
    buttons: ButtonStyle
    radius: number
    align: 'left' | 'center'
    size: 'compact' | 'comfortable' | 'large'
    /** the social icons: a soft glow with no box, plain, or in a box */
    icons: 'glow' | 'plain' | 'boxed'
  }
  avatar: { shape: AvatarShape; ring: boolean; float: boolean; gray: boolean; size: number }
  bg: {
    kind: BioBgKind
    tone: number
    tone2: number
    angle: number
    gradient: GradientStyle
    image: string
    gif: string
    video: string
    /** soften the background, in pixels */
    blur: number
    dim: number
    noise: number
    /** how far the background drifts against the scroll, 0 to 100 */
    parallax: number
    vignette: number
    /** turn colour pictures, GIFs and videos to grey */
    mono: boolean
  }
  overlay: { effect: BioOverlay; intensity: number; speed: number }
  /** the panel the profile sits in (the centred layouts) */
  card: { style: CardStyle; blur: number; opacity: number; glare: boolean; /** how wide the card is, in pixels */ width: number; /** a picture across the top of the card in the card layout (an upload id; empty is a soft gradient) */ banner: string }
  /** music that plays on the page once it is entered */
  audio: { id: string; title: string; volume: number; loop: boolean; reactive: boolean }
  cursor: {
    kind: 'default' | 'preset' | 'upload'
    preset: string
    ink: 'white' | 'black'
    size: number
    image: string
    hot: 'tl' | 'center'
    trail: CursorTrail
  }
  fx: {
    enter: EnterScreen
    enterText: string
    reveal: Reveal
    tilt: boolean
    magnetic: boolean
    spotlight: boolean
    grain: number
    scanlines: number
    parallax: number
    /** the bio types itself out */
    typewriter: boolean
    /** how far the card leans towards the pointer and how far its pieces stand off it, 0 to 100 */
    depth: number
    /** the card drifts up and down a little */
    float: boolean
  }
  meta: { title: string; description: string; location: string; index: boolean; views: boolean; badge: boolean; badges: boolean }
  blocks: BioBlock[]
}

const link = (title: string, url: string, note = ''): BioBlock => ({ id: newId(), t: 'link', title, url, icon: 'auto', note, hidden: false, pin: false })

export function newId() {
  const a = new Uint8Array(5)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a)
  else for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256)
  return [...a].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 8)
}

export const DEFAULT_BIO: BioConfig = {
  v: 1,
  look: 2,
  layout: 'classic',
  colors: { on: false, bg: '#08080c', bg2: '#16183a', text: '#f4f4f6', accent: '#ffffff', accent2: '#9a9a9a' },
  theme: { tone: 5, font: 'quicksand', nameStyle: 'glow', buttons: 'glass', radius: 22, align: 'center', size: 'comfortable', icons: 'glow' },
  avatar: { shape: 'circle', ring: true, float: false, gray: false, size: 100 },
  bg: { kind: 'gradient', tone: 5, tone2: 17, angle: 160, gradient: 'radial', image: '', gif: '', video: '', blur: 0, dim: 0, noise: 0, parallax: 40, vignette: 35, mono: false },
  overlay: { effect: 'none', intensity: 50, speed: 50 },
  card: { style: 'glass', blur: 22, opacity: 55, glare: true, width: 440, banner: '' },
  audio: { id: '', title: '', volume: 60, loop: true, reactive: true },
  cursor: { kind: 'default', preset: 'arrow', ink: 'white', size: 32, image: '', hot: 'tl', trail: 'none' },
  fx: { enter: 'none', enterText: '[ click to enter ]', reveal: 'rise', tilt: true, magnetic: false, spotlight: false, grain: 0, scanlines: 0, parallax: 60, typewriter: false, depth: 60, float: true },
  meta: { title: '', description: '', location: '', index: true, views: false, badge: true, badges: true },
  blocks: [],
}

/** What a brand-new page starts with, so the first look is never empty. */
export function starterBlocks(): BioBlock[] {
  return [link('My latest edit', 'https://youtube.com', 'Watch it on YouTube'), link('Portfolio', 'https://example.com'), link('Book me', 'mailto:hello@example.com')]
}

/* ------------------------------------------------------------------ looks: one tap sets a whole page */

export type BioPreset = { id: string; name: string; note: string; /** background, second background, accent, second accent: what a tile shows */ hues: [string, string, string, string]; /** the effect that plays over it */ effect: BioOverlay; set: Partial<{ [K in keyof BioConfig]: Partial<BioConfig[K]> }> }

const look = (
  id: string,
  name: string,
  note: string,
  hues: [string, string, string, string],
  effect: BioOverlay,
  o: { text?: string; font?: string; nameStyle?: NameStyle; buttons?: ButtonStyle; radius?: number; opacity?: number; blur?: number; intensity?: number; vignette?: number } = {},
): BioPreset => ({
  id,
  name,
  note,
  hues,
  effect,
  set: {
    colors: { on: true, bg: hues[0], bg2: hues[1], text: o.text ?? '#f5f5f7', accent: hues[2], accent2: hues[3] },
    theme: { nameStyle: o.nameStyle ?? 'glow', buttons: o.buttons ?? 'glass', font: o.font ?? 'quicksand', radius: o.radius ?? 22 },
    bg: { kind: 'gradient', gradient: 'radial', dim: 0, blur: 0, noise: 0, vignette: o.vignette ?? 40 },
    card: { style: 'glass', opacity: o.opacity ?? 55, blur: o.blur ?? 22 },
    overlay: { effect, intensity: o.intensity ?? 55, speed: 50 },
  },
})

export const PRESETS: BioPreset[] = [
  look('noir', 'Noir', 'black and white, nothing else', ['#050505', '#181818', '#ffffff', '#9a9a9a'], 'none'),
  look('embers', 'Embers', 'glowing sparks rising off a dark fire', ['#0a0504', '#2a0e08', '#ff6a2b', '#ffb347'], 'embers', { text: '#fff1e8' }),
  look('smoke', 'Smoke', 'slow grey smoke', ['#070708', '#1d1d22', '#d4d4d8', '#71717a'], 'smoke'),
  look('snow', 'Snowfall', 'soft snow on deep blue', ['#060b16', '#13233f', '#9bd0ff', '#e6f1ff'], 'snow', { text: '#eef6ff' }),
  look('rain', 'Rain', 'a grey night in the rain', ['#05080c', '#12202b', '#7dd3fc', '#38bdf8'], 'rain', { text: '#e8f3fa' }),
  look('sakura', 'Sakura', 'petals falling', ['#140910', '#3a1428', '#ff8fb8', '#ffd1e3'], 'petals', { text: '#fff0f6' }),
  look('forest', 'Forest', 'fireflies in the dark', ['#050d08', '#10301e', '#4ade80', '#bef264'], 'fireflies', { text: '#eafff1' }),
  look('storm', 'Storm', 'purple sky, lightning', ['#07060c', '#1b1530', '#a78bfa', '#f0abfc'], 'lightning', { text: '#f3eeff' }),
  look('ocean', 'Ocean', 'bubbles rising', ['#03101a', '#073a57', '#38bdf8', '#22d3ee'], 'bubbles', { text: '#e8f7ff' }),
  look('aurora', 'Aurora', 'green and violet light', ['#030812', '#0b2433', '#34d399', '#818cf8'], 'aurora', { text: '#ecfdf5' }),
  look('gold', 'Gold', 'black and gold, glitter', ['#0b0906', '#2a210d', '#e7b84a', '#fff0b3'], 'sparkle', { text: '#f6edd3', font: 'newsreader', nameStyle: 'shimmer' }),
  look('autumn', 'Autumn', 'leaves drifting down', ['#100804', '#33180a', '#f59e0b', '#ef4444'], 'leaves', { text: '#fff4e5' }),
  look('matrix', 'Matrix', 'green code', ['#010a04', '#032211', '#22c55e', '#86efac'], 'code', { text: '#d9ffe6', font: 'martian', nameStyle: 'neon', radius: 6 }),
  look('retro', 'Retro', 'a worn VHS tape', ['#0a0a0f', '#1a1626', '#ff4d8d', '#4dd2ff'], 'vhs', { text: '#fdf2f8', nameStyle: 'glitch', radius: 10 }),
  look('party', 'Party', 'confetti', ['#0b0716', '#1f1245', '#f472b6', '#60a5fa'], 'confetti', { text: '#fdf4ff' }),
  look('paper', 'Paper', 'light and plain', ['#f4f1ea', '#e2ddd0', '#1a1a1a', '#6b6b6b'], 'none', { text: '#161616', buttons: 'solid', nameStyle: 'solid', opacity: 70, vignette: 0 }),
]

/* ------------------------------------------------------------------ links: addresses, icons, embeds */

const SAFE_URL = /^(https?:\/\/|mailto:)/i

/** A tidy, safe address from what was typed. A bare domain gets https://. Anything that is not http, https or mail is refused (empty string). */
export function cleanUrl(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  let u = raw.replace(/[\u0000-\u001f\u007f\s]/g, (c) => (c === ' ' ? '%20' : '')).trim()
  if (!u || u.length > 600) return ''
  if (/^[a-z][a-z0-9+.-]*:/i.test(u) && !SAFE_URL.test(u)) return '' // javascript:, data:, file: and the like
  if (/^mailto:/i.test(u)) return /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/i.test(u) ? u : ''
  if (!/^https?:\/\//i.test(u)) {
    if (!/^[^\s/]+\.[a-z]{2,}([/?#].*)?$/i.test(u)) return ''
    u = `https://${u}`
  }
  try {
    const p = new URL(u)
    if (!p.hostname.includes('.') || p.username || p.password) return ''
    return p.toString()
  } catch {
    return ''
  }
}

/** Which platform an address belongs to ("youtube", "tiktok"...), or null. */
export function platformOf(url: string): string | null {
  if (/^mailto:/i.test(url)) return 'mail'
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    return LINK_PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`)))?.id ?? null
  } catch {
    return null
  }
}

export type Embed = { kind: 'youtube' | 'vimeo' | 'tiktok' | 'spotify'; src: string; ratio: number }
/** The player a video or music address can be shown in, or null (then it is shown as a plain link). Only the players the site's security policy allows. */
export function embedFor(url: string): Embed | null {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    if (host === 'youtu.be') return /^\/[\w-]{6,15}$/.test(u.pathname) ? { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed${u.pathname}?rel=0&modestbranding=1`, ratio: 16 / 9 } : null
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = u.searchParams.get('v')
      if (v && /^[\w-]{6,15}$/.test(v)) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${v}?rel=0&modestbranding=1`, ratio: 16 / 9 }
      const s = /^\/(?:shorts|embed|live)\/([\w-]{6,15})/.exec(u.pathname)
      if (s) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${s[1]}?rel=0&modestbranding=1`, ratio: u.pathname.startsWith('/shorts') ? 9 / 16 : 16 / 9 }
    }
    if (host === 'vimeo.com') {
      const m = /^\/(\d{5,12})/.exec(u.pathname)
      if (m) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${m[1]}?dnt=1`, ratio: 16 / 9 }
    }
    if (host === 'tiktok.com') {
      const m = /\/video\/(\d{8,25})/.exec(u.pathname)
      if (m) return { kind: 'tiktok', src: `https://www.tiktok.com/embed/v2/${m[1]}`, ratio: 9 / 16 }
    }
    if (host === 'open.spotify.com') {
      const m = /^\/(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{10,30})/.exec(u.pathname)
      if (m) return { kind: 'spotify', src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, ratio: m[1] === 'track' || m[1] === 'episode' ? 152 / 352 : 352 / 352 }
    }
  } catch {
    /* not an address */
  }
  return null
}

/* ------------------------------------------------------------------ bringing anything to a safe BioConfig */

const COLOR_LIKE = /^[0-9a-f-]{36}$/
const num = (v: unknown, def: number, lo: number, hi: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n * 100) / 100)) : def
}
const int = (v: unknown, def: number, lo: number, hi: number) => Math.round(num(v, def, lo, hi))
const pick = <T extends string>(v: unknown, list: readonly string[], def: T): T => (typeof v === 'string' && list.includes(v) ? (v as T) : def)
const bool = (v: unknown, def: boolean) => (typeof v === 'boolean' ? v : def)
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/* ------------------------------------------------------------------ colours */

export const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)
const hexOf = (v: unknown, def: string) => (isHex(v) ? v.toLowerCase() : def)
export const hexRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
/** How light a colour looks, 0 to 1. */
export const hexLum = (h: string) => {
  const [r, g, b] = hexRgb(h).map((x) => x / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const toHex = (r: number, g: number, b: number) => `#${[r, g, b].map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')}`
function hexHsl(h: string): [number, number, number] {
  const [r, g, b] = hexRgb(h).map((x) => x / 255)
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  const d = mx - mn
  if (!d) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  const hue = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [(hue * 60 + 360) % 360, s, l]
}
export function hslHex(h: number, s: number, l: number) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return toHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}
/** `n` colours from `a` to `b` the short way round the colour wheel, so blue to orange passes violet, pink and red (the way the glow is built). */
export function hueRamp(a: string, b: string, n: number): string[] {
  const [h1, s1, l1] = hexHsl(a)
  const [h2, s2, l2] = hexHsl(b)
  let dh = h2 - h1
  if (dh > 180) dh -= 360
  if (dh < -180) dh += 360
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 0 : i / (n - 1)
    return hslHex((h1 + dh * t + 360) % 360, s1 + (s2 - s1) * t, l1 + (l2 - l1) * t)
  })
}
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f<>]/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, max) : '')
const uploadId = (v: unknown) => (typeof v === 'string' && COLOR_LIKE.test(v) ? v : '')
const giphyId = (v: unknown) => (typeof v === 'string' && /^[A-Za-z0-9]{4,40}$/.test(v) ? v : '')
const blockId = (v: unknown) => (typeof v === 'string' && /^[a-z0-9]{4,16}$/.test(v) ? v : newId())
export const FONT_IDS_BIO = ['quicksand', 'jelly', 'anubis', 'geist', 'mono', 'serif', 'condensed', 'grotesk', 'bricolage', 'funnel', 'special', 'syne', 'unbounded', 'young', 'gloock', 'newsreader', 'martian', 'modern', 'tempo', 'bit8', 'script', 'hand'] as const

export function cleanBlock(raw: unknown): BioBlock | null {
  const r = obj(raw)
  const id = blockId(r.id)
  switch (r.t) {
    case 'link': {
      const url = cleanUrl(r.url)
      if (!url) return null
      const title = text(r.title, MAX_TITLE) || (() => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return 'Link' } })()
      const emoji = text(r.emoji, 8)
      const anim = pick(r.anim, LINK_ANIMS.map((x) => x.id), 'none')
      const when = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(v) ? v : '')
      const from = when(r.from)
      const until = when(r.until)
      return { id, t: 'link', title, url, icon: typeof r.icon === 'string' && /^[a-z0-9]{2,20}$/.test(r.icon) ? r.icon : 'auto', note: text(r.note, MAX_NOTE), hidden: bool(r.hidden, false), pin: bool(r.pin, false), ...(emoji ? { emoji } : {}), ...(r.featured === true ? { featured: true } : {}), ...(anim !== 'none' ? { anim } : {}), ...(from ? { from } : {}), ...(until ? { until } : {}) }
    }
    case 'social': {
      const url = cleanUrl(r.url)
      const platform = typeof r.platform === 'string' && /^[a-z0-9]{2,20}$/.test(r.platform) ? r.platform : platformOf(url) ?? ''
      return url && platform ? { id, t: 'social', platform, url, hidden: bool(r.hidden, false) } : null
    }
    case 'heading': {
      const t = text(r.text, MAX_TITLE)
      return t ? { id, t: 'heading', text: t } : null
    }
    case 'text': {
      const t = text(r.text, MAX_TEXT)
      return t ? { id, t: 'text', text: t } : null
    }
    case 'video': {
      const url = cleanUrl(r.url)
      return url ? { id, t: 'video', url, title: text(r.title, MAX_TITLE), hidden: bool(r.hidden, false) } : null
    }
    case 'divider':
      return { id, t: 'divider' }
    default:
      return null
  }
}

/**
 * Brings anything (a saved row, a request body) to a complete BioConfig. Unknown keys are dropped, numbers are clamped, ids are checked by shape and
 * addresses are cleaned. Whether an upload belongs to the person is checked separately, when it is saved.
 */
/** Was this one of the backgrounds that moved by themselves (glow, shaders, motion)? Those are gone. */
const movedOn = (kind: unknown) => kind === 'glow' || kind === 'shader' || kind === 'effect'

export function normalizeBio(raw: unknown, base: BioConfig = DEFAULT_BIO): BioConfig {
  const r = obj(raw)
  const co = obj(r.colors)
  const t = obj(r.theme)
  const a = obj(r.avatar)
  const b = obj(r.bg)
  const o = obj(r.overlay)
  const cd = obj(r.card)
  const au = obj(r.audio)
  const c = obj(r.cursor)
  const f = obj(r.fx)
  const m = obj(r.meta)
  const d = base
  const blocks: BioBlock[] = []
  const seen = new Set<string>()
  if (Array.isArray(r.blocks)) {
    for (const x of r.blocks.slice(0, MAX_BLOCKS)) {
      const blk = cleanBlock(x)
      if (!blk) continue
      if (seen.has(blk.id)) blk.id = newId()
      seen.add(blk.id)
      blocks.push(blk)
    }
  } else blocks.push(...d.blocks)
  const free = cleanFree(r.free === undefined ? d.free : r.free, seen)
  return {
    v: 1,
    look: 2,
    layout: pick(r.layout ?? d.layout, LAYOUT_IDS, 'classic'),
    ...(free ? { free } : {}),
    colors: {
      on: bool(co.on ?? d.colors.on, false),
      bg: hexOf(co.bg, d.colors.bg),
      bg2: hexOf(co.bg2, d.colors.bg2),
      text: hexOf(co.text, d.colors.text),
      accent: hexOf(co.accent, d.colors.accent),
      accent2: hexOf(co.accent2, d.colors.accent2),
    },
    theme: {
      tone: int(t.tone ?? d.theme.tone, 4, 0, 100),
      font: pick(t.font ?? d.theme.font, FONT_IDS_BIO, 'quicksand'),
      nameStyle: pick(t.nameStyle ?? d.theme.nameStyle, NAME_STYLES.map((x) => x.id), 'solid'),
      buttons: pick(t.buttons ?? d.theme.buttons, BUTTON_STYLES.map((x) => x.id), 'outline'),
      radius: int(t.radius ?? d.theme.radius, 0, 0, 40),
      align: pick(t.align ?? d.theme.align, ['left', 'center'], 'center'),
      size: pick(t.size ?? d.theme.size, ['compact', 'comfortable', 'large'], 'comfortable'),
      icons: pick(t.icons ?? d.theme.icons, ['glow', 'plain', 'boxed'], 'glow'),
    },
    avatar: {
      shape: pick(a.shape ?? d.avatar.shape, AVATAR_SHAPES.map((x) => x.id), 'circle'),
      ring: bool(a.ring ?? d.avatar.ring, true),
      float: bool(a.float ?? d.avatar.float, true),
      gray: bool(a.gray ?? d.avatar.gray, true),
      size: int(a.size ?? d.avatar.size, 100, 60, 180),
    },
    bg: {
      // the old moving backgrounds are gone: a page that had one keeps its colours as a still gradient
      kind: movedOn(b.kind) ? 'gradient' : pick(b.kind ?? d.bg.kind, BG_KINDS.map((x) => x.id), 'gradient'),
      tone: int(b.tone ?? d.bg.tone, 4, 0, 100),
      tone2: int(b.tone2 ?? d.bg.tone2, 22, 0, 100),
      angle: int(b.angle ?? d.bg.angle, 160, 0, 360),
      gradient: movedOn(b.kind) ? 'radial' : pick(b.gradient ?? d.bg.gradient, GRADIENT_STYLES.map((x) => x.id), 'radial'),
      image: b.image === undefined ? d.bg.image : uploadId(b.image),
      gif: b.gif === undefined ? d.bg.gif : giphyId(b.gif),
      video: b.video === undefined ? d.bg.video : uploadId(b.video),
      blur: int(b.blur ?? d.bg.blur, 0, 0, 40),
      dim: int(b.dim ?? d.bg.dim, 30, 0, 90),
      noise: int(b.noise ?? d.bg.noise, 12, 0, 100),
      parallax: int(b.parallax ?? d.bg.parallax, 40, 0, 100),
      vignette: int(b.vignette ?? d.bg.vignette, 45, 0, 100),
      mono: bool(b.mono ?? d.bg.mono, false),
    },
    overlay: {
      effect: pick(o.effect ?? d.overlay.effect, OVERLAYS.map((x) => x.id), 'none'),
      intensity: int(o.intensity ?? d.overlay.intensity, 40, 0, 100),
      speed: int(o.speed ?? d.overlay.speed, 50, 0, 100),
    },
    card: {
      style: pick(cd.style ?? d.card.style, CARD_STYLES.map((x) => x.id), 'glass'),
      blur: int(cd.blur ?? d.card.blur, 28, 0, 60),
      opacity: int(cd.opacity ?? d.card.opacity, 40, 0, 100),
      glare: bool(cd.glare ?? d.card.glare, true),
      width: int(cd.width ?? d.card.width, 440, 300, 640),
      banner: cd.banner === undefined ? d.card.banner : uploadId(cd.banner),
    },
    audio: {
      id: au.id === undefined ? d.audio.id : uploadId(au.id),
      title: au.title === undefined ? d.audio.title : text(au.title, 60),
      volume: int(au.volume ?? d.audio.volume, 60, 0, 100),
      loop: bool(au.loop ?? d.audio.loop, true),
      reactive: bool(au.reactive ?? d.audio.reactive, true),
    },
    cursor: {
      kind: pick(c.kind ?? d.cursor.kind, ['default', 'preset', 'upload'], 'default'),
      preset: typeof (c.preset ?? d.cursor.preset) === 'string' && /^[a-z0-9]{2,16}$/.test(String(c.preset ?? d.cursor.preset)) ? String(c.preset ?? d.cursor.preset) : 'arrow',
      ink: pick(c.ink ?? d.cursor.ink, ['white', 'black'], 'white'),
      size: int(c.size ?? d.cursor.size, 32, 20, 64),
      image: c.image === undefined ? d.cursor.image : uploadId(c.image),
      hot: pick(c.hot ?? d.cursor.hot, ['tl', 'center'], 'tl'),
      trail: pick(c.trail ?? d.cursor.trail, CURSOR_TRAILS.map((x) => x.id), 'none'),
    },
    fx: {
      enter: pick(f.enter ?? d.fx.enter, ENTER_SCREENS.map((x) => x.id), 'none'),
      enterText: f.enterText === undefined ? d.fx.enterText : text(f.enterText, 40) || 'click to enter',
      reveal: pick(f.reveal ?? d.fx.reveal, REVEALS.map((x) => x.id), 'rise'),
      tilt: bool(f.tilt ?? d.fx.tilt, true),
      magnetic: bool(f.magnetic ?? d.fx.magnetic, true),
      spotlight: bool(f.spotlight ?? d.fx.spotlight, false),
      grain: int(f.grain ?? d.fx.grain, 8, 0, 100),
      scanlines: int(f.scanlines ?? d.fx.scanlines, 0, 0, 100),
      parallax: int(f.parallax ?? d.fx.parallax, 60, 0, 100),
      typewriter: bool(f.typewriter ?? d.fx.typewriter, false),
      depth: int(f.depth ?? d.fx.depth, 60, 0, 100),
      float: bool(f.float ?? d.fx.float, true),
    },
    meta: {
      title: m.title === undefined ? d.meta.title : text(m.title, 70),
      description: m.description === undefined ? d.meta.description : text(m.description, 200),
      location: m.location === undefined ? d.meta.location : text(m.location, 40),
      index: bool(m.index ?? d.meta.index, true),
      views: bool(m.views ?? d.meta.views, false),
      badge: bool(m.badge ?? d.meta.badge, true),
      badges: bool(m.badges ?? d.meta.badges, true),
    },
    blocks,
  }
}

/** The canvas arrangement, cleaned: only things that exist, numbers in range, no extras. */
function cleanFree(raw: unknown, ids: Set<string>): Record<string, FreeBox> | undefined {
  const out: Record<string, FreeBox> = {}
  for (const [k, v] of Object.entries(obj(raw)).slice(0, MAX_BLOCKS + 6)) {
    if (!(FREE_FIXED as readonly string[]).includes(k) && !ids.has(k)) continue
    const b = obj(v)
    if (typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.w !== 'number') continue
    const r1 = (n: number) => Math.round(n * 10) / 10
    const box: FreeBox = { x: r1(num(b.x, 0, -300, 700)), y: r1(num(b.y, 0, -200, 6000)), w: r1(num(b.w, 100, 14, 700)) }
    const r = r1(num(b.r, 0, -180, 180))
    if (r) box.r = r
    const z = int(b.z, 0, 0, 99)
    if (z) box.z = z
    if (b.a === 'l' || b.a === 'r' || b.a === 'c') box.a = b.a
    const f = r1(num(b.f, 1, 0.4, 4))
    if (f !== 1) box.f = f
    out[k] = box
  }
  return Object.keys(out).length ? out : undefined
}

/** How big the name's letters are in a box of this width (so the width is the size). */
export const nameSize = (text: string, w: number, f = 1) => Math.max(12, Math.min(140, (w / (Math.max(text.length, 3) * 0.56)) * f))

/**
 * Where everything sits on the canvas layout: what the person placed, and for everything else a tidy starting arrangement (picture, name, bio,
 * socials, then the blocks one under the other). The heights are guesses, used only to space the starting arrangement.
 */
export function resolveFree(cfg: BioConfig, info: { name: string; bio: string; badges?: number }): Record<string, FreeBox> {
  const set = cfg.free ?? {}
  const def: Record<string, FreeBox> = {}
  const mid = (w: number) => Math.round((FREE_W - w) / 2)
  const a = cfg.theme.align === 'left' ? 'l' : 'c'
  let y = 44
  const av = Math.round(116 * (cfg.avatar.size / 100))
  def.avatar = { x: mid(av), y, w: av }
  y += Math.round(av * (cfg.avatar.shape === 'arch' ? 1.25 : 1)) + 26
  const nw = Math.max(110, Math.min(330, Math.round(Math.max(info.name.length, 3) * 0.56 * 52)))
  def.name = { x: mid(nw), y, w: nw, a }
  y += Math.round(nameSize(info.name, nw) * 1.15) + (info.badges ? 36 : 12)
  if (info.bio) {
    const lines = info.bio.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil((l.length * 7.6) / 306)), 0)
    def.bio = { x: mid(306), y, w: 306, a }
    y += lines * 24 + 18
  }
  const visible = cfg.blocks.filter((b) => !('hidden' in b && b.hidden))
  const socials = visible.filter((b) => b.t === 'social')
  if (socials.length) {
    const per = 44
    const gap = 10
    const row = Math.max(1, Math.floor((FREE_W - 48 + gap) / (per + gap)))
    socials.forEach((b, i) => {
      const inRow = Math.min(row, socials.length - Math.floor(i / row) * row)
      const total = inRow * per + (inRow - 1) * gap
      def[b.id] = { x: Math.round((FREE_W - total) / 2) + (i % row) * (per + gap), y: y + Math.floor(i / row) * (per + gap), w: per }
    })
    y += Math.ceil(socials.length / row) * (per + gap) + 14
  }
  const rest = visible.filter((b) => b.t !== 'social')
  const ordered = [...rest.filter((b) => b.t === 'link' && b.pin), ...rest.filter((b) => !(b.t === 'link' && b.pin))]
  const w = 326
  for (const b of ordered) {
    let h = 62
    if (b.t === 'link') h = b.note ? 70 : 60
    else if (b.t === 'video') h = Math.min(w / (embedFor(b.url)?.ratio ?? 1.78), 360) + (b.title ? 30 : 6)
    else if (b.t === 'heading') h = 40
    else if (b.t === 'text') h = Math.max(1, Math.ceil((b.text.length * 7) / w)) * 23 + 8
    else if (b.t === 'divider') h = 16
    def[b.id] = { x: mid(w), y, w, ...(b.t === 'heading' || b.t === 'text' ? { a } : {}) }
    y += h + 14
  }
  const out: Record<string, FreeBox> = {}
  for (const k of Object.keys(def)) out[k] = set[k] ? { ...def[k], ...set[k] } : def[k]
  return out
}

/** What the first set of starting looks chose, so a page that still has exactly those picks can be moved to the new set without touching anything the person changed. */
const FIRST_LOOK: Record<string, Record<string, unknown>> = {
  theme: { font: 'geist', buttons: 'glass', radius: 18 },
  avatar: { shape: 'circle', ring: true, float: true },
  bg: { kind: 'effect', effect: 'aurora', dim: 30, noise: 12, vignette: 45 },
  card: { style: 'glass', glare: true },
  fx: { tilt: true, magnetic: true, grain: 8 },
}
function upgradeLook(raw: unknown): unknown {
  const r = obj(raw)
  if (r.look === 2) return raw
  const out: Record<string, unknown> = { ...r }
  const fresh = DEFAULT_BIO as unknown as Record<string, Record<string, unknown>>
  for (const [group, picks] of Object.entries(FIRST_LOOK)) {
    const g = { ...obj(r[group]) }
    for (const [k, was] of Object.entries(picks)) if (g[k] === was) g[k] = fresh[group][k]
    out[group] = g
  }
  return out
}

export function parseBio(json: string | null | undefined): BioConfig {
  try {
    return json ? normalizeBio(upgradeLook(JSON.parse(json))) : DEFAULT_BIO
  } catch {
    return DEFAULT_BIO
  }
}

/** Applies a look on top of a page (the layout and the links are never touched). */
export function applyPreset(cfg: BioConfig, preset: BioPreset): BioConfig {
  const s = preset.set as Record<string, Record<string, unknown> | undefined>
  return normalizeBio({ ...cfg, colors: { ...cfg.colors, on: false, ...s.colors }, theme: { ...cfg.theme, ...s.theme }, bg: { ...cfg.bg, ...s.bg }, card: { ...cfg.card, ...s.card }, cursor: { ...cfg.cursor, ...s.cursor }, fx: { ...cfg.fx, ...s.fx }, overlay: { ...cfg.overlay, ...s.overlay } }, cfg)
}

/** Greys: a tone from 0 (black) to 100 (white). */
export const grey = (tone: number, alpha = 1) => {
  const v = Math.round((Math.max(0, Math.min(100, tone)) / 100) * 255)
  return alpha >= 1 ? `rgb(${v} ${v} ${v})` : `rgb(${v} ${v} ${v} / ${alpha})`
}
/** Light pages get dark text and the other way round. */
export const isLight = (tone: number) => tone > 55
export const inkFor = (tone: number) => (isLight(tone) ? 0 : 100)
/** Whether a page is light (so its text is dark): by its own background colour if it has colours, otherwise by its tone. */
export const pageLight = (cfg: Pick<BioConfig, 'colors' | 'theme'>) => (cfg.colors.on ? hexLum(cfg.colors.bg) > 0.55 : isLight(cfg.theme.tone))
