// Shared (browser + server) pieces of the artist invite flow. No secrets or database code here.

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,28}[a-z0-9]$/

/** Names that are real pages, files or things staff would use. An invite can never take one of these. */
export const RESERVED_SLUGS = new Set([
  'about', 'admin', 'api', 'brand', 'brands', 'campaign', 'campaigns', 'careers', 'contact', 'covers', 'dashboard', 'faq', 'for-brands', 'for-clippers',
  'forgot-password', 'how-it-works', 'legal', 'login', 'logout', 'onboarding', 'out', 'payouts', 'pricing', 'previews', 'signup', 'trust', 'u', 'welcome',
  'robots', 'sitemap', 'icon', 'apple-icon', 'favicon', 'logo', 'logoless', 'reset-password', 'verify-email', 'support', 'help', 'staff', 'root', 'static',
  'terms', 'privacy', 'settings', 'account', 'billing', 'pay', 'app', 'www', 'mail', 'email', 'dev', 'test', 'blog', 'news', 'press', 'jobs', 'status',
  'security', 'invite', 'invites', 'join', 'start', 'artist', 'artists', 'clipper', 'clippers', 'profile', 'profiles', 'search', 'home', 'index', 'null',
  'undefined', 'official', 'team', 'discord', 'stripe', 'webhook', 'webhooks', 'auth', 'oauth', 'callback',
])

export const slugFromName = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/, '')

export function slugProblem(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return 'Use 3 to 30 lowercase letters, numbers or single dashes.'
  if (RESERVED_SLUGS.has(slug)) return 'That name is used by the site. Pick another.'
  return null
}

export const GENRES = ['Hip-hop', 'Pop', 'R&B', 'Rock', 'Electronic', 'Dance', 'Latin', 'Afrobeats', 'Country', 'Indie', 'Metal', 'Jazz', 'Classical', 'K-pop', 'Gospel', 'Lo-fi', 'Other']
export const RELEASE_KINDS = ['Single', 'Album or EP', 'Music video', 'Tour or show', 'Merch drop', 'Something else']
export const ARTIST_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'IE', 'DE', 'FR', 'NL', 'ES', 'IT', 'SE', 'NO', 'DK', 'BR', 'MX', 'NG', 'ZA', 'IN', 'JP', 'KR', 'SG', 'NZ', 'Other']
export const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia', IE: 'Ireland', DE: 'Germany', FR: 'France', NL: 'Netherlands', ES: 'Spain', IT: 'Italy',
  SE: 'Sweden', NO: 'Norway', DK: 'Denmark', BR: 'Brazil', MX: 'Mexico', NG: 'Nigeria', ZA: 'South Africa', IN: 'India', JP: 'Japan', KR: 'South Korea', SG: 'Singapore',
  NZ: 'New Zealand', Other: 'Somewhere else',
}

/** What the artist fills in. Everything is text so a half-finished form saves cleanly. */
export type InviteData = {
  stageName?: string
  handle?: string
  country?: string
  genres?: string[]
  pitch?: string
  links?: Record<string, string>
  avatar?: string
  cover?: string
  projectTitle?: string
  projectKind?: string
  projectUrl?: string
  releaseDate?: string
  platforms?: string[]
  summary?: string
  clipThis?: string
  offLimits?: string
  assetsUrl?: string
  budget?: string
  rate?: string
  endsOn?: string
  agreed?: boolean
}

export const STEPS = [
  { id: 'hello', chapter: 'Welcome', title: 'Welcome' },
  { id: 'you', chapter: 'You', title: 'Your name' },
  { id: 'sound', chapter: 'You', title: 'Your sound' },
  { id: 'links', chapter: 'You', title: 'Where you are' },
  { id: 'look', chapter: 'You', title: 'Your look' },
  { id: 'release', chapter: 'Campaign', title: 'What you are pushing' },
  { id: 'brief', chapter: 'Campaign', title: 'What to clip' },
  { id: 'money', chapter: 'Campaign', title: 'Budget and rate' },
  { id: 'rules', chapter: 'Launch', title: 'How it works' },
  { id: 'review', chapter: 'Launch', title: 'Review' },
  { id: 'fund', chapter: 'Launch', title: 'Fund it' },
  { id: 'done', chapter: 'Launch', title: 'All set' },
] as const
export type StepId = (typeof STEPS)[number]['id']
export const CHAPTERS = ['You', 'Campaign', 'Launch'] as const

export const BUDGET_PRESETS = [100, 250, 500, 1000, 2500, 5000]
export const RATE_PRESETS = [1, 2, 3, 5]

/** Rough reach for a budget at a rate per 1,000 views. */
export const estimateViews = (budget: number, rate: number) => (rate > 0 ? Math.floor((budget / rate) * 1000) : 0)

export const invitePath = (slug: string) => `/${slug}`
export const inviteUrl = (slug: string) => `https://logoless.io/${slug}`

export const lines = (v: string | undefined) => (v ?? '').split('\n').map((x) => x.trim()).filter(Boolean)

export const dmText = (name: string, url: string) =>
  `Hey ${name}! Great chatting. Here is your private logoless page: ${url}\n\nIt takes about 5 minutes: you set up your artist page, pick what to promote and launch your first campaign. If anything is unclear just message me here.`

/** True for /some-name when it is not one of the site's real pages, which is how an artist's private page looks. */
export const isInvitePath = (pathname: string) => /^\/[^/]+\/?$/.test(pathname) && !RESERVED_SLUGS.has(pathname.replace(/\//g, '').toLowerCase()) && !pathname.startsWith('/@')
