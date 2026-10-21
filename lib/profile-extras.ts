// The newer profile choices (the "profile studio"): page backgrounds, overlays, GIFs, solid-colour pictures, noise,
// text-effect controls, effect tints and finer privacy. Kept in one JSON column (profiles.style_json) so the older
// columns stay as they are. Shared by the browser and the server: no secrets or database code here.

export const BG_EFFECTS = [
  { id: 'dots', label: 'Wave dots', note: 'The rolling dot landscape' },
  { id: 'aurora', label: 'Aurora', note: 'Slow curtains of light' },
  { id: 'warp', label: 'Starfield', note: 'Flying through stars' },
  { id: 'synth', label: 'Synthwave', note: 'A neon grid to the horizon' },
  { id: 'mesh', label: 'Mesh', note: 'Soft drifting colour' },
  { id: 'constellation', label: 'Constellation', note: 'Points joined by threads' },
  { id: 'silk', label: 'Silk', note: 'Flowing lines' },
  { id: 'bokeh', label: 'Bokeh', note: 'Out-of-focus lights' },
  { id: 'matrix', label: 'Rain code', note: 'Falling characters' },
] as const
export type BgEffect = (typeof BG_EFFECTS)[number]['id']
const BG_EFFECT_IDS = BG_EFFECTS.map((e) => e.id) as string[]

/** What sits behind the card on the public page. `default` keeps the site's own background. */
export const BG_KINDS = ['default', 'effect', 'color', 'image', 'gif', 'video'] as const
export type BgKind = (typeof BG_KINDS)[number]

/** Effects that can float over the whole page, in front of the background. They reuse the card effects. */
export const OVERLAY_EFFECTS = [
  { id: 'none', label: 'None' },
  { id: 'embers', label: 'Embers' },
  { id: 'snow', label: 'Snow' },
  { id: 'fireflies', label: 'Fireflies' },
  { id: 'sparkle', label: 'Glitter' },
  { id: 'petals', label: 'Petals' },
  { id: 'leaves', label: 'Autumn' },
  { id: 'rain', label: 'Rain' },
  { id: 'bubbles', label: 'Bubbles' },
] as const
export type OverlayEffect = (typeof OVERLAY_EFFECTS)[number]['id']
const OVERLAY_IDS = OVERLAY_EFFECTS.map((e) => e.id) as string[]

export const AVATAR_KINDS = ['image', 'color', 'gif'] as const
export type AvatarKind = (typeof AVATAR_KINDS)[number]
export const AVATAR_GLYPHS = ['initials', 'emoji', 'none'] as const
export type AvatarGlyph = (typeof AVATAR_GLYPHS)[number]

export const PROFILE_VISIBILITY = [
  { id: 'public', label: 'Everyone', hint: 'Anyone with the link can see your page.' },
  { id: 'members', label: 'Signed-in members', hint: 'Only people signed in to logoless can see it.' },
  { id: 'private', label: 'Only me', hint: 'Your page shows as private to everyone else.' },
] as const
export type ProfileVisibility = (typeof PROFILE_VISIBILITY)[number]['id']

export type ProfileExtras = {
  avatar: { kind: AvatarKind; color: string; glyph: AvatarGlyph; emoji: string; gif: string; noise: number }
  banner: { gif: string; aspect: number; noise: number }
  name: { intensity: number; speed: number; angle: number }
  effectTint: { color: string; amount: number }
  bg: { kind: BgKind; effect: BgEffect; color: string; image: string; gif: string; video: string; dim: number; noise: number; intensity: number; speed: number }
  overlay: { effect: OverlayEffect; intensity: number; speed: number; tint: string; tintAmount: number }
  privacy: { profile: ProfileVisibility; hiddenLinks: string[]; verifiedTicks: boolean }
}

/** The usual banner shape is 16 by 9. A taller picture makes the banner taller, up to square. */
export const BANNER_ASPECT_MIN = 9 / 16
export const BANNER_ASPECT_MAX = 1

export const DEFAULT_EXTRAS: ProfileExtras = {
  avatar: { kind: 'image', color: '#6d8bff', glyph: 'initials', emoji: '✨', gif: '', noise: 0 },
  banner: { gif: '', aspect: BANNER_ASPECT_MIN, noise: 0 },
  name: { intensity: 50, speed: 50, angle: 90 },
  effectTint: { color: '#ffffff', amount: 0 },
  bg: { kind: 'default', effect: 'dots', color: '#0b0b10', image: '', gif: '', video: '', dim: 35, noise: 0, intensity: 50, speed: 50 },
  overlay: { effect: 'none', intensity: 40, speed: 50, tint: '#ffffff', tintAmount: 0 },
  privacy: { profile: 'public', hiddenLinks: [], verifiedTicks: true },
}

const COLOR = /^#[0-9a-f]{6}$/i
/** GIPHY ids are short letters and digits. Nothing else is accepted, so a saved GIF can only ever point at GIPHY. */
export const GIPHY_ID = /^[A-Za-z0-9]{4,40}$/
const UPLOAD_ID = /^[0-9a-f-]{36}$/

const num = (v: unknown, def: number, lo = 0, hi = 100) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n * 1000) / 1000)) : def
}
const pct = (v: unknown, def: number) => Math.round(num(v, def))
const col = (v: unknown, def: string) => (typeof v === 'string' && COLOR.test(v) ? v.toLowerCase() : def)
const pick = <T extends string>(v: unknown, list: readonly string[], def: T): T => (typeof v === 'string' && list.includes(v) ? (v as T) : def)
const id = (v: unknown, re: RegExp) => (typeof v === 'string' && re.test(v) ? v : '')
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

/** One emoji (a single visible character, possibly built from several code points). Anything else is refused. */
export function cleanEmoji(v: unknown): string {
  if (typeof v !== 'string') return ''
  const s = v.trim()
  if (!s || s.length > 16) return ''
  const seg = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)] : [{ segment: s }]
  if (seg.length !== 1) return ''
  return /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(s) ? s : ''
}

/**
 * Brings anything (a saved row, a request body) to a complete, safe ProfileExtras. Unknown keys are dropped, numbers
 * are clamped and ids are checked by shape. Whether an upload belongs to the person is checked separately on save.
 */
export function normalizeExtras(raw: unknown, base: ProfileExtras = DEFAULT_EXTRAS): ProfileExtras {
  const r = obj(raw)
  const a = obj(r.avatar)
  const b = obj(r.banner)
  const n = obj(r.name)
  const t = obj(r.effectTint)
  const g = obj(r.bg)
  const o = obj(r.overlay)
  const p = obj(r.privacy)
  const d = base
  return {
    avatar: {
      kind: pick(a.kind ?? d.avatar.kind, AVATAR_KINDS, 'image'),
      color: col(a.color ?? d.avatar.color, DEFAULT_EXTRAS.avatar.color),
      glyph: pick(a.glyph ?? d.avatar.glyph, AVATAR_GLYPHS, 'initials'),
      emoji: a.emoji === undefined ? d.avatar.emoji : cleanEmoji(a.emoji) || DEFAULT_EXTRAS.avatar.emoji,
      gif: a.gif === undefined ? d.avatar.gif : id(a.gif, GIPHY_ID),
      noise: pct(a.noise ?? d.avatar.noise, 0),
    },
    banner: {
      gif: b.gif === undefined ? d.banner.gif : id(b.gif, GIPHY_ID),
      aspect: num(b.aspect ?? d.banner.aspect, BANNER_ASPECT_MIN, BANNER_ASPECT_MIN, BANNER_ASPECT_MAX),
      noise: pct(b.noise ?? d.banner.noise, 0),
    },
    name: { intensity: pct(n.intensity ?? d.name.intensity, 50), speed: pct(n.speed ?? d.name.speed, 50), angle: Math.round(num(n.angle ?? d.name.angle, 90, 0, 360)) },
    effectTint: { color: col(t.color ?? d.effectTint.color, '#ffffff'), amount: pct(t.amount ?? d.effectTint.amount, 0) },
    bg: {
      kind: pick(g.kind ?? d.bg.kind, BG_KINDS, 'default'),
      effect: pick(g.effect ?? d.bg.effect, BG_EFFECT_IDS, 'dots'),
      color: col(g.color ?? d.bg.color, DEFAULT_EXTRAS.bg.color),
      image: g.image === undefined ? d.bg.image : id(g.image, UPLOAD_ID),
      gif: g.gif === undefined ? d.bg.gif : id(g.gif, GIPHY_ID),
      video: g.video === undefined ? d.bg.video : id(g.video, UPLOAD_ID) || id(g.video, GIPHY_ID),
      dim: pct(g.dim ?? d.bg.dim, 35),
      noise: pct(g.noise ?? d.bg.noise, 0),
      intensity: pct(g.intensity ?? d.bg.intensity, 50),
      speed: pct(g.speed ?? d.bg.speed, 50),
    },
    overlay: {
      effect: pick(o.effect ?? d.overlay.effect, OVERLAY_IDS, 'none'),
      intensity: pct(o.intensity ?? d.overlay.intensity, 40),
      speed: pct(o.speed ?? d.overlay.speed, 50),
      tint: col(o.tint ?? d.overlay.tint, '#ffffff'),
      tintAmount: pct(o.tintAmount ?? d.overlay.tintAmount, 0),
    },
    privacy: {
      profile: pick(p.profile ?? d.privacy.profile, PROFILE_VISIBILITY.map((v) => v.id), 'public'),
      hiddenLinks: Array.isArray(p.hiddenLinks) ? [...new Set(p.hiddenLinks.filter((x): x is string => typeof x === 'string' && /^[a-z]{2,20}$/.test(x)))].slice(0, 20) : d.privacy.hiddenLinks,
      verifiedTicks: typeof p.verifiedTicks === 'boolean' ? p.verifiedTicks : d.privacy.verifiedTicks,
    },
  }
}

export const parseExtras = (json: string | null | undefined): ProfileExtras => {
  try {
    return normalizeExtras(json ? JSON.parse(json) : {})
  } catch {
    return normalizeExtras({})
  }
}

// ---------- addresses ----------
export const giphyStill = (id: string) => `https://media.giphy.com/media/${id}/200_s.gif`
export const giphyImage = (id: string) => `https://media.giphy.com/media/${id}/giphy.webp`
export const giphyVideo = (id: string) => `https://media.giphy.com/media/${id}/giphy.mp4`
/** A background video is either one of our uploads (a uuid) or a GIPHY clip. */
export const bgVideoSrc = (v: string) => (UPLOAD_ID.test(v) ? `/api/img/${v}` : giphyVideo(v))

/** Fine film grain as a CSS background layer. `amount` is 0 to 100. */
export function noiseLayer(amount: number) {
  const a = Math.max(0, Math.min(1, amount / 100)) * 0.9
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 ${a.toFixed(3)} -0.12'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E") 0 0/180px 180px`
}

/** Initials for a picture: the first letter of the first two words, or the first two letters of one word. */
export function initialsOf(name: string, handle = '') {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const s = words.length >= 2 ? `${[...words[0]][0]}${[...words[1]][0]}` : [...(words[0] ?? handle)].slice(0, 2).join('')
  return s.toUpperCase() || '?'
}

/** Mixes the tint into a colour: amount 0 keeps the colour, 100 moves it 60% of the way (a tint, never a repaint). */
export function tintHex(hex: string, tint: string, amount: number) {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  if (!COLOR.test(hex) || !COLOR.test(tint) || amount <= 0) return hex
  const k = Math.min(1, amount / 100) * 0.6
  const [a, b] = [p(hex), p(tint)]
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join('')}`
}
