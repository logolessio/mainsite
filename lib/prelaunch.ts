import { db, nowSec } from './db'
import { clientIp, ipHash } from './guard'
import { assessRequest } from './risk'

/**
 * Pre-launch sign-up: while the site is shut behind the launch page, beta.logoless.io/onboarding is the one open door. A person signs in with Discord (which also
 * puts them in the server), adds a profile and, if they like, a PayPal email, and is then given the Verified role that opens the server (and, while the site is still shut,
 * the Founding member role).
 *
 * Everything is kept in the settings table, so no database change is needed:
 *   prelaunch:<userId>         { PreState }  where the sign-up came from (the network address too, shown to the owner in the dashboard: it is the "account limit" address the
 *                              privacy policy describes, and goes with the account), what looked odd about it, and whether it is finished
 *   prelaunch-ip:<ip hash>     the user ids that started from the same network (matched by a keyed hash)
 *   prelaunch-count            how many members have been let in (the next number is this plus one)
 *   alias:<google email>       the account a Google sign-in leads to (see auth.ts); alias-for:<account email> is the way back
 */

export { BETA_HOST, BETA_ONBOARDING, isBetaHost } from './beta-host'

export type DeviceClass = 'phone' | 'computer' | 'script'
export type PreState = {
  /** when the sign-up started (seconds) */
  at: number
  /** keyed hash of the network address, so sign-ups from one place can be matched */
  ip: string
  /** the network address itself, for the owner's dashboard (null when there was none, as on a developer's machine) */
  ipRaw?: string | null
  /** the browser, as it called itself (cut short), for the owner's dashboard */
  ua?: string
  /** their Discord id when they started */
  discordId?: string | null
  country: string | null
  org: string | null
  device: DeviceClass
  /** the Discord account's age in days when it signed up, or null if unknown */
  discordDays: number | null
  /** what looked odd, in words, for the owner */
  flags: string[]
  /** the sign-up is waiting for the owner to look at it */
  held?: boolean
  /** when the profile step was saved (seconds) */
  profile?: number
  /** when the person finished the form (seconds) */
  done?: number
  /** the number they were given, once let in (this is what makes them verified) */
  n?: number
  /** they were let in while the site was still shut: a founding member. Missing on the first sign-ups, which were all founding. */
  founding?: boolean
  /** when the owner let a held sign-up through */
  approved?: number
  /** when the owner turned a sign-up down */
  denied?: number
}

const MIN_SECONDS = 6 // faster than this from arriving to pressing finish is a script, not a person (on its own it only counts as one soft flag)
const SAME_NETWORK = 3 // this many other sign-ups from one network and the next one waits for a look
const YOUNG_DISCORD_DAYS = 4

async function read<T>(key: string): Promise<T | null> {
  try {
    const r = await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(key).first<{ value: string }>()
    return r ? (JSON.parse(r.value) as T) : null
  } catch {
    return null
  }
}
async function write(key: string, value: unknown) {
  await (await db())
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(key, JSON.stringify(value), nowSec())
    .run()
}

export const getPre = (userId: string) => read<PreState>(`prelaunch:${userId}`)
export const putPre = (userId: string, s: PreState) => write(`prelaunch:${userId}`, s)

const deviceOf = (ua: string): DeviceClass => {
  if (!ua || /bot|crawl|spider|curl|wget|python|requests|axios|node-fetch|undici|go-http|okhttp|java\/|headless|puppeteer|playwright|selenium|phantom|httpclient|postman/i.test(ua)) return 'script'
  return /mobi|android|iphone|ipad/i.test(ua) ? 'phone' : 'computer'
}

/** When a Discord account was made, from its id (the first 42 bits of an id are the time). */
export const discordAgeDays = (id: string | null): number | null => {
  if (!id || !/^\d{15,22}$/.test(id)) return null
  const made = Math.floor(Number(BigInt(id)) / 4194304) + 1420070400000
  return Math.max(0, Math.floor((Date.now() - made) / 86_400_000))
}

/**
 * Called when someone arrives on the sign-up signed in: writes down where they came from, once. This is the bot check's record: the network (as a keyed hash),
 * the country and network name Cloudflare reports, the kind of device, and how old the Discord account is. Nothing here refuses anyone; `held` is only
 * set later, when the person presses finish (see `finishPre`), so a real person on a shared connection is never shown an error half way.
 */
export async function startPre(req: Request, userId: string, discordId: string | null): Promise<PreState> {
  const have = await getPre(userId)
  if (have) return have
  const [risk, ip] = await Promise.all([assessRequest(req), ipHash(req)])
  const flags: string[] = []
  const device = deviceOf(req.headers.get('user-agent') ?? '')
  if (device === 'script') flags.push('not a normal browser')
  if (risk.country === 'T1') flags.push('Tor network')
  else if (risk.reasons.length) flags.push(risk.reasons[0])
  const discordDays = discordAgeDays(discordId)
  if (discordDays !== null && discordDays < YOUNG_DISCORD_DAYS) flags.push(`Discord account is ${discordDays} day${discordDays === 1 ? '' : 's'} old`)
  const key = `prelaunch-ip:${ip}`
  const seen = (await read<string[]>(key)) ?? []
  const others = seen.filter((id) => id !== userId)
  if (others.length >= SAME_NETWORK) flags.push(`${others.length} other sign-ups from the same network`)
  if (!seen.includes(userId)) await write(key, [...seen, userId].slice(-20))
  const addr = clientIp(req)
  const ipRaw = addr && addr !== 'unknown' && !/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(addr) ? addr.slice(0, 64) : null
  const s: PreState = { at: nowSec(), ip, ipRaw, ua: (req.headers.get('user-agent') ?? '').slice(0, 160), discordId, country: risk.country, org: risk.org, device, discordDays, flags }
  await putPre(userId, s)
  return s
}

/** Reasons that hold a sign-up back on their own, as opposed to ones that only get written down. */
const hard = (flag: string) => /not a normal browser|Tor network|other sign-ups|Discord account is|form was filled/.test(flag)

/**
 * The person pressed finish. The sign-up is held for the owner if anything hard turned up (or two soft things did), otherwise they are let in at once
 * with the next founding member number. `trap` is the hidden form field a person never fills in.
 */
export async function finishPre(userId: string, opts: { trap?: boolean; /** the site is still shut, so they are a founding member */ founding?: boolean } = {}): Promise<PreState> {
  const s = await getPre(userId)
  if (!s) throw new Error('no sign-up')
  if (s.n) return s
  const flags = [...s.flags]
  if (opts.trap && !flags.includes('form was filled by a script')) flags.push('form was filled by a script')
  if (nowSec() - s.at < MIN_SECONDS && !flags.includes('finished too fast')) flags.push('finished too fast')
  const held = !s.approved && (flags.some(hard) || flags.length >= 2)
  const next: PreState = { ...s, flags, held, done: s.done ?? nowSec() }
  if (!held) {
    next.n = await nextNumber()
    next.founding = opts.founding ?? true
  }
  await putPre(userId, next)
  return next
}

/** The number the next member to be let in will get (shown on the sign-up: "you would be founding member #N"). */
export async function upcomingNumber(): Promise<number> {
  const row = await (await db()).prepare("SELECT value FROM settings WHERE key = 'prelaunch-count'").first<{ value: string }>()
  return Number(row?.value ?? 0) + 1
}

async function nextNumber(): Promise<number> {
  const row = await (await db())
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES ('prelaunch-count', '1', ?1)
       ON CONFLICT(key) DO UPDATE SET value = CAST(value AS INTEGER) + 1, updated_at = excluded.updated_at
       RETURNING value`,
    )
    .bind(nowSec())
    .first<{ value: string }>()
  return Number(row?.value ?? 1)
}

/** The owner's decision on a held sign-up. Approving gives the next number. */
export async function decidePre(userId: string, approve: boolean, founding = true): Promise<PreState | null> {
  const s = await getPre(userId)
  if (!s) return null
  const next: PreState = approve ? { ...s, held: false, approved: nowSec(), denied: undefined, n: s.n ?? (await nextNumber()), founding: s.founding ?? founding, done: s.done ?? nowSec() } : { ...s, held: false, denied: nowSec(), n: undefined }
  await putPre(userId, next)
  return next
}

/** Has this person finished the sign-up and been let in? That is what the Verified role means. */
export async function isVerifiedMember(userId: string): Promise<boolean> {
  return Boolean((await getPre(userId))?.n)
}

/** Were they let in while the site was still shut? (They keep the Founding member role after it opens.) */
export async function isFoundingMember(userId: string): Promise<boolean> {
  const s = await getPre(userId)
  return Boolean(s?.n && s.founding !== false)
}

export type HeldSignup = { userId: string; name: string; handle: string | null; email: string; at: number; flags: string[]; country: string | null; org: string | null; device: string; discordDays: number | null }

/** Sign-ups waiting for the owner, oldest first. */
export async function heldSignups(): Promise<HeldSignup[]> {
  try {
    const rows = await (await db())
      .prepare(
        `SELECT s.key AS key, s.value AS value, u.email AS email, COALESCE(p.display_name, u.name, u.email) AS name, p.handle AS handle
         FROM settings s
         JOIN users u ON s.key = 'prelaunch:' || u.id
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE json_extract(s.value, '$.held') = 1 AND json_extract(s.value, '$.done') IS NOT NULL
         ORDER BY json_extract(s.value, '$.done') ASC LIMIT 100`,
      )
      .all<{ key: string; value: string; email: string; name: string; handle: string | null }>()
    return rows.results.flatMap((r) => {
      try {
        const s = JSON.parse(r.value) as PreState
        return [{ userId: r.key.slice('prelaunch:'.length), name: r.name, handle: r.handle, email: r.email, at: s.done ?? s.at, flags: s.flags, country: s.country, org: s.org, device: s.device, discordDays: s.discordDays }]
      } catch {
        return []
      }
    })
  } catch {
    return []
  }
}

export type SignupRow = { userId: string; name: string; handle: string | null; email: string; discord: string | null; at: number; status: 'member' | 'founding' | 'held' | 'denied' | 'started'; n: number | null; ip: string | null; country: string | null; org: string | null; device: string; ua: string; discordDays: number | null; flags: string[] }

/** The most recent sign-ups with where each came from (the network address included), newest first, for the owner's dashboard. */
export async function recentSignups(limit = 60): Promise<SignupRow[]> {
  try {
    const rows = await (await db())
      .prepare(
        `SELECT s.key AS key, s.value AS value, u.email AS email, u.name AS uname, COALESCE(p.display_name, u.name, u.email) AS name, p.handle AS handle
         FROM settings s
         JOIN users u ON s.key = 'prelaunch:' || u.id
         LEFT JOIN profiles p ON p.user_id = u.id
         ORDER BY COALESCE(json_extract(s.value, '$.done'), json_extract(s.value, '$.at')) DESC LIMIT ?1`,
      )
      .bind(limit)
      .all<{ key: string; value: string; email: string; uname: string | null; name: string; handle: string | null }>()
    return rows.results.flatMap((r) => {
      try {
        const s = JSON.parse(r.value) as PreState
        const status: SignupRow['status'] = s.n ? (s.founding !== false ? 'founding' : 'member') : s.denied ? 'denied' : s.held && s.done ? 'held' : 'started'
        return [{ userId: r.key.slice('prelaunch:'.length), name: r.name, handle: r.handle, email: r.email, discord: r.uname, at: s.done ?? s.at, status, n: s.n ?? null, ip: s.ipRaw ?? null, country: s.country, org: s.org, device: s.device, ua: s.ua ?? '', discordDays: s.discordDays, flags: s.flags }]
      } catch {
        return []
      }
    })
  } catch {
    return []
  }
}

/** How many members have been let in (Verified), how many of those are founding members, and how many have started or are waiting. For the owner's numbers. */
export async function preCounts(): Promise<{ verified: number; founding: number; started: number; held: number }> {
  try {
    const r = await (await db())
      .prepare(
        `SELECT COUNT(*) AS started,
           COALESCE(SUM(CASE WHEN json_extract(value, '$.n') IS NOT NULL THEN 1 ELSE 0 END), 0) AS verified,
           COALESCE(SUM(CASE WHEN json_extract(value, '$.n') IS NOT NULL AND COALESCE(json_extract(value, '$.founding'), 1) != 0 THEN 1 ELSE 0 END), 0) AS founding,
           COALESCE(SUM(CASE WHEN json_extract(value, '$.held') = 1 AND json_extract(value, '$.done') IS NOT NULL THEN 1 ELSE 0 END), 0) AS held
         FROM settings WHERE key LIKE 'prelaunch:%'`,
      )
      .first<{ started: number; verified: number; founding: number; held: number }>()
    return { verified: r?.verified ?? 0, founding: r?.founding ?? 0, started: r?.started ?? 0, held: r?.held ?? 0 }
  } catch {
    return { verified: 0, founding: 0, started: 0, held: 0 }
  }
}

// ---- Google next to Discord ----
/**
 * Discord is the one way in. A person can add Google as a second way to sign in to the same account: they sign in with Google while a short-lived, signed
 * note from their Discord session is attached (see `/api/pre/link`), and auth.ts then maps that Google address to the account. It is refused if the Google
 * address already has an account of its own or belongs to an owner, so nobody can attach to, or take over, somebody else's.
 */
export const aliasKey = (googleEmail: string) => `alias:${googleEmail.trim().toLowerCase()}`
export const aliasForKey = (accountEmail: string) => `alias-for:${accountEmail.trim().toLowerCase()}`
export async function googleOf(accountEmail: string): Promise<string | null> {
  return read<string>(aliasForKey(accountEmail))
}
