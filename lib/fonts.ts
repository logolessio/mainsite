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
  /** The headline face. Most fonts use the same one; the standard look pairs Inter with Gloock for headlines and titles. */
  display: string
}

export const FONTS: FontDef[] = [
  { id: 'inter', label: 'Inter with Gloock headlines', kind: 'sans', note: 'The standard look: Gloock for headers and titles, Inter for everything else', body: '--font-f-inter', display: '--font-f-gloock' },
  { id: 'inter-tight', label: 'Inter Tight headlines', kind: 'sans', note: 'The earlier look: Inter Tight for headlines, Inter for the rest', body: '--font-f-inter', display: '--font-f-inter-tight' },
  { id: 'bricolage', label: 'Bricolage Grotesque', kind: 'sans', note: 'Characterful and editorial', body: '--font-f-bricolage', display: '--font-f-bricolage' },
  { id: 'funnel', label: 'Funnel', kind: 'sans', note: 'Sleek and sharp', body: '--font-f-funnel-sans', display: '--font-f-funnel-display' },
  { id: 'hanken', label: 'Hanken Grotesk', kind: 'sans', note: 'Quiet and precise', body: '--font-f-hanken', display: '--font-f-hanken' },
  { id: 'instrument-sans', label: 'Instrument Sans', kind: 'sans', note: 'Modern and neutral', body: '--font-f-instrument-sans', display: '--font-f-instrument-sans' },
  { id: 'schibsted', label: 'Schibsted Grotesk', kind: 'sans', note: 'Newsroom sharp', body: '--font-f-schibsted', display: '--font-f-schibsted' },
  { id: 'special-gothic', label: 'Special Gothic', kind: 'sans', note: 'Confident and tall', body: '--font-f-special-gothic', display: '--font-f-special-gothic' },
  { id: 'host', label: 'Host Grotesk', kind: 'sans', note: 'Crisp and contemporary', body: '--font-f-host', display: '--font-f-host' },
  { id: 'familjen', label: 'Familjen Grotesk', kind: 'sans', note: 'Slightly odd, very stylish', body: '--font-f-familjen', display: '--font-f-familjen' },
  { id: 'mona', label: 'Mona Sans', kind: 'sans', note: 'Wide and refined', body: '--font-f-mona', display: '--font-f-mona' },
  { id: 'onest', label: 'Onest', kind: 'sans', note: 'Smooth and open', body: '--font-f-onest', display: '--font-f-onest' },
  { id: 'figtree', label: 'Figtree', kind: 'sans', note: 'Friendly and clean', body: '--font-f-figtree', display: '--font-f-figtree' },
  { id: 'geologica', label: 'Geologica', kind: 'sans', note: 'Soft geometric', body: '--font-f-geologica', display: '--font-f-geologica' },
  { id: 'wix', label: 'Wix Madefor Display', kind: 'sans', note: 'Polished and calm', body: '--font-f-wix', display: '--font-f-wix' },
  { id: 'syne', label: 'Syne', kind: 'sans', note: 'Bold and artsy', body: '--font-f-syne', display: '--font-f-syne' },
  { id: 'newsreader', label: 'Newsreader', kind: 'serif', note: 'An elegant text serif', body: '--font-f-newsreader', display: '--font-f-newsreader' },
  { id: 'young-serif', label: 'Young Serif', kind: 'serif', note: 'Warm and heavy', body: '--font-f-young-serif', display: '--font-f-young-serif' },
  { id: 'gloock', label: 'Gloock', kind: 'serif', note: 'High contrast and dramatic', body: '--font-f-gloock', display: '--font-f-gloock' },
  { id: 'bodoni', label: 'Bodoni Moda', kind: 'serif', note: 'Fashion editorial', body: '--font-f-bodoni', display: '--font-f-bodoni' },
  { id: 'martian', label: 'Martian Mono', kind: 'mono', note: 'Wide and futuristic', body: '--font-f-martian', display: '--font-f-martian' },
  { id: 'dm-mono', label: 'DM Mono', kind: 'mono', note: 'Soft and quiet', body: '--font-f-dm-mono', display: '--font-f-dm-mono' },
  { id: 'fragment', label: 'Fragment Mono', kind: 'mono', note: 'A neo-grotesque mono', body: '--font-f-fragment', display: '--font-f-fragment' },
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
