// How each person wants to hear about things: which kinds of news, on which channels, when to stay quiet, and whether to bundle
// messages into a digest. Plain data, safe for the browser: the settings page and the server share it.

export const NOTE_KIND_IDS = ['submission', 'earning', 'payout', 'campaign', 'favorite', 'badge', 'account'] as const
export type NoteKind = (typeof NOTE_KIND_IDS)[number]
export const CHANNELS = ['site', 'email', 'discord'] as const
export type Channel = (typeof CHANNELS)[number]

export const KIND_LABELS: Record<NoteKind, { label: string; hint: string }> = {
  submission: { label: 'Submissions', hint: 'Approved, rejected or needs a change.' },
  earning: { label: 'Earnings', hint: 'Views confirmed and money added.' },
  payout: { label: 'Payouts', hint: 'Withdrawals sent or held.' },
  campaign: { label: 'Campaigns', hint: 'Campaigns you are in, starting or ending.' },
  favorite: { label: 'Saved campaigns', hint: 'Changes to campaigns you hearted.' },
  badge: { label: 'Badges', hint: 'A new badge unlocked.' },
  account: { label: 'Account', hint: 'Security and account changes.' },
}
export const CHANNEL_LABELS: Record<Channel, string> = { site: 'On the site', email: 'Email', discord: 'Discord' }

export type DigestEvery = 'off' | 'daily' | 'weekly'
export type NotifyPrefs = {
  /** kind → channel → on */
  m: Record<NoteKind, Record<Channel, boolean>>
  /** Email and Discord messages wait until the quiet hours end. The bell still fills up, without pop-ups. Minutes after midnight, local time. */
  quiet: { on: boolean; from: number; to: number }
  /** Bundle email and Discord messages into one, instead of one per thing. Weekly goes out on Mondays. */
  digest: { email: DigestEvery; discord: DigestEvery; at: number }
  /** The person's time zone (from their browser), for quiet hours and digests. */
  tz: string
}

type Legacy = 'both' | 'email' | 'discord' | 'site'

/** What someone gets before they have changed anything. Built from the older "how should we reach you" choice, so nothing changes for them. */
export function defaultPrefs(legacy: Legacy = 'both'): NotifyPrefs {
  const email = legacy === 'both' || legacy === 'email'
  const discord = legacy === 'both' || legacy === 'discord'
  const m = {} as NotifyPrefs['m']
  for (const k of NOTE_KIND_IDS) {
    m[k] = {
      site: true,
      // email only for what matters most; Discord for everything except hearted campaigns (too noisy), as before
      email: email && (k === 'campaign' || k === 'payout' || k === 'account'),
      discord: discord && k !== 'favorite',
    }
  }
  return { m, quiet: { on: false, from: 22 * 60, to: 8 * 60 }, digest: { email: 'off', discord: 'off', at: 9 * 60 }, tz: 'UTC' }
}

const minute = (v: unknown, d: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) < 1440 ? (v as number) : d)
const every = (v: unknown): DigestEvery => (v === 'daily' || v === 'weekly' ? v : 'off')
export const validTz = (v: unknown): v is string => {
  if (typeof v !== 'string' || v.length > 64 || !/^[A-Za-z_+\-/0-9]+$/.test(v)) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: v })
    return true
  } catch {
    return false
  }
}

/** Anything from the browser or the database, made safe and complete. Unknown fields are dropped, missing ones filled from `base`. */
export function cleanPrefs(input: unknown, base: NotifyPrefs = defaultPrefs()): NotifyPrefs {
  const i = (input && typeof input === 'object' ? input : {}) as Partial<Record<keyof NotifyPrefs, unknown>>
  const mi = (i.m && typeof i.m === 'object' ? i.m : {}) as Record<string, Record<string, unknown> | undefined>
  const m = {} as NotifyPrefs['m']
  for (const k of NOTE_KIND_IDS) {
    m[k] = { ...base.m[k] }
    for (const c of CHANNELS) if (typeof mi[k]?.[c] === 'boolean') m[k][c] = mi[k]![c] as boolean
  }
  const q = (i.quiet && typeof i.quiet === 'object' ? i.quiet : {}) as Record<string, unknown>
  const g = (i.digest && typeof i.digest === 'object' ? i.digest : {}) as Record<string, unknown>
  return {
    m,
    quiet: { on: typeof q.on === 'boolean' ? q.on : base.quiet.on, from: minute(q.from, base.quiet.from), to: minute(q.to, base.quiet.to) },
    digest: { email: 'email' in g ? every(g.email) : base.digest.email, discord: 'discord' in g ? every(g.discord) : base.digest.discord, at: minute(g.at, base.digest.at) },
    tz: validTz(i.tz) ? (i.tz as string) : base.tz,
  }
}

export const isNoteKind = (k: string): k is NoteKind => (NOTE_KIND_IDS as readonly string[]).includes(k)

/** "22:00" for 1320. */
export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
export const fromHhmm = (s: string) => {
  const [h, mm] = s.split(':').map(Number)
  return Number.isInteger(h) && Number.isInteger(mm) && h >= 0 && h < 24 && mm >= 0 && mm < 60 ? h * 60 + mm : null
}

// ---------- local time, for quiet hours and digests ----------

/** The wall clock in a time zone at a moment (seconds). */
export function localClock(sec: number, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short' }).formatToParts(new Date(sec * 1000))
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0'
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  const y = Number(get('year'))
  const mo = Number(get('month'))
  const d = Number(get('day'))
  const h = Number(get('hour')) % 24
  const mi = Number(get('minute'))
  // how far this zone is ahead of UTC right now, in seconds
  const offset = Math.round((Date.UTC(y, mo - 1, d, h, mi) / 1000 - sec) / 60) * 60
  return { y, mo, d, minute: h * 60 + mi, weekday: wd, offset }
}

export function isQuietNow(p: NotifyPrefs, sec: number) {
  if (!p.quiet.on || p.quiet.from === p.quiet.to) return false
  const { minute: m } = localClock(sec, p.tz)
  return p.quiet.from < p.quiet.to ? m >= p.quiet.from && m < p.quiet.to : m >= p.quiet.from || m < p.quiet.to
}

/** The next moment (seconds, after `sec`) the local clock reads `at` minutes past midnight, optionally only on a given weekday (1 = Monday). */
export function nextLocal(sec: number, tz: string, at: number, weekday?: number) {
  const c = localClock(sec, tz)
  for (let add = 0; add <= 8; add++) {
    const wd = (c.weekday + add) % 7
    if (weekday !== undefined && wd !== weekday) continue
    // midnight of that local day, in UTC seconds, using the offset of now (then corrected once, for days the clocks change)
    let t = Date.UTC(c.y, c.mo - 1, c.d + add) / 1000 + at * 60 - c.offset
    t += c.offset - localClock(t, tz).offset
    if (t > sec) return t
  }
  return sec + 86400
}
