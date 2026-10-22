// The words and look of the one page that is both the coming-soon screen and logoless.io/links (the "launch-links" feature).
// Safe for the browser: no database here. The headline, the line under it and the countdown are the ordinary launch_* settings
// (so the Launch page in the admin dashboard stays in step); everything else is one JSON row, settings key `site:launch-page`.

import { BANNER_PRESET_IDS, CARD_EFFECT_IDS, type CardEffect } from './profile-style'

/** The backgrounds made for this page, before the profile banners (which can be picked too). */
export const PAGE_BACKGROUNDS = [
  { id: 'reels', label: 'Reels', note: 'Clips drifting past, counting views' },
  { id: 'glow', label: 'Glow', note: 'A soft light in your accent' },
  { id: 'void', label: 'Black', note: 'Nothing but the words' },
] as const
export const PAGE_BACKGROUND_IDS: string[] = [...PAGE_BACKGROUNDS.map((b) => b.id), ...BANNER_PRESET_IDS]

/** The page is black and white like the rest of the site: its accent is a shade of white or grey, never a colour. */
export const PAGE_ACCENTS = ['#f3f2ee', '#ffffff', '#d4d4d8', '#a1a1aa', '#71717a'] as const
/** True for a grey, a white or a black: the red, green and blue values are almost the same. */
const neutral = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return Math.max(r, g, b) - Math.min(r, g, b) <= 14
}

/** How the page is laid out and how its buttons look. Every one of these is a choice in the owner's editor. */
export const PAGE_ALIGNS = [
  { id: 'center', label: 'Centred' },
  { id: 'left', label: 'Left' },
] as const
export const PAGE_ROWS = [
  { id: 'outline', label: 'Outline', note: 'A thin line round each link' },
  { id: 'solid', label: 'Solid', note: 'White buttons' },
  { id: 'minimal', label: 'Text only', note: 'No box, just the link' },
] as const
export const PAGE_SHAPES = [
  { id: 'pill', label: 'Pill' },
  { id: 'round', label: 'Rounded' },
  { id: 'square', label: 'Square' },
] as const
export const PAGE_FONTS = [
  { id: 'serif', label: 'Serif', note: 'The site headline font' },
  { id: 'sans', label: 'Sans', note: 'The plain interface font' },
] as const
export const PAGE_SIZES = [
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
] as const
export const PAGE_SOCIALS = [
  { id: 'top', label: 'Under the logo' },
  { id: 'bottom', label: 'At the bottom' },
  { id: 'off', label: 'Hidden' },
] as const

type Id<T extends readonly { id: string }[]> = T[number]['id']
export type PageLook = {
  bg: string
  effect: CardEffect
  accent: string
  intensity: number
  align: Id<typeof PAGE_ALIGNS>
  rows: Id<typeof PAGE_ROWS>
  shape: Id<typeof PAGE_SHAPES>
  font: Id<typeof PAGE_FONTS>
  size: Id<typeof PAGE_SIZES>
  socials: Id<typeof PAGE_SOCIALS>
  /** the logo at the top */
  logo: boolean
}

export type PageCopy = {
  /** the headline and the line under it once the site is open */
  liveHeadline: string
  liveText: string
  /** the button on /links that opens the sign-up */
  joinLabel: string
  emailPlaceholder: string
  sendLabel: string
  reserveLabel: string
  doneTitle: string
  startTitle: string
  startText: string
  signupLabel: string
  loginLabel: string
}

export type PageConfig = { copy: PageCopy; look: PageLook }

export const DEFAULT_PAGE: PageConfig = {
  copy: {
    liveHeadline: 'Views have value.',
    liveText: 'Clip campaigns from artists, streamers and brands. Post the clip, get paid for every thousand views.',
    joinLabel: 'Join the waitlist',
    emailPlaceholder: 'Your email',
    sendLabel: 'Join',
    reserveLabel: 'Reserve it',
    doneTitle: 'You are on the list.',
    startTitle: 'Get started',
    startText: 'Make an account in a minute, or log in to the one you have.',
    signupLabel: 'Create an account',
    loginLabel: 'Log in',
  },
  look: { bg: 'void', effect: 'none', accent: '#f3f2ee', intensity: 40, align: 'center', rows: 'outline', shape: 'pill', font: 'serif', size: 'medium', socials: 'top', logo: true },
}

/** How long each piece of text may be. The editor and the server both use these. */
export const COPY_MAX: Record<keyof PageCopy, number> = {
  liveHeadline: 90,
  liveText: 240,
  joinLabel: 32,
  emailPlaceholder: 40,
  sendLabel: 20,
  reserveLabel: 20,
  doneTitle: 60,
  startTitle: 40,
  startText: 160,
  signupLabel: 32,
  loginLabel: 32,
}
export const COPY_KEYS = Object.keys(COPY_MAX) as (keyof PageCopy)[]

const HEX = /^#[0-9a-f]{6}$/i
/** A choice from a list, or the default when it is anything else. */
const pick = <T extends readonly { id: string }[]>(list: T, v: unknown, fallback: Id<T>): Id<T> => (list.some((o) => o.id === v) ? (v as Id<T>) : fallback)
const oneLine = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** Anything from the database or the browser, made safe: unknown keys dropped, bad values replaced by the defaults. */
export function cleanPage(input: unknown): PageConfig {
  const raw = (input ?? {}) as { copy?: Record<string, unknown>; look?: Record<string, unknown> }
  const copy = { ...DEFAULT_PAGE.copy }
  for (const k of COPY_KEYS) {
    const v = oneLine(raw.copy?.[k], COPY_MAX[k])
    if (v) copy[k] = v
  }
  const l = raw.look ?? {}
  const look: PageLook = {
    bg: typeof l.bg === 'string' && PAGE_BACKGROUND_IDS.includes(l.bg) ? l.bg : DEFAULT_PAGE.look.bg,
    effect: typeof l.effect === 'string' && CARD_EFFECT_IDS.includes(l.effect) ? (l.effect as CardEffect) : DEFAULT_PAGE.look.effect,
    accent: typeof l.accent === 'string' && HEX.test(l.accent) && neutral(l.accent) ? l.accent.toLowerCase() : DEFAULT_PAGE.look.accent,
    intensity: typeof l.intensity === 'number' && Number.isFinite(l.intensity) ? Math.round(Math.min(100, Math.max(0, l.intensity))) : DEFAULT_PAGE.look.intensity,
    align: pick(PAGE_ALIGNS, l.align, DEFAULT_PAGE.look.align),
    rows: pick(PAGE_ROWS, l.rows, DEFAULT_PAGE.look.rows),
    shape: pick(PAGE_SHAPES, l.shape, DEFAULT_PAGE.look.shape),
    font: pick(PAGE_FONTS, l.font, DEFAULT_PAGE.look.font),
    size: pick(PAGE_SIZES, l.size, DEFAULT_PAGE.look.size),
    socials: pick(PAGE_SOCIALS, l.socials, DEFAULT_PAGE.look.socials),
    logo: typeof l.logo === 'boolean' ? l.logo : DEFAULT_PAGE.look.logo,
  }
  return { copy, look }
}

/** Which state the page is drawn in: closed (countdown and waitlist), open (Get started), or the /links page (either of those, plus the link buttons). */
export type PageMode = 'soon' | 'live'

/** A username for the waitlist: 1 to 20 lowercase letters, numbers, dots and underscores. A dot can be first or last but not twice in a row, and it cannot be dots alone. */
export const WAITLIST_HANDLE_RE = /^(?=.*[a-z0-9_])(?!.*\.\.)[a-z0-9._]{1,20}$/
export const normHandle = (raw: string) => raw.trim().toLowerCase().replace(/^@/, '')
