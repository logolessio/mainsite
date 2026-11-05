// The link-in-bio pages (logoless.io/<name>): what a page is made of, its choices, and how any saved or posted JSON is brought to a complete, safe BioConfig.
// Shared by the browser (the editor, the live page) and the server (saving, rendering). No secrets and no database code here.
//
// A page starts black, white and grey. A person can switch on their own colours (`colors.on`): a background, a second background, text, and two accents that
// tint the name, the buttons, the glow and the moving backgrounds. Their own pictures and videos may bring colour too (`bg.mono` turns them to grey).
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

/** Behind everything. `tone` is a flat tone (or the page's colour), `gradient` a blend of two, `glow` a soft rainbow rising from the bottom that breathes. */
export const BG_KINDS = [
  { id: 'tone', name: 'Tone' },
  { id: 'gradient', name: 'Gradient' },
  { id: 'glow', name: 'Glow' },
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
  /** which set of starting looks this page was made under: 2 is the flat, square one (a page saved before it still has the first set until it is read once) */
  look?: 2
  layout: LayoutId
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
  look: 2,
  layout: 'aura',
  colors: { on: false, bg: '#08080c', bg2: '#16183a', text: '#f4f4f6', accent: '#417fff', accent2: '#ff6e1d' },
  theme: { tone: 4, font: 'anubis', nameStyle: 'solid', buttons: 'outline', radius: 0, align: 'center', size: 'comfortable' },
  avatar: { shape: 'square', ring: false, float: false, gray: true, size: 100 },
  bg: { kind: 'tone', tone: 4, tone2: 22, angle: 160, gradient: 'radial', image: '', gif: '', video: '', effect: 'aurora', shader: 'liquid', blur: 0, dim: 0, noise: 0, intensity: 50, speed: 40, parallax: 40, vignette: 0, mono: true },
  overlay: { effect: 'none', intensity: 40, speed: 50 },
  card: { style: 'none', blur: 28, opacity: 40, glare: false },
  audio: { id: '', title: '', volume: 60, loop: true, reactive: true },
  cursor: { kind: 'default', preset: 'arrow', ink: 'white', size: 32, image: '', hot: 'tl', trail: 'none' },
  fx: { enter: 'none', enterText: 'click to enter', reveal: 'rise', tilt: false, magnetic: false, spotlight: false, grain: 0, scanlines: 0, parallax: 60, typewriter: false },
  meta: { title: '', description: '', location: '', index: true, views: false, badge: true, badges: true },
  blocks: [],
}

/** What a brand-new page starts with, so the first look is never empty. */
export function starterBlocks(): BioBlock[] {
  return [link('My latest edit', 'https://youtube.com', 'Watch it on YouTube'), link('Portfolio', 'https://example.com'), link('Book me', 'mailto:hello@example.com')]
}

/* ------------------------------------------------------------------ looks: one tap sets a whole page */

export type BioPreset = { id: string; name: string; note: string; swatch: [number, number]; /** shown on the card instead of the greys: background, second background, accent, second accent */ hues?: [string, string, string, string]; set: Partial<{ [K in keyof BioConfig]: Partial<BioConfig[K]> }> }
export const PRESETS: BioPreset[] = [
  { id: 'anubis', name: 'Anubis', note: 'flat black, mono words, square hairlines', swatch: [4, 90], set: { theme: { tone: 4, nameStyle: 'solid', buttons: 'outline', font: 'anubis', radius: 0 }, bg: { kind: 'tone', tone: 4, dim: 0, blur: 0, noise: 0, vignette: 0 }, cursor: { kind: 'default', trail: 'none' }, fx: { grain: 0, scanlines: 0, spotlight: false, tilt: false, magnetic: false } } },
  { id: 'noir', name: 'Noir', note: 'black, a slow veil, glass buttons', swatch: [4, 28], set: { layout: undefined, theme: { tone: 4, nameStyle: 'solid', buttons: 'glass', font: 'anubis' }, bg: { kind: 'effect', effect: 'aurora', dim: 30, blur: 0, noise: 12, tone: 4 }, cursor: { kind: 'default', trail: 'none' }, fx: { grain: 8, scanlines: 0, spotlight: false } } },
  { id: 'paper', name: 'Paper', note: 'off white, ink, a serif', swatch: [94, 10], set: { theme: { tone: 94, nameStyle: 'solid', buttons: 'brutal', font: 'anubis', radius: 0 }, bg: { kind: 'tone', tone: 94, dim: 0, noise: 22, vignette: 0 }, cursor: { kind: 'preset', preset: 'dot', ink: 'black', trail: 'none' }, fx: { grain: 14, scanlines: 0, spotlight: false } } },
  { id: 'static', name: 'Static', note: 'grain, scan lines, a spotlight', swatch: [10, 70], set: { theme: { tone: 6, nameStyle: 'glitch', buttons: 'outline', font: 'anubis', radius: 0 }, bg: { kind: 'effect', effect: 'matrix', dim: 55, noise: 40, tone: 6 }, cursor: { kind: 'preset', preset: 'cross', ink: 'white', trail: 'ink' }, fx: { grain: 30, scanlines: 40, spotlight: true } } },
  { id: 'chrome', name: 'Chrome', note: 'polished metal type on black', swatch: [2, 82], set: { theme: { tone: 2, nameStyle: 'chrome', buttons: 'glass', font: 'anubis', radius: 0 }, bg: { kind: 'effect', effect: 'silk', dim: 20, noise: 6, tone: 2 }, cursor: { kind: 'preset', preset: 'orb', ink: 'white', trail: 'comet' }, fx: { grain: 6, scanlines: 0, spotlight: true } } },
  { id: 'void', name: 'Void', note: 'stars, nothing else', swatch: [0, 50], set: { theme: { tone: 0, nameStyle: 'shimmer', buttons: 'ghost', font: 'anubis', radius: 0 }, bg: { kind: 'effect', effect: 'warp', dim: 10, noise: 0, tone: 0 }, cursor: { kind: 'preset', preset: 'spark', ink: 'white', trail: 'spark' }, fx: { grain: 0, scanlines: 0, spotlight: false } } },
  { id: 'concrete', name: 'Concrete', note: 'mid grey, hard edges', swatch: [52, 14], set: { theme: { tone: 52, nameStyle: 'outline', buttons: 'brutal', font: 'anubis', radius: 0 }, bg: { kind: 'gradient', gradient: 'linear', tone: 60, tone2: 40, angle: 180, noise: 35, dim: 0, vignette: 30 }, cursor: { kind: 'preset', preset: 'frame', ink: 'black', trail: 'none' }, fx: { grain: 26, scanlines: 0, spotlight: false } } },
  { id: 'cinema', name: 'Cinema', note: 'letterbox black, film grain', swatch: [3, 60], set: { theme: { tone: 3, nameStyle: 'ghost', buttons: 'underline', font: 'anubis', radius: 0 }, bg: { kind: 'effect', effect: 'bokeh', dim: 35, noise: 24, tone: 3 }, cursor: { kind: 'preset', preset: 'playhead', ink: 'white', trail: 'none' }, fx: { grain: 28, scanlines: 8, spotlight: false } } },
  { id: 'mist', name: 'Mist', note: 'soft white, blurred light', swatch: [88, 60], set: { theme: { tone: 88, nameStyle: 'solid', buttons: 'glass', font: 'anubis', radius: 0 }, bg: { kind: 'gradient', gradient: 'mesh', tone: 96, tone2: 70, noise: 16, dim: 0, blur: 0, vignette: 0 }, cursor: { kind: 'preset', preset: 'ring', ink: 'black', trail: 'ring' }, fx: { grain: 10, scanlines: 0, spotlight: false } } },
  /* the coloured ones: each switches the page's own colours on */
  { id: 'aurora', name: 'Aurora glow', note: 'a blue to orange glow rising from the bottom', swatch: [4, 90], hues: ['#07070c', '#0e1230', '#417fff', '#ff6e1d'], set: { colors: { on: true, bg: '#07070c', bg2: '#0e1230', text: '#f5f6fa', accent: '#417fff', accent2: '#ff6e1d' }, theme: { nameStyle: 'gradient', buttons: 'glass', font: 'geist', radius: 18 }, bg: { kind: 'glow', speed: 40, noise: 0, dim: 0, vignette: 0 }, card: { style: 'none' }, fx: { grain: 14 }, overlay: { effect: 'none' } } },
  { id: 'lava', name: 'Lava', note: 'red and amber glow on black', swatch: [4, 80], hues: ['#0a0000', '#7f1d1d', '#ef4444', '#f59e0b'], set: { colors: { on: true, bg: '#0a0000', bg2: '#7f1d1d', text: '#fff1f2', accent: '#ef4444', accent2: '#f59e0b' }, theme: { nameStyle: 'gradient', buttons: 'glass', font: 'syne', radius: 14 }, bg: { kind: 'glow', speed: 50, noise: 0, dim: 0, vignette: 0 }, card: { style: 'none' }, fx: { grain: 12 }, overlay: { effect: 'embers' } } },
  { id: 'sunset', name: 'Sunset', note: 'plum into coral, soft mesh', swatch: [10, 80], hues: ['#1a0a24', '#ff5e62', '#ffb347', '#ff5e62'], set: { colors: { on: true, bg: '#1a0a24', bg2: '#ff5e62', text: '#fff4ec', accent: '#ffb347', accent2: '#ff5e62' }, theme: { nameStyle: 'gradient', buttons: 'solid', font: 'bricolage', radius: 18 }, bg: { kind: 'gradient', gradient: 'mesh', angle: 160, speed: 40, dim: 0, vignette: 0 }, card: { style: 'none' }, fx: { grain: 8 }, overlay: { effect: 'none' } } },
  { id: 'ocean', name: 'Ocean', note: 'deep blue liquid', swatch: [6, 80], hues: ['#04121f', '#0b3b5c', '#38bdf8', '#6366f1'], set: { colors: { on: true, bg: '#04121f', bg2: '#0b3b5c', text: '#e8f7ff', accent: '#38bdf8', accent2: '#6366f1' }, theme: { nameStyle: 'glow', buttons: 'glass', font: 'geist', radius: 18 }, bg: { kind: 'shader', shader: 'liquid', intensity: 55, speed: 35, dim: 20, vignette: 30 }, card: { style: 'none' }, fx: { grain: 6 }, overlay: { effect: 'bubbles' } } },
  { id: 'neon', name: 'Neon city', note: 'magenta and cyan on a grid', swatch: [3, 80], hues: ['#07030f', '#1a0733', '#ff2bd6', '#00e5ff'], set: { colors: { on: true, bg: '#07030f', bg2: '#1a0733', text: '#fdf4ff', accent: '#ff2bd6', accent2: '#00e5ff' }, theme: { nameStyle: 'neon', buttons: 'outline', font: 'syne', radius: 10 }, bg: { kind: 'effect', effect: 'synth', intensity: 60, speed: 45, dim: 10, vignette: 40 }, card: { style: 'none' }, fx: { scanlines: 20, grain: 6 }, overlay: { effect: 'none' } } },
  { id: 'forest', name: 'Forest', note: 'green veils and drifting dust', swatch: [4, 80], hues: ['#06100b', '#0f3d28', '#4ade80', '#a3e635'], set: { colors: { on: true, bg: '#06100b', bg2: '#0f3d28', text: '#eafff1', accent: '#4ade80', accent2: '#a3e635' }, theme: { nameStyle: 'gradient', buttons: 'glass', font: 'newsreader', radius: 18 }, bg: { kind: 'effect', effect: 'aurora', intensity: 55, speed: 30, dim: 15, vignette: 35 }, card: { style: 'none' }, fx: { grain: 8 }, overlay: { effect: 'fireflies' } } },
  { id: 'candy', name: 'Candy', note: 'pink and violet on soft white', swatch: [94, 20], hues: ['#fff1f7', '#ffd6ea', '#ff4fa3', '#8b5cf6'], set: { colors: { on: true, bg: '#fff1f7', bg2: '#ffd6ea', text: '#3b0a2a', accent: '#ff4fa3', accent2: '#8b5cf6' }, theme: { nameStyle: 'gradient', buttons: 'solid', font: 'unbounded', radius: 24 }, bg: { kind: 'gradient', gradient: 'linear', angle: 150, speed: 40, dim: 0, vignette: 0 }, card: { style: 'none' }, fx: { grain: 0 }, overlay: { effect: 'sparkle' } } },
  { id: 'midnight', name: 'Midnight', note: 'indigo stars', swatch: [4, 80], hues: ['#05070f', '#141b4d', '#818cf8', '#c084fc'], set: { colors: { on: true, bg: '#05070f', bg2: '#141b4d', text: '#e9ecff', accent: '#818cf8', accent2: '#c084fc' }, theme: { nameStyle: 'glow', buttons: 'outline', font: 'geist', radius: 14 }, bg: { kind: 'effect', effect: 'warp', intensity: 50, speed: 30, dim: 10, vignette: 40 }, card: { style: 'none' }, fx: { grain: 6 }, overlay: { effect: 'none' } } },
  { id: 'gold', name: 'Gold', note: 'black and gold, a serif', swatch: [4, 85], hues: ['#0b0a07', '#2a210b', '#e7b84a', '#fff0b3'], set: { colors: { on: true, bg: '#0b0a07', bg2: '#2a210b', text: '#f6edd3', accent: '#e7b84a', accent2: '#fff0b3' }, theme: { nameStyle: 'shimmer', buttons: 'outline', font: 'gloock', radius: 4 }, bg: { kind: 'gradient', gradient: 'radial', speed: 40, dim: 0, vignette: 30 }, card: { style: 'none' }, fx: { grain: 10 }, overlay: { effect: 'sparkle' } } },
  { id: 'rose', name: 'Rose', note: 'pink bokeh and glitter', swatch: [4, 80], hues: ['#14080c', '#4a1226', '#fb7185', '#f9a8d4'], set: { colors: { on: true, bg: '#14080c', bg2: '#4a1226', text: '#ffeef3', accent: '#fb7185', accent2: '#f9a8d4' }, theme: { nameStyle: 'glow', buttons: 'glass', font: 'young', radius: 20 }, bg: { kind: 'effect', effect: 'bokeh', intensity: 55, speed: 30, dim: 15, vignette: 35 }, card: { style: 'none' }, fx: { grain: 6 }, overlay: { effect: 'sparkle' } } },
  { id: 'mint', name: 'Mint', note: 'fresh green on white', swatch: [95, 20], hues: ['#ecfdf5', '#a7f3d0', '#10b981', '#06b6d4'], set: { colors: { on: true, bg: '#ecfdf5', bg2: '#a7f3d0', text: '#052e1c', accent: '#10b981', accent2: '#06b6d4' }, theme: { nameStyle: 'gradient', buttons: 'solid', font: 'funnel', radius: 20 }, bg: { kind: 'gradient', gradient: 'mesh', angle: 160, speed: 40, dim: 0, vignette: 0 }, card: { style: 'none' }, fx: { grain: 0 }, overlay: { effect: 'none' } } },
  { id: 'vapor', name: 'Vapor', note: 'purple and pink, scan lines', swatch: [6, 80], hues: ['#0b0220', '#3a0ca3', '#f72585', '#4cc9f0'], set: { colors: { on: true, bg: '#0b0220', bg2: '#3a0ca3', text: '#f3e8ff', accent: '#f72585', accent2: '#4cc9f0' }, theme: { nameStyle: 'gradient', buttons: 'glass', font: 'unbounded', radius: 12 }, bg: { kind: 'gradient', gradient: 'conic', angle: 200, speed: 40, dim: 0, vignette: 30 }, card: { style: 'none' }, fx: { scanlines: 14, grain: 8 }, overlay: { effect: 'none' } } },
  { id: 'ice', name: 'Ice', note: 'a pale glow on white', swatch: [96, 20], hues: ['#f4faff', '#cfe8ff', '#2563eb', '#06b6d4'], set: { colors: { on: true, bg: '#f4faff', bg2: '#cfe8ff', text: '#0b2540', accent: '#2563eb', accent2: '#06b6d4' }, theme: { nameStyle: 'gradient', buttons: 'glass', font: 'geist', radius: 18 }, bg: { kind: 'glow', speed: 40, noise: 0, dim: 0, vignette: 0 }, card: { style: 'none' }, fx: { grain: 6 }, overlay: { effect: 'none' } } },
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
export const FONT_IDS_BIO = ['anubis', 'geist', 'mono', 'serif', 'condensed', 'grotesk', 'bricolage', 'funnel', 'special', 'syne', 'unbounded', 'young', 'gloock', 'newsreader', 'martian', 'modern', 'tempo', 'bit8', 'script', 'hand'] as const

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
  return {
    v: 1,
    look: 2,
    layout: pick(r.layout ?? d.layout, LAYOUT_IDS, 'aura'),
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
      font: pick(t.font ?? d.theme.font, FONT_IDS_BIO, 'anubis'),
      nameStyle: pick(t.nameStyle ?? d.theme.nameStyle, NAME_STYLES.map((x) => x.id), 'solid'),
      buttons: pick(t.buttons ?? d.theme.buttons, BUTTON_STYLES.map((x) => x.id), 'outline'),
      radius: int(t.radius ?? d.theme.radius, 0, 0, 40),
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
  return normalizeBio({ ...cfg, colors: { ...cfg.colors, on: false, ...s.colors }, theme: { ...cfg.theme, ...s.theme }, bg: { ...cfg.bg, ...s.bg }, cursor: { ...cfg.cursor, ...s.cursor }, fx: { ...cfg.fx, ...s.fx }, overlay: { ...cfg.overlay, ...s.overlay } }, cfg)
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
