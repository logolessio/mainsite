// What a developer tells us about an app, and the rules for each field. Safe for the browser: the registration form
// shows these errors as you type, and the server runs the very same checks before it saves anything.

export type ClientType = 'confidential' | 'public'

export type AppKind = { id: string; label: string; hint: string; type: ClientType }

/** What kind of thing it is. The `type` is the usual answer to "can it keep a secret?", and only a starting point. */
export const APP_KINDS: AppKind[] = [
  { id: 'website', label: 'Website with a server', hint: 'Next.js, Express, Django, Rails, Laravel, PHP', type: 'confidential' },
  { id: 'spa', label: 'Single-page web app', hint: 'React, Vue or Svelte running only in the browser', type: 'public' },
  { id: 'mobile', label: 'Mobile app', hint: 'iOS, Android, Flutter, React Native', type: 'public' },
  { id: 'desktop', label: 'Desktop app', hint: 'Mac, Windows, Linux, Electron, Tauri', type: 'public' },
  { id: 'extension', label: 'Browser extension', hint: 'Chrome, Firefox, Safari, Edge', type: 'public' },
  { id: 'discord', label: 'Discord bot or activity', hint: 'Link Discord members to their logoless account', type: 'confidential' },
  { id: 'game', label: 'Game', hint: 'Unity, Godot, Roblox, a Minecraft server, a web game', type: 'public' },
  { id: 'plugin', label: 'CMS or store plugin', hint: 'WordPress, Shopify, Webflow, Framer, Ghost', type: 'confidential' },
  { id: 'internal', label: 'Internal tool', hint: 'A dashboard or tool for your own team', type: 'confidential' },
  { id: 'cli', label: 'Command-line tool', hint: 'A script or terminal app', type: 'public' },
  { id: 'device', label: 'TV, console or device', hint: 'Anything with a small screen or no keyboard', type: 'public' },
  { id: 'other', label: 'Something else', hint: 'Tell us about it below', type: 'confidential' },
]
export const APP_KIND_IDS = APP_KINDS.map((k) => k.id)
export const kindLabel = (id: string | undefined) => APP_KINDS.find((k) => k.id === id)?.label ?? 'App'

/** What it is for. People pick one or more. */
export const USE_CASES: { id: string; label: string }[] = [
  { id: 'sign-in', label: 'Sign people in' },
  { id: 'verify-creator', label: 'Check someone is a real creator' },
  { id: 'profiles', label: 'Show creator profiles or portfolios' },
  { id: 'analytics', label: 'Creator analytics and dashboards' },
  { id: 'community', label: 'Community roles and access' },
  { id: 'matching', label: 'Match creators with brands' },
  { id: 'editing', label: 'Clipping and editing tools' },
  { id: 'contests', label: 'Leaderboards, contests or giveaways' },
  { id: 'education', label: 'Courses or coaching' },
  { id: 'automation', label: 'Automation for my own account' },
  { id: 'research', label: 'Research or a school project' },
  { id: 'other', label: 'Something else' },
]
export const USE_CASE_IDS = USE_CASES.map((u) => u.id)

export const LIMITS = { name: [2, 40], summary: [10, 120], use: [100, 1000], url: 300, redirects: 10, useCases: 5 } as const

// ---------- text ----------

/** Squeezes runs of the same character ("!!!!!", "aaaaaa") down to one and tidies spaces, so they cannot pad a length. */
export function squeeze(text: string) {
  return text
    .normalize('NFKC')
    .replace(/(.)\1{2,}/gu, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

/** How many characters count towards a minimum: real letters and numbers, with spaces and punctuation between words. */
export const realLength = (text: string) => squeeze(text).length

const KEYBOARD_RUNS = ['qwert', 'werty', 'asdf', 'sdfg', 'dfgh', 'fghj', 'ghjk', 'hjkl', 'zxcv', 'xcvb', 'cvbn', 'vbnm', 'yuiop', 'uiop', 'poiu', 'lkjh', 'mnbv', 'azerty', 'qwertz', '12345', '09876']
const FILLER = /\b(lorem ipsum|dolor sit amet|test test|blah blah|bla bla|filler text|sample text)\b/i
const NO_VOWEL_WORDS = new Set(['https', 'xhtml', 'shh', 'hmm', 'pssst', 'sync'])

/**
 * Null when the text reads like real sentences, or the reason it does not. Catches the usual ways people pad a box:
 * one character held down, a word or phrase pasted again and again, keyboard mashing, lorem ipsum.
 */
export function fillerProblem(text: string): string | null {
  const t = squeeze(text)
  if (!t) return null
  const lower = t.toLowerCase()
  if (FILLER.test(lower)) return 'Please describe your real app, not placeholder text.'
  const letters = [...lower].filter((c) => /\p{L}/u.test(c))
  const nonSpace = [...lower].filter((c) => !/\s/.test(c))
  if (nonSpace.length && letters.length / nonSpace.length < 0.6) return 'Please write it in words, not mostly numbers or symbols.'
  if (new Set(letters).size < 8) return 'That looks like the same few letters repeated. Please write real sentences.'
  if (/(.{2,25}?)\1{3,}/u.test(lower.replace(/\s/g, ''))) return 'That repeats the same thing over and over. Please write real sentences.'
  const words = lower.split(/[^\p{L}\p{N}']+/u).filter(Boolean)
  if (words.length >= 6) {
    const counts = new Map<string, number>()
    for (const w of words) if (w.length > 3) counts.set(w, (counts.get(w) ?? 0) + 1)
    const most = Math.max(0, ...counts.values())
    if (most >= 4 && most / words.length > 0.25) return 'One word makes up most of that. Please write real sentences.'
    if (new Set(words).size / words.length < 0.4) return 'That repeats the same words a lot. Please write real sentences.'
  }
  const latin = letters.filter((c) => /[a-z]/.test(c))
  // vowel and keyboard checks only make sense for text written in the Latin alphabet
  if (latin.length >= letters.length * 0.8 && latin.length >= 20) {
    const vowels = latin.filter((c) => 'aeiouy'.includes(c)).length / latin.length
    if (vowels < 0.2) return 'That looks like random keys. Please write real sentences.'
    const mashed = words.filter((w) => /^[a-z]+$/.test(w) && (w.length > 24 || (w.length >= 5 && !/[aeiouy]/.test(w) && !NO_VOWEL_WORDS.has(w)))).length
    if (mashed >= 2 && mashed / words.length > 0.15) return 'Some of those are not words. Please write real sentences.'
    const runs = KEYBOARD_RUNS.filter((r) => lower.replace(/\s/g, '').includes(r)).length
    if (runs >= 2) return 'That looks like keyboard mashing. Please write real sentences.'
  }
  return null
}

export function nameProblem(raw: string): string | null {
  const t = raw.trim()
  if (!t) return 'Give your app a name.'
  if (t.length < LIMITS.name[0]) return 'The name needs at least 2 characters.'
  if (t.length > LIMITS.name[1]) return `Keep the name to ${LIMITS.name[1]} characters.`
  if (!/\p{L}|\p{N}/u.test(t)) return 'The name needs at least one letter or number.'
  if (/(.)\1{4,}/u.test(t)) return 'The name repeats one character too many times.'
  if (/\blogoless\b/i.test(t) && !/\bfor logoless\b/i.test(t)) return 'Only logoless can use logoless in a name. "For logoless" is fine.'
  if (/https?:|www\./i.test(t)) return 'Use the name of your app, not its address.'
  return null
}

export function summaryProblem(raw: string): string | null {
  const t = raw.trim()
  if (!t) return 'Add one line about your app. People see it when they sign in.'
  if (realLength(t) < LIMITS.summary[0]) return `Write at least ${LIMITS.summary[0]} characters.`
  if (t.length > LIMITS.summary[1]) return `Keep it to ${LIMITS.summary[1]} characters.`
  if (!/\p{L}{2,}/u.test(t)) return 'Write it in words.'
  if (/(.)\1{4,}/u.test(t)) return 'That repeats one character too many times.'
  return null
}

export function useProblem(raw: string): string | null {
  const t = raw.trim()
  if (!t) return 'Tell us how your app will use logoless sign-in.'
  const n = realLength(t)
  if (t.length > LIMITS.use[1]) return `Keep it to ${LIMITS.use[1]} characters.`
  const filler = fillerProblem(t)
  if (filler) return filler
  if (n < LIMITS.use[0]) return `Write at least ${LIMITS.use[0]} characters (${LIMITS.use[0] - n} to go).`
  return null
}

export function kindProblem(kind: string): string | null {
  return APP_KIND_IDS.includes(kind) ? null : 'Choose what kind of app it is.'
}

export function useCasesProblem(list: string[]): string | null {
  if (!list.length) return 'Choose at least one thing it is for.'
  if (list.length > LIMITS.useCases) return `Choose up to ${LIMITS.useCases}.`
  if (list.some((u) => !USE_CASE_IDS.includes(u))) return 'Choose from the list.'
  return null
}

// ---------- addresses ----------

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])
const BLOCKED_SCHEMES = new Set(['javascript', 'data', 'file', 'blob', 'about', 'vbscript', 'ftp', 'ws', 'wss', 'mailto', 'tel', 'sms', 'chrome', 'view-source'])

/** A real public host name: dotted labels of letters, numbers and hyphens, ending in a top-level domain of letters (or punycode). */
export function isPublicHost(host: string) {
  if (host.length > 253 || !host.includes('.')) return false
  if (/^\d+(\.\d+){3}$/.test(host) || host.startsWith('[')) return false // a bare IP address
  const labels = host.split('.')
  if (labels.some((l) => !/^(?!-)[a-z0-9-]{1,63}(?<!-)$/.test(l))) return false
  const tld = labels[labels.length - 1]
  if (!/^([a-z]{2,24}|xn--[a-z0-9-]{2,59})$/.test(tld)) return false
  return !['local', 'localhost', 'internal', 'invalid', 'test', 'example', 'lan', 'home', 'corp'].includes(tld)
}

const parse = (raw: string) => {
  try {
    return new URL(raw)
  } catch {
    return null
  }
}

/** For a website, privacy policy or terms page: a full https address on the public internet. */
export function webUrlProblem(raw: string, what = 'address'): string | null {
  const t = raw.trim()
  if (!t) return null
  if (t.length > LIMITS.url) return `That ${what} is too long.`
  if (/\s/.test(t)) return `The ${what} cannot have spaces in it.`
  if (!/^[a-z][a-z0-9+.-]*:/i.test(t)) return `Start the ${what} with https://`
  const u = parse(t)
  if (!u) return `That is not a valid ${what}.`
  if (u.protocol !== 'https:') return `The ${what} must start with https://`
  if (u.username || u.password) return `The ${what} cannot have a name or password in it.`
  if (LOOPBACK.has(u.hostname)) return `The ${what} must be on the public internet, not localhost.`
  if (!isPublicHost(u.hostname)) return `"${u.hostname}" is not a real domain. Use something like example.com.`
  return null
}

export type RedirectCheck = { ok: string; dev: boolean; native: boolean } | { problem: string }

/**
 * Where people are sent back after they sign in. Allowed:
 *  - https on a real domain;
 *  - http or https on localhost, 127.0.0.1 or [::1], for development;
 *  - for apps that cannot keep a secret, an app's own scheme named after a domain it owns (com.example.app:/callback), as RFC 8252 says.
 * Never wildcards, #fragments or a name and password in the address.
 */
export function checkRedirectUri(raw: string, type: ClientType = 'confidential'): RedirectCheck {
  const t = raw.trim()
  if (!t) return { problem: 'Enter an address.' }
  if (t.length > LIMITS.url) return { problem: 'That address is too long (300 characters at most).' }
  if (/\s/.test(t)) return { problem: 'Addresses cannot have spaces in them.' }
  if (t.includes('*')) return { problem: 'Wildcards (*) are not allowed. Add each address in full.' }
  if (t.includes('#')) return { problem: 'Remove the #part. Return addresses cannot have one.' }
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(t)?.[1]?.toLowerCase()
  if (!scheme || /^[^:/]+:\d/.test(t)) return { problem: 'Start with https:// (or http://localhost while you develop).' }
  const u = parse(t)
  if (!u) return { problem: 'That is not a valid address.' }
  if (u.username || u.password) return { problem: 'Addresses cannot have a name or password in them.' }
  if (scheme === 'http' || scheme === 'https') {
    if (LOOPBACK.has(u.hostname)) return { ok: u.toString(), dev: true, native: false }
    if (scheme === 'http') return { problem: 'Use https://. Plain http:// only works for localhost while you develop.' }
    if (!isPublicHost(u.hostname)) return { problem: `"${u.hostname}" is not a real domain. Use your site's domain, or localhost while you develop.` }
    return { ok: u.toString(), dev: false, native: false }
  }
  if (BLOCKED_SCHEMES.has(scheme)) return { problem: `${scheme}: addresses are not allowed.` }
  if (!scheme.includes('.')) return { problem: 'An app scheme must be named after a domain you own, like com.example.app:/callback' }
  if (type !== 'public') return { problem: 'App schemes (like com.example.app:/callback) are only for apps that run on a phone or computer. Choose that below, or use https://' }
  return { ok: u.toString(), dev: false, native: true }
}

export const redirectProblem = (raw: string, type: ClientType = 'confidential') => {
  const r = checkRedirectUri(raw, type)
  return 'problem' in r ? r.problem : null
}

export type AppDraft = {
  name: string
  description: string
  website: string
  kind: string
  type: ClientType
  useCases: string[]
  useDescription: string
  redirectUris: string[]
  privacyUrl: string
  termsUrl: string
}

/** Every problem with a draft, by field. Empty when it can be saved. */
export function draftProblems(d: AppDraft): Partial<Record<keyof AppDraft, string>> {
  const out: Partial<Record<keyof AppDraft, string>> = {}
  const set = (k: keyof AppDraft, p: string | null) => {
    if (p) out[k] = p
  }
  set('name', nameProblem(d.name))
  set('description', summaryProblem(d.description))
  set('kind', kindProblem(d.kind))
  set('useCases', useCasesProblem(d.useCases))
  set('useDescription', useProblem(d.useDescription))
  set('website', (d.kind === 'website' || d.kind === 'spa') && !d.website.trim() ? 'Add the address of your website.' : webUrlProblem(d.website, 'website'))
  set('privacyUrl', webUrlProblem(d.privacyUrl, 'privacy policy address'))
  set('termsUrl', webUrlProblem(d.termsUrl, 'terms address'))
  if (!d.redirectUris.length) out.redirectUris = 'Add at least one return address.'
  else if (d.redirectUris.length > LIMITS.redirects) out.redirectUris = `Up to ${LIMITS.redirects} return addresses.`
  else {
    const bad = d.redirectUris.map((u) => redirectProblem(u, d.type)).find(Boolean)
    if (bad) out.redirectUris = bad
  }
  return out
}
