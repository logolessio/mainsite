// The typefaces the site can be set in. Safe for the browser: no font loading in here, only the list.
// Each font is loaded in app/layout.tsx under the CSS variable named here, and chosen on the dev dashboard (Design).

export type FontKind = 'sans' | 'serif' | 'mono'
export type FontDef = {
  id: string
  label: string
  kind: FontKind
  note: string
  /** The CSS variable holding this font's family (set by next/font in app/layout.tsx). */
  body: string
  /** The headline face. Most fonts use the same one; the standard look pairs Inter with Inter Tight for headlines. */
  display: string
}

export const FONTS: FontDef[] = [
  { id: 'inter', label: 'Inter', kind: 'sans', note: 'The standard look', body: '--font-f-inter', display: '--font-f-inter-tight' },
  { id: 'geist', label: 'Geist', kind: 'sans', note: 'Sharp and modern', body: '--font-f-geist', display: '--font-f-geist' },
  { id: 'dm-sans', label: 'DM Sans', kind: 'sans', note: 'Friendly and round', body: '--font-f-dm-sans', display: '--font-f-dm-sans' },
  { id: 'manrope', label: 'Manrope', kind: 'sans', note: 'Calm and geometric', body: '--font-f-manrope', display: '--font-f-manrope' },
  { id: 'sora', label: 'Sora', kind: 'sans', note: 'Wide and techy', body: '--font-f-sora', display: '--font-f-sora' },
  { id: 'space-grotesk', label: 'Space Grotesk', kind: 'sans', note: 'Quirky and bold', body: '--font-f-space-grotesk', display: '--font-f-space-grotesk' },
  { id: 'plus-jakarta', label: 'Plus Jakarta Sans', kind: 'sans', note: 'Clean and warm', body: '--font-f-plus-jakarta', display: '--font-f-plus-jakarta' },
  { id: 'outfit', label: 'Outfit', kind: 'sans', note: 'Light and airy', body: '--font-f-outfit', display: '--font-f-outfit' },
  { id: 'instrument-serif', label: 'Instrument Serif', kind: 'serif', note: 'Editorial and elegant', body: '--font-f-instrument-serif', display: '--font-f-instrument-serif' },
  { id: 'fraunces', label: 'Fraunces', kind: 'serif', note: 'Soft and characterful', body: '--font-f-fraunces', display: '--font-f-fraunces' },
  { id: 'playfair', label: 'Playfair Display', kind: 'serif', note: 'Classic and dramatic', body: '--font-f-playfair', display: '--font-f-playfair' },
  { id: 'geist-mono', label: 'Geist Mono', kind: 'mono', note: 'Technical and tidy', body: '--font-mono-face', display: '--font-mono-face' },
  { id: 'jetbrains-mono', label: 'JetBrains Mono', kind: 'mono', note: 'Made for code', body: '--font-f-jetbrains-mono', display: '--font-f-jetbrains-mono' },
  { id: 'ibm-plex-mono', label: 'IBM Plex Mono', kind: 'mono', note: 'Typewriter with taste', body: '--font-f-ibm-plex-mono', display: '--font-f-ibm-plex-mono' },
  { id: 'space-mono', label: 'Space Mono', kind: 'mono', note: 'Retro and playful', body: '--font-f-space-mono', display: '--font-f-space-mono' },
]

export const FONT_IDS = FONTS.map((f) => f.id) as [string, ...string[]]
export const DEFAULT_FONT = 'inter'
export const fontById = (id: string | undefined | null) => FONTS.find((f) => f.id === id) ?? FONTS[0]

/** The font that is in use, given the saved choice. (An older switch, "Geist Mono as the main font", still counts.) */
export const effectiveFont = (saved: string | undefined, legacyMono: string | undefined) => (saved && saved !== DEFAULT_FONT && FONT_IDS.includes(saved) ? saved : legacyMono === '1' ? 'geist-mono' : DEFAULT_FONT)
