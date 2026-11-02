// The link-in-bio pages (logoless.io/<name>): what a page is made of, its choices, and how any saved or posted JSON is brought to a complete, safe BioConfig.
// Shared by the browser (the editor, the live page) and the server (saving, rendering). No secrets and no database code here.
//
// Everything about the look is monochrome on purpose: tones of grey, black and white. A person's own pictures and videos may bring colour; they can be
// turned to grey with one switch (`bg.mono`, on by default).
import { LINK_PLATFORMS } from './profile-style'

/* ------------------------------------------------------------------ the ten layouts */

export const LAYOUTS = [
  { id: 'aura', name: 'Aura', note: 'centred and calm. your picture floats.' },
  { id: 'split', name: 'Split', note: 'your name stays put while the links scroll past.' },
  { id: 'poster', name: 'Poster', note: 'your name, as big as the screen.' },
  { id: 'bento', name: 'Bento', note: 'tiles that drift at different speeds.' },
  { id: 'stack', name: 'Stack', note: 'cards pile up as you scroll.' },
  { id: 'orbit', name: 'Orbit', note: 'links circle your picture.' },
  { id: 'index', name: 'Index', note: 'a plain list. hover a row and a preview shows up.' },
  { id: 'terminal', name: 'Terminal', note: 'just lines of text and a blinking cursor.' },
  { id: 'chapters', name: 'Chapters', note: 'one link per screen.' },
  { id: 'reel', name: 'Reel', note: 'a film strip that runs as you scroll.' },
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

/** How the display name is painted. Only black, white and grey. */
export const NAME_STYLES = [
  { id: 'solid', name: 'Solid' },
  { id: 'outline', name: 'Outline' },
  { id: 'chrome', name: 'Chrome' },
  { id: 'shimmer', name: 'Shimmer' },
  { id: 'glitch', name: 'Glitch' },
  { id: 'flicker', name: 'Flicker' },
  { id: 'ghost', name: 'Ghost' },
  { id: 'scramble', name: 'Scramble' },
] as const
export type NameStyle = (typeof NAME_STYLES)[number]['id']

export const AVATAR_SHAPES = [
  { id: 'circle', name: 'Circle' },
  { id: 'rounded', name: 'Rounded' },
  { id: 'square', name: 'Square' },
  { id: 'arch', name: 'Arch' },
] as const
export type AvatarShape = (typeof AVATAR_SHAPES)[number]['id']

/** Behind everything. `tone` is a flat tone of grey, `gradient` a blend between two tones. */
export const BG_KINDS = [
  { id: 'tone', name: 'Tone' },
  { id: 'gradient', name: 'Gradient' },
  { id: 'shader', name: 'Shader' },
  { id: 'effect', name: 'Motion' },
  { id: 'image', name: 'Picture' },
  { id: 'gif', name: 'GIF' },
  { id: 'video', name: 'Video' },
] as const
export type BioBgKind = (typeof BG_KINDS)[number]['id']

/** The backgrounds drawn by the graphics card (components/bio/shaders.ts). */
export const BIO_SHADERS = [
  { id: 'liquid', name: 'Liquid' },
  { id: 'mercury', name: 'Mercury' },
  { id: 'smoke', name: 'Smoke' },
  { id: 'ripple', name: 'Ripple' },
  { id: 'contour', name: 'Contour' },
  { id: 'dither', name: 'Dither' },
  { id: 'static', name: 'Static' },
] as const
export type BioShader = (typeof BIO_SHADERS)[number]['id']

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

/** The moving backgrounds. The painters live in components/profile/backdrop-effects.ts and are drawn here in greys only. */
export const BIO_EFFECTS = [
  { id: 'dots', name: 'Wave dots' },
  { id: 'aurora', name: 'Veil' },
  { id: 'warp', name: 'Starfield' },
  { id: 'synth', name: 'Grid' },
  { id: 'mesh', name: 'Mesh' },
  { id: 'constellation', name: 'Constellation' },
  { id: 'silk', name: 'Silk' },
  { id: 'bokeh', name: 'Bokeh' },
  { id: 'matrix', name: 'Rain code' },
] as const
export type BioEffect = (typeof BIO_EFFECTS)[number]['id']

export const OVERLAYS = [
  { id: 'none', name: 'None' },
  { id: 'snow', name: 'Snow' },
  { id: 'rain', name: 'Rain' },
  { id: 'fireflies', name: 'Dust' },
  { id: 'sparkle', name: 'Glitter' },
  { id: 'bubbles', name: 'Bubbles' },
  { id: 'embers', name: 'Ash' },
] as const
export type BioOverlay = (typeof OVERLAYS)[number]['id']

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
  | { id: string; t: 'link'; title: string; url: string; icon: string; note: string; hidden: boolean; pin: boolean }
  | { id: string; t: 'social'; platform: string; url: string; hidden: boolean }
  | { id: string; t: 'heading'; text: string }
  | { id: string; t: 'text'; text: string }
  | { id: string; t: 'video'; url: string; title: string; hidden: boolean }
  | { id: string; t: 'divider' }

export type BioBlockKind = BioBlock['t']
export const MAX_BLOCKS = 80
export const MAX_TITLE = 80
export const MAX_NOTE = 140
export const MAX_TEXT = 600

export type BioConfig = {
  v: 1
  layout: LayoutId
  theme: {
    /** the page's tone, 0 black to 100 white; the text turns itself the other way */
    tone: number
    font: string
    nameStyle: NameStyle
    buttons: ButtonStyle
    radius: number
    align: 'left' | 'center'
    size: 'compact' | 'comfortable' | 'large'
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
    effect: BioEffect
    shader: BioShader
    /** soften the background, in pixels */
    blur: number
    dim: number
    noise: number
    intensity: number
    speed: number
    /** how far the background drifts against the scroll, 0 to 100 */
    parallax: number
    vignette: number
    /** turn colour pictures, GIFs and videos to grey */
    mono: boolean
  }
  overlay: { effect: BioOverlay; intensity: number; speed: number }
  /** the panel the profile sits in (the centred layouts) */
  card: { style: CardStyle; blur: number; opacity: number; glare: boolean }
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
  layout: 'aura',
  theme: { tone: 4, font: 'geist', nameStyle: 'solid', buttons: 'glass', radius: 18, align: 'center', size: 'comfortable' },
  avatar: { shape: 'circle', ring: true, float: true, gray: true, size: 100 },
  bg: { kind: 'effect', tone: 4, tone2: 22, angle: 160, gradient: 'radial', image: '', gif: '', video: '', effect: 'aurora', shader: 'liquid', blur: 0, dim: 30, noise: 12, intensity: 50, speed: 40, parallax: 40, vignette: 45, mono: true },
  overlay: { effect: 'none', intensity: 40, speed: 50 },
  card: { style: 'glass', blur: 28, opacity: 40, glare: true },
  audio: { id: '', title: '', volume: 60, loop: true, reactive: true },
  cursor: { kind: 'default', preset: 'arrow', ink: 'white', size: 32, image: '', hot: 'tl', trail: 'none' },
  fx: { enter: 'none', enterText: 'click to enter', reveal: 'rise', tilt: true, magnetic: true, spotlight: false, grain: 8, scanlines: 0, parallax: 60, typewriter: false },
  meta: { title: '', description: '', location: '', index: true, views: false, badge: true, badges: true },
  blocks: [],
}

/** What a brand-new page starts with, so the first look is never empty. */
export function starterBlocks(): BioBlock[] {
  return [link('My latest edit', 'https://youtube.com', 'Watch it on YouTube'), link('Portfolio', 'https://example.com'), link('Book me', 'mailto:hello@example.com')]
}

/* ------------------------------------------------------------------ looks: one tap sets a whole page */

export type BioPreset = { id: string; name: string; note: string; swatch: [number, number]; set: Partial<{ [K in keyof BioConfig]: Partial<BioConfig[K]> }> }
export const PRESETS: BioPreset[] = [
  { id: 'noir', name: 'Noir', note: 'black, a slow veil, glass buttons', swatch: [4, 28], set: { layout: undefined, theme: { tone: 4, nameStyle: 'solid', buttons: 'glass', font: 'geist' }, bg: { kind: 'effect', effect: 'aurora', dim: 30, blur: 0, noise: 12, tone: 4 }, cursor: { kind: 'default', trail: 'none' }, fx: { grain: 8, scanlines: 0, spotlight: false } } },
  { id: 'paper', name: 'Paper', note: 'off white, ink, a serif', swatch: [94, 10], set: { theme: { tone: 94, nameStyle: 'solid', buttons: 'brutal', font: 'newsreader', radius: 2 }, bg: { kind: 'tone', tone: 94, dim: 0, noise: 22, vignette: 0 }, cursor: { kind: 'preset', preset: 'dot', ink: 'black', trail: 'none' }, fx: { grain: 14, scanlines: 0, spotlight: false } } },
  { id: 'static', name: 'Static', note: 'grain, scan lines, a spotlight', swatch: [10, 70], set: { theme: { tone: 6, nameStyle: 'glitch', buttons: 'outline', font: 'mono', radius: 0 }, bg: { kind: 'effect', effect: 'matrix', dim: 55, noise: 40, tone: 6 }, cursor: { kind: 'preset', preset: 'cross', ink: 'white', trail: 'ink' }, fx: { grain: 30, scanlines: 40, spotlight: true } } },
  { id: 'chrome', name: 'Chrome', note: 'polished metal type on black', swatch: [2, 82], set: { theme: { tone: 2, nameStyle: 'chrome', buttons: 'glass', font: 'special', radius: 40 }, bg: { kind: 'effect', effect: 'silk', dim: 20, noise: 6, tone: 2 }, cursor: { kind: 'preset', preset: 'orb', ink: 'white', trail: 'comet' }, fx: { grain: 6, scanlines: 0, spotlight: true } } },
  { id: 'void', name: 'Void', note: 'stars, nothing else', swatch: [0, 50], set: { theme: { tone: 0, nameStyle: 'shimmer', buttons: 'ghost', font: 'syne', radius: 30 }, bg: { kind: 'effect', effect: 'warp', dim: 10, noise: 0, tone: 0 }, cursor: { kind: 'preset', preset: 'spark', ink: 'white', trail: 'spark' }, fx: { grain: 0, scanlines: 0, spotlight: false } } },
  { id: 'concrete', name: 'Concrete', note: 'mid grey, hard edges', swatch: [52, 14], set: { theme: { tone: 52, nameStyle: 'outline', buttons: 'brutal', font: 'condensed', radius: 0 }, bg: { kind: 'gradient', gradient: 'linear', tone: 60, tone2: 40, angle: 180, noise: 35, dim: 0, vignette: 30 }, cursor: { kind: 'preset', preset: 'frame', ink: 'black', trail: 'none' }, fx: { grain: 26, scanlines: 0, spotlight: false } } },
  { id: 'cinema', name: 'Cinema', note: 'letterbox black, film grain', swatch: [3, 60], set: { theme: { tone: 3, nameStyle: 'ghost', buttons: 'underline', font: 'gloock', radius: 0 }, bg: { kind: 'effect', effect: 'bokeh', dim: 35, noise: 24, tone: 3 }, cursor: { kind: 'preset', preset: 'playhead', ink: 'white', trail: 'none' }, fx: { grain: 28, scanlines: 8, spotlight: false } } },
  { id: 'mist', name: 'Mist', note: 'soft white, blurred light', swatch: [88, 60], set: { theme: { tone: 88, nameStyle: 'solid', buttons: 'glass', font: 'funnel', radius: 28 }, bg: { kind: 'gradient', gradient: 'mesh', tone: 96, tone2: 70, noise: 16, dim: 0, blur: 0, vignette: 0 }, cursor: { kind: 'preset', preset: 'ring', ink: 'black', trail: 'ring' }, fx: { grain: 10, scanlines: 0, spotlight: false } } },
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
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f<>]/g, '').replace(/[ \t]+/g, ' ').trim().slice(0, max) : '')
const uploadId = (v: unknown) => (typeof v === 'string' && COLOR_LIKE.test(v) ? v : '')
const giphyId = (v: unknown) => (typeof v === 'string' && /^[A-Za-z0-9]{4,40}$/.test(v) ? v : '')
const blockId = (v: unknown) => (typeof v === 'string' && /^[a-z0-9]{4,16}$/.test(v) ? v : newId())
export const FONT_IDS_BIO = ['geist', 'mono', 'serif', 'condensed', 'grotesk', 'bricolage', 'funnel', 'special', 'syne', 'unbounded', 'young', 'gloock', 'newsreader', 'martian', 'modern', 'tempo', 'bit8', 'script', 'hand'] as const

export function cleanBlock(raw: unknown): BioBlock | null {
  const r = obj(raw)
  const id = blockId(r.id)
  switch (r.t) {
    case 'link': {
      const url = cleanUrl(r.url)
      if (!url) return null
      const title = text(r.title, MAX_TITLE) || (() => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return 'Link' } })()
      return { id, t: 'link', title, url, icon: typeof r.icon === 'string' && /^[a-z0-9]{2,20}$/.test(r.icon) ? r.icon : 'auto', note: text(r.note, MAX_NOTE), hidden: bool(r.hidden, false), pin: bool(r.pin, false) }
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
export function normalizeBio(raw: unknown, base: BioConfig = DEFAULT_BIO): BioConfig {
  const r = obj(raw)
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
  return {
    v: 1,
    layout: pick(r.layout ?? d.layout, LAYOUT_IDS, 'aura'),
    theme: {
      tone: int(t.tone ?? d.theme.tone, 4, 0, 100),
      font: pick(t.font ?? d.theme.font, FONT_IDS_BIO, 'geist'),
      nameStyle: pick(t.nameStyle ?? d.theme.nameStyle, NAME_STYLES.map((x) => x.id), 'solid'),
      buttons: pick(t.buttons ?? d.theme.buttons, BUTTON_STYLES.map((x) => x.id), 'glass'),
      radius: int(t.radius ?? d.theme.radius, 18, 0, 40),
      align: pick(t.align ?? d.theme.align, ['left', 'center'], 'center'),
      size: pick(t.size ?? d.theme.size, ['compact', 'comfortable', 'large'], 'comfortable'),
    },
    avatar: {
      shape: pick(a.shape ?? d.avatar.shape, AVATAR_SHAPES.map((x) => x.id), 'circle'),
      ring: bool(a.ring ?? d.avatar.ring, true),
      float: bool(a.float ?? d.avatar.float, true),
      gray: bool(a.gray ?? d.avatar.gray, true),
      size: int(a.size ?? d.avatar.size, 100, 60, 180),
    },
    bg: {
      kind: pick(b.kind ?? d.bg.kind, BG_KINDS.map((x) => x.id), 'effect'),
      tone: int(b.tone ?? d.bg.tone, 4, 0, 100),
      tone2: int(b.tone2 ?? d.bg.tone2, 22, 0, 100),
      angle: int(b.angle ?? d.bg.angle, 160, 0, 360),
      gradient: pick(b.gradient ?? d.bg.gradient, GRADIENT_STYLES.map((x) => x.id), 'radial'),
      image: b.image === undefined ? d.bg.image : uploadId(b.image),
      gif: b.gif === undefined ? d.bg.gif : giphyId(b.gif),
      video: b.video === undefined ? d.bg.video : uploadId(b.video),
      effect: pick(b.effect ?? d.bg.effect, BIO_EFFECTS.map((x) => x.id), 'aurora'),
      shader: pick(b.shader ?? d.bg.shader, BIO_SHADERS.map((x) => x.id), 'liquid'),
      blur: int(b.blur ?? d.bg.blur, 0, 0, 40),
      dim: int(b.dim ?? d.bg.dim, 30, 0, 90),
      noise: int(b.noise ?? d.bg.noise, 12, 0, 100),
      intensity: int(b.intensity ?? d.bg.intensity, 50, 0, 100),
      speed: int(b.speed ?? d.bg.speed, 40, 0, 100),
      parallax: int(b.parallax ?? d.bg.parallax, 40, 0, 100),
      vignette: int(b.vignette ?? d.bg.vignette, 45, 0, 100),
      mono: bool(b.mono ?? d.bg.mono, true),
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

export function parseBio(json: string | null | undefined): BioConfig {
  try {
    return json ? normalizeBio(JSON.parse(json)) : DEFAULT_BIO
  } catch {
    return DEFAULT_BIO
  }
}

/** Applies a look on top of a page (the layout and the links are never touched). */
export function applyPreset(cfg: BioConfig, preset: BioPreset): BioConfig {
  const s = preset.set as Record<string, Record<string, unknown> | undefined>
  return normalizeBio({ ...cfg, theme: { ...cfg.theme, ...s.theme }, bg: { ...cfg.bg, ...s.bg }, cursor: { ...cfg.cursor, ...s.cursor }, fx: { ...cfg.fx, ...s.fx }, overlay: { ...cfg.overlay, ...s.overlay } }, cfg)
}

/** Greys: a tone from 0 (black) to 100 (white). */
export const grey = (tone: number, alpha = 1) => {
  const v = Math.round((Math.max(0, Math.min(100, tone)) / 100) * 255)
  return alpha >= 1 ? `rgb(${v} ${v} ${v})` : `rgb(${v} ${v} ${v} / ${alpha})`
}
/** Light pages get dark text and the other way round. */
export const isLight = (tone: number) => tone > 55
export const inkFor = (tone: number) => (isLight(tone) ? 0 : 100)
