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
  { id: 'cormorant', label: 'Cormorant Garamond', kind: 'serif', note: 'Refined and airy. Headlines in Cormorant Garamond, text in Inter', body: '--font-f-inter', display: '--font-f-cormorant' },
  { id: 'eb-garamond', label: 'EB Garamond', kind: 'serif', note: 'The classic book serif. Headlines in EB Garamond, text in Inter', body: '--font-f-inter', display: '--font-f-eb-garamond' },
  { id: 'dm-serif', label: 'DM Serif Display', kind: 'serif', note: 'Bold and high contrast. Headlines in DM Serif Display, text in Inter', body: '--font-f-inter', display: '--font-f-dm-serif' },
  { id: 'libre-caslon', label: 'Libre Caslon', kind: 'serif', note: 'Traditional and sturdy. Headlines in Libre Caslon, text in Inter', body: '--font-f-inter', display: '--font-f-libre-caslon' },
  { id: 'libre-baskerville', label: 'Libre Baskerville', kind: 'serif', note: 'Warm and literary. Headlines in Libre Baskerville, text in Inter', body: '--font-f-inter', display: '--font-f-libre-baskerville' },
  { id: 'cinzel', label: 'Cinzel', kind: 'serif', note: 'Roman capitals, carved in stone. Headlines in Cinzel, text in Inter', body: '--font-f-inter', display: '--font-f-cinzel' },
  { id: 'abril', label: 'Abril Fatface', kind: 'serif', note: 'Fat face, poster sized. Headlines in Abril Fatface, text in Inter', body: '--font-f-inter', display: '--font-f-abril' },
  { id: 'prata', label: 'Prata', kind: 'serif', note: 'Elegant and fashionable. Headlines in Prata, text in Inter', body: '--font-f-inter', display: '--font-f-prata' },
  { id: 'rufina', label: 'Rufina', kind: 'serif', note: 'Crisp and decorative. Headlines in Rufina, text in Inter', body: '--font-f-inter', display: '--font-f-rufina' },
  { id: 'spectral', label: 'Spectral', kind: 'serif', note: 'Quiet and readable. Headlines in Spectral, text in Inter', body: '--font-f-inter', display: '--font-f-spectral' },
  { id: 'lora', label: 'Lora', kind: 'serif', note: 'Balanced and calligraphic. Headlines in Lora, text in Inter', body: '--font-f-inter', display: '--font-f-lora' },
  { id: 'old-standard', label: 'Old Standard', kind: 'serif', note: 'A nineteenth century scholar. Headlines in Old Standard, text in Inter', body: '--font-f-inter', display: '--font-f-old-standard' },
  { id: 'gilda', label: 'Gilda Display', kind: 'serif', note: 'Light, classical engraving. Headlines in Gilda Display, text in Inter', body: '--font-f-inter', display: '--font-f-gilda' },
  { id: 'playfair-sc', label: 'Playfair Display SC', kind: 'serif', note: 'Small capitals, dramatic. Headlines in Playfair Display SC, text in Inter', body: '--font-f-inter', display: '--font-f-playfair-sc' },
  { id: 'marcellus', label: 'Marcellus', kind: 'serif', note: 'Flared and monumental. Headlines in Marcellus, text in Inter', body: '--font-f-inter', display: '--font-f-marcellus' },
  { id: 'yeseva', label: 'Yeseva One', kind: 'serif', note: 'Feminine and bold. Headlines in Yeseva One, text in Inter', body: '--font-f-inter', display: '--font-f-yeseva' },
  { id: 'italiana', label: 'Italiana', kind: 'serif', note: 'Delicate and tall. Headlines in Italiana, text in Inter', body: '--font-f-inter', display: '--font-f-italiana' },
  { id: 'bellefair', label: 'Bellefair', kind: 'serif', note: 'Hebrew inspired, graceful. Headlines in Bellefair, text in Inter', body: '--font-f-inter', display: '--font-f-bellefair' },
  { id: 'vidaloka', label: 'Vidaloka', kind: 'serif', note: 'Soft didone. Headlines in Vidaloka, text in Inter', body: '--font-f-inter', display: '--font-f-vidaloka' },
  { id: 'rozha', label: 'Rozha One', kind: 'serif', note: 'Heavy and glamorous. Headlines in Rozha One, text in Inter', body: '--font-f-inter', display: '--font-f-rozha' },
  { id: 'cardo', label: 'Cardo', kind: 'serif', note: 'For scholars. Headlines in Cardo, text in Inter', body: '--font-f-inter', display: '--font-f-cardo' },
  { id: 'crimson', label: 'Crimson Pro', kind: 'serif', note: 'A book face, cleanly set. Headlines in Crimson Pro, text in Inter', body: '--font-f-inter', display: '--font-f-crimson' },
  { id: 'sorts-mill', label: 'Sorts Mill Goudy', kind: 'serif', note: 'Goudy, revived. Headlines in Sorts Mill Goudy, text in Inter', body: '--font-f-inter', display: '--font-f-sorts-mill' },
  { id: 'libre-bodoni', label: 'Libre Bodoni', kind: 'serif', note: 'Didone with a book feel. Headlines in Libre Bodoni, text in Inter', body: '--font-f-inter', display: '--font-f-libre-bodoni' },
  { id: 'baskervville', label: 'Baskervville', kind: 'serif', note: 'Baskerville, light and sharp. Headlines in Baskervville, text in Inter', body: '--font-f-inter', display: '--font-f-baskervville' },
  { id: 'forum', label: 'Forum', kind: 'serif', note: 'Roman inscriptions. Headlines in Forum, text in Inter', body: '--font-f-inter', display: '--font-f-forum' },
  { id: 'cormorant-infant', label: 'Cormorant Infant', kind: 'serif', note: 'Garamond with a friendly a and g. Headlines in Cormorant Infant, text in Inter', body: '--font-f-inter', display: '--font-f-cormorant-infant' },
  { id: 'castoro', label: 'Castoro', kind: 'serif', note: 'Sharp serifs, open shapes. Headlines in Castoro, text in Inter', body: '--font-f-inter', display: '--font-f-castoro' },
  { id: 'ovo', label: 'Ovo', kind: 'serif', note: 'Gentle and old style. Headlines in Ovo, text in Inter', body: '--font-f-inter', display: '--font-f-ovo' },
  { id: 'gelasio', label: 'Gelasio', kind: 'serif', note: 'Georgia in spirit. Headlines in Gelasio, text in Inter', body: '--font-f-inter', display: '--font-f-gelasio' },
  { id: 'source-serif', label: 'Source Serif', kind: 'serif', note: 'Clear and modern. Headlines in Source Serif, text in Inter', body: '--font-f-inter', display: '--font-f-source-serif' },
  { id: 'noto-display', label: 'Noto Serif Display', kind: 'serif', note: 'High contrast, very wide range. Headlines in Noto Serif Display, text in Inter', body: '--font-f-inter', display: '--font-f-noto-display' },
  { id: 'libre-caslon-display', label: 'Libre Caslon Display', kind: 'serif', note: 'Caslon, cut for large sizes. Headlines in Libre Caslon Display, text in Inter', body: '--font-f-inter', display: '--font-f-libre-caslon-display' },
  { id: 'dm-serif-text', label: 'DM Serif Text', kind: 'serif', note: 'Sturdy and warm. Headlines in DM Serif Text, text in Inter', body: '--font-f-inter', display: '--font-f-dm-serif-text' },
  { id: 'im-fell', label: 'IM Fell English', kind: 'serif', note: 'Seventeenth century print. Headlines in IM Fell English, text in Inter', body: '--font-f-inter', display: '--font-f-im-fell' },
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

// ---------- one typeface for each job ----------
// Design, "Fonts by use": a dial for each of these picks a single typeface, on top of the whole-site preset above. A job left on
// "preset" follows the preset's own choice.

export type Role = 'headline' | 'body' | 'ui' | 'figures' | 'mono'

export type Face = { id: string; label: string; kind: FontKind; /** the CSS variable holding the family */ var: string }

const PAIR_LABELS: Record<string, string> = { '--font-f-inter': 'Inter', '--font-f-inter-tight': 'Inter Tight', '--font-f-funnel-sans': 'Funnel Sans', '--font-f-funnel-display': 'Funnel Display' }

/** Every single typeface the site can be set in, once each (the presets pair them up). */
export const FACES: Face[] = (() => {
  const seen = new Map<string, Face>()
  const add = (v: string, label: string, kind: FontKind, id: string) => {
    if (!seen.has(v)) seen.set(v, { id, label, kind, var: v })
  }
  for (const f of FONTS) {
    if (f.body === f.display) add(f.body, f.label, f.kind, f.id)
  }
  for (const f of FONTS) {
    if (f.body === f.display) continue
    // a preset that pairs two faces: the headline face is named by the preset (the serifs), or by the small table
    add(f.display, PAIR_LABELS[f.display] ?? f.label, f.kind === 'mono' ? 'mono' : f.kind, f.display.replace('--font-f-', ''))
    add(f.body, PAIR_LABELS[f.body] ?? f.label, 'sans', f.body.replace('--font-f-', ''))
  }
  return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label))
})()

export const FACE_IDS = FACES.map((f) => f.id) as [string, ...string[]]
export const faceById = (id: string | null | undefined) => FACES.find((f) => f.id === id) ?? null

export const ROLES: { id: Role; label: string; hint: string; setting: string; sample: string; cssVar: string }[] = [
  { id: 'headline', label: 'Headlines', hint: 'The big titles and the headings of every page.', setting: 'design_font_headline', sample: 'Your views have value.', cssVar: '--font-display-face' },
  { id: 'body', label: 'Body text', hint: 'Paragraphs, descriptions and everything that is read.', setting: 'design_font_body', sample: 'Join a campaign, post and get paid for your views.', cssVar: '--font-body' },
  { id: 'ui', label: 'Buttons and menus', hint: 'Buttons, tabs, menus, fields and labels.', setting: 'design_font_ui', sample: 'Start earning', cssVar: '--font-ui' },
  { id: 'figures', label: 'Big numbers', hint: 'Balances, totals and the large figures.', setting: 'design_font_figures', sample: '$12,480.00', cssVar: '--font-figures' },
  { id: 'mono', label: 'Code and small print', hint: 'Anything set in a monospaced face.', setting: 'design_font_mono_face', sample: 'logoless.io/@you  ·  26,000 views', cssVar: '--font-mono-pick' },
]
export const ROLE_SETTING_KEYS = ROLES.map((r) => r.setting) as ('design_font_headline' | 'design_font_body' | 'design_font_ui' | 'design_font_figures' | 'design_font_mono_face')[]
