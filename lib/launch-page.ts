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

export const PAGE_ACCENTS = ['#f3f2ee', '#ff2a2a', '#ff9f43', '#ffe14d', '#5eff9a', '#4de1ff', '#6d8bff', '#b36dff', '#ff6dd0'] as const

export type PageLook = { bg: string; effect: CardEffect; accent: string; intensity: number }

export type PageCopy = {
  /** the small label above the headline while the site is closed */
  kicker: string
  /** the headline and the line under it once the site is open */
  liveHeadline: string
  liveText: string
  /** the button on /links that opens the sign-up */
  joinLabel: string
  emailPlaceholder: string
  sendLabel: string
  verifyLabel: string
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
    kicker: 'Coming soon',
    liveHeadline: 'Views have value.',
    liveText: 'Clip campaigns from artists, streamers and brands. Post the clip, get paid for every thousand views.',
    joinLabel: 'Join the waitlist',
    emailPlaceholder: 'Your email',
    sendLabel: 'Join',
    verifyLabel: 'Confirm',
    reserveLabel: 'Reserve it',
    doneTitle: 'You are on the list.',
    startTitle: 'Get started',
    startText: 'Make an account in a minute, or log in to the one you have.',
    signupLabel: 'Create an account',
    loginLabel: 'Log in',
  },
  look: { bg: 'reels', effect: 'none', accent: '#f3f2ee', intensity: 40 },
}

/** How long each piece of text may be. The editor and the server both use these. */
export const COPY_MAX: Record<keyof PageCopy, number> = {
  kicker: 32,
  liveHeadline: 90,
  liveText: 240,
  joinLabel: 32,
  emailPlaceholder: 40,
  sendLabel: 20,
  verifyLabel: 20,
  reserveLabel: 20,
  doneTitle: 60,
  startTitle: 40,
  startText: 160,
  signupLabel: 32,
  loginLabel: 32,
}
export const COPY_KEYS = Object.keys(COPY_MAX) as (keyof PageCopy)[]

const HEX = /^#[0-9a-f]{6}$/i
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
    accent: typeof l.accent === 'string' && HEX.test(l.accent) ? l.accent.toLowerCase() : DEFAULT_PAGE.look.accent,
    intensity: typeof l.intensity === 'number' && Number.isFinite(l.intensity) ? Math.round(Math.min(100, Math.max(0, l.intensity))) : DEFAULT_PAGE.look.intensity,
  }
  return { copy, look }
}

/** Which state the page is drawn in: closed (countdown and waitlist), open (Get started), or the /links page (either of those, plus the link buttons). */
export type PageMode = 'soon' | 'live'

/** A username for the waitlist: 3 to 20 lowercase letters, numbers, dots and underscores. A dot cannot start or end it, or come twice in a row. */
export const WAITLIST_HANDLE_RE = /^(?=.{3,20}$)(?!\.)(?!.*\.\.)[a-z0-9._]+(?<!\.)$/
export const normHandle = (raw: string) => raw.trim().toLowerCase().replace(/^@/, '')
