import { auditSafe } from './chain'
import { db, nowSec } from './db'
import { notify, notifyAdmins } from './notify'

/**
 * Proving an account is yours by its bio. A person links a TikTok, YouTube or Instagram account, we give them a short code, they
 * put it in that account's bio, and we read the account's public page to see it. Only a person who can edit the bio can pass.
 * Instagram does not let a server read a profile, so for any account we cannot read, a person on the team checks it instead.
 *
 * Nothing needs a database change: one row per person in `settings` (`acctv:<userId>`) and one per verified account
 * (`acctowner:<platform>:<name>`), so an account is verified for one logoless user at a time.
 */
export type Platform = 'tiktok' | 'youtube' | 'instagram'
export const PLATFORMS: Platform[] = ['tiktok', 'youtube', 'instagram']
export const isPlatform = (p: unknown): p is Platform => typeof p === 'string' && (PLATFORMS as string[]).includes(p)

export type Entry = {
  /** the account name this code was issued for; if the linked account changes, this no longer matches and the entry is ignored */
  u: string
  code: string
  /** when the code was issued (seconds) */
  at: number
  /** when it was verified, or null */
  ok: number | null
  by?: 'bio' | 'team'
  tries: number
  last: number
  /** when the person asked the team to check it, or null */
  ask: number | null
  note?: string
}
type Store = Partial<Record<Platform, Entry>>

export type State = { platform: Platform; handle: string; status: 'verified' | 'code' | 'waiting' | 'none'; code?: string; expiresAt?: number; verifiedAt?: number; by?: 'bio' | 'team'; note?: string; profileUrl: string }

export const CODE_LIFE = 7 * 86400
const storeKey = (userId: string) => `acctv:${userId}`
const ownerKey = (p: Platform, h: string) => `acctowner:${p}:${h.toLowerCase()}`

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O or 1/I, so a code is easy to read and type
export function makeCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return `logoless-${Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')}`
}

/** The account name inside a saved link, or null when it is a form we cannot follow (for example a numeric channel id we cannot name). */
export function handleOf(platform: Platform, url: string): string | null {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return null
  }
  const seg = u.pathname.split('/').filter(Boolean)
  const ok = (s: string | undefined) => (s && /^[A-Za-z0-9._-]{2,60}$/.test(s.replace(/^@/, '')) ? s.replace(/^@/, '') : null)
  if (platform === 'tiktok') return seg[0]?.startsWith('@') ? ok(seg[0]) : null
  if (platform === 'instagram') return seg.length === 1 ? ok(seg[0]) : null
  // youtube: @handle, or the older /c/name and /user/name, or a channel id
  if (seg[0]?.startsWith('@')) return ok(seg[0])
  if ((seg[0] === 'c' || seg[0] === 'user') && seg[1]) return ok(seg[1])
  if (seg[0] === 'channel' && /^UC[\w-]{20,}$/.test(seg[1] ?? '')) return seg[1]
  return null
}

/** The public page to read. Built from the account name, never from the address the person typed, so it can only be the platform's own site. */
export function profileUrlFor(platform: Platform, handle: string): string {
  if (platform === 'tiktok') return `https://www.tiktok.com/@${handle}`
  if (platform === 'instagram') return `https://www.instagram.com/${handle}/`
  return handle.startsWith('UC') && handle.length > 20 ? `https://www.youtube.com/channel/${handle}` : `https://www.youtube.com/@${handle}`
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

export type Read = { ok: true; html: string } | { ok: false; why: string }

/**
 * Reads the public page. "ok" means we really got the account's own page (so a missing code means the code is not in the bio),
 * and not a login wall or a block, where we cannot tell either way.
 */
export async function readProfile(platform: Platform, handle: string): Promise<Read> {
  // a developer machine can point the three sites at a local test server; this has no effect in production
  const test = process.env.NODE_ENV !== 'production' ? process.env.BIO_TEST_BASE : undefined
  const target = profileUrlFor(platform, handle)
  const url = test ? `${test.replace(/\/$/, '')}/${platform}/${encodeURIComponent(handle)}` : target
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9', ...(platform === 'youtube' ? { cookie: 'CONSENT=YES+1; SOCS=CAI' } : {}) },
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(9000),
    })
    if (!test) {
      const host = new URL(res.url).hostname
      const allowed = platform === 'tiktok' ? /(^|\.)tiktok\.com$/ : platform === 'instagram' ? /(^|\.)instagram\.com$/ : /(^|\.)youtube\.com$/
      if (!allowed.test(host)) return { ok: false, why: 'The platform sent us somewhere else, so we could not read the page.' }
      if (platform === 'instagram' && /\/accounts\/login/.test(res.url)) return { ok: false, why: 'Instagram asks for a login before it shows a profile, so we cannot read it from here.' }
    }
    if (res.status === 404) return { ok: false, why: `We could not find ${platform === 'youtube' ? 'that channel' : 'that account'}. Check the username.` }
    if (!res.ok) return { ok: false, why: `The platform answered with an error (${res.status}), so we could not read the page.` }
    const html = (await res.text()).slice(0, 8_000_000)
    const lower = html.toLowerCase()
    // TikTok answers 200 for an account that does not exist and says so inside the page data (10221 and 10202 are "no such user")
    if (platform === 'tiktok' && /"statusCode":(10221|10202)\b/.test(html)) return { ok: false, why: 'We could not find that account. Check the username.' }
    // is this really that account's page? (a captcha or a login wall will not mention the name)
    if (!lower.includes(handle.toLowerCase())) return { ok: false, why: 'We could not read that profile from here (the platform may be blocking automatic reading).' }
    if (platform === 'instagram' && !/og:description|"biography"/i.test(html)) return { ok: false, why: 'Instagram does not show profiles to automatic readers, so we cannot read it from here.' }
    if (platform === 'tiktok' && !/__UNIVERSAL_DATA_FOR_REHYDRATION__|"uniqueId"|og:description/i.test(html)) return { ok: false, why: 'TikTok did not show us the profile, so we could not read it from here.' }
    return { ok: true, html }
  } catch {
    return { ok: false, why: 'We could not reach the platform just now.' }
  }
}

/**
 * The account's follower count, read from the public page we already fetched to look for the code. TikTok puts it in the page data, exactly; the other two do not
 * give it up in a form that can be trusted (YouTube's page lists other channels' counts too), so they return null.
 */
export function followersFromHtml(platform: Platform, html: string): number | null {
  if (platform !== 'tiktok') return null
  const m = /"stats":\{"followerCount":(\d{1,12})\b/.exec(html)
  return m ? Number(m[1]) : null
}

/** Remembers an account's follower count at the moment it was proven, for the numbers shown to artists (see lib/discord/audience.ts). */
async function recordFollowers(userId: string, platform: Platform, handle: string, n: number) {
  const d = await db()
  await d
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(`acctf:${platform}:${handle.toLowerCase()}`, JSON.stringify({ n, u: userId, at: nowSec() }), nowSec())
    .run()
}

/** True when the code is in the page. Compared without case, and a code only ever uses letters, digits and a dash. */
export const pageHasCode = (html: string, code: string) => html.toUpperCase().includes(code.toUpperCase())

async function load(userId: string): Promise<Store> {
  const d = await db()
  const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(storeKey(userId)).first<{ value: string }>()
  try {
    return r ? (JSON.parse(r.value) as Store) : {}
  } catch {
    return {}
  }
}
async function save(userId: string, s: Store) {
  const d = await db()
  const t = nowSec()
  if (Object.keys(s).length === 0) await d.prepare('DELETE FROM settings WHERE key = ?1').bind(storeKey(userId)).run()
  else await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(storeKey(userId), JSON.stringify(s), t).run()
}

type Link = { platform: string; url: string }
export async function linksOf(userId: string): Promise<Link[]> {
  const d = await db()
  const r = await d.prepare('SELECT links_json FROM profiles WHERE user_id = ?1').bind(userId).first<{ links_json: string }>()
  try {
    return r ? (JSON.parse(r.links_json) as Link[]) : []
  } catch {
    return []
  }
}

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** What each linked account looks like right now: verified, waiting for the person to put the code in, waiting for the team, or nothing yet. */
export async function statesFor(userId: string, links?: Link[]): Promise<State[]> {
  const [store, all] = await Promise.all([load(userId), links ? Promise.resolve(links) : linksOf(userId)])
  const t = nowSec()
  const out: State[] = []
  for (const p of PLATFORMS) {
    const l = all.find((x) => x.platform === p)
    if (!l) continue
    const handle = handleOf(p, l.url)
    if (!handle) {
      out.push({ platform: p, handle: '', status: 'none', note: 'We cannot read the username from that link. Remove the account and add it again by its username.', profileUrl: l.url })
      continue
    }
    const e = store[p]
    const mine = e && same(e.u, handle) ? e : undefined
    const profileUrl = profileUrlFor(p, handle)
    if (mine?.ok) out.push({ platform: p, handle, status: 'verified', verifiedAt: mine.ok, by: mine.by, profileUrl })
    else if (mine?.ask) out.push({ platform: p, handle, status: 'waiting', code: mine.code, note: mine.note, profileUrl })
    else if (mine && mine.at + CODE_LIFE > t) out.push({ platform: p, handle, status: 'code', code: mine.code, expiresAt: mine.at + CODE_LIFE, note: mine.note, profileUrl })
    else out.push({ platform: p, handle, status: 'none', profileUrl })
  }
  return out
}

/** Platform to account name, for every account of this person that is verified right now. */
export async function verifiedHandles(userId: string, links?: Link[]): Promise<Partial<Record<Platform, string>>> {
  const out: Partial<Record<Platform, string>> = {}
  for (const s of await statesFor(userId, links)) if (s.status === 'verified') out[s.platform] = s.handle
  return out
}

async function linked(userId: string, platform: Platform): Promise<{ error: string } | { handle: string }> {
  const l = (await linksOf(userId)).find((x) => x.platform === platform)
  if (!l) return { error: 'Add that account first, then verify it.' }
  const handle = handleOf(platform, l.url)
  if (!handle) return { error: 'We cannot read the username from that link. Remove the account and add it again by its username.' }
  return { handle }
}

/** Gives the person a code for this account (the same one again while it is still good). */
export async function start(userId: string, platform: Platform): Promise<{ ok: true; state: State } | { ok: false; error: string }> {
  const l = await linked(userId, platform)
  if ('error' in l) return { ok: false, error: l.error }
  const store = await load(userId)
  const e = store[platform]
  const t = nowSec()
  if (!(e && same(e.u, l.handle) && (e.ok || e.at + CODE_LIFE > t))) {
    store[platform] = { u: l.handle, code: makeCode(), at: t, ok: null, tries: 0, last: 0, ask: null }
    await save(userId, store)
  }
  const s = (await statesFor(userId)).find((x) => x.platform === platform)
  return s ? { ok: true, state: s } : { ok: false, error: 'Could not start that.' }
}

export type LookupResult = { status: 'found' } | { status: 'missing'; message: string } | { status: 'unknown' }

/** Does this linked account exist? Said as soon as it is added, so a mistyped username is caught before a code is made. `unknown` means the site would not let us look. */
export async function lookup(userId: string, platform: Platform): Promise<LookupResult> {
  const l = await linked(userId, platform)
  if ('error' in l) return { status: 'unknown' }
  const read = await readProfile(platform, l.handle)
  if (read.ok) return { status: 'found' }
  return /could not find/i.test(read.why) ? { status: 'missing', message: read.why } : { status: 'unknown' }
}

export type CheckResult = { status: 'verified' } | { status: 'not-found'; message: string } | { status: 'unreadable'; message: string } | { status: 'error'; message: string }

/** Reads the account's page and looks for the code. */
export async function check(userId: string, email: string, platform: Platform): Promise<CheckResult> {
  const l = await linked(userId, platform)
  if ('error' in l) return { status: 'error', message: l.error }
  const store = await load(userId)
  const e = store[platform]
  const t = nowSec()
  if (!e || !same(e.u, l.handle) || (!e.ok && e.at + CODE_LIFE <= t)) return { status: 'error', message: 'Get a code first, put it in your bio, then check.' }
  if (e.ok) return { status: 'verified' }
  e.tries++
  e.last = t
  const read = await readProfile(platform, l.handle)
  if (!read.ok) {
    await save(userId, store)
    return { status: 'unreadable', message: read.why }
  }
  if (!pageHasCode(read.html, e.code)) {
    await save(userId, store)
    return { status: 'not-found', message: 'We read your profile but the code is not in the bio yet. Save the bio, wait a minute for the platform to update, then check again.' }
  }
  const followers = followersFromHtml(platform, read.html)
  if (followers !== null) await recordFollowers(userId, platform, l.handle, followers).catch(() => null)
  await markVerified(userId, email, platform, l.handle, 'bio', store)
  return { status: 'verified' }
}

/** Records a verified account, and makes sure nobody else keeps it: proving an account is the stronger claim, so the newest proof wins. */
async function markVerified(userId: string, email: string, platform: Platform, handle: string, by: 'bio' | 'team', store?: Store) {
  const d = await db()
  const s = store ?? (await load(userId))
  const e = s[platform]
  if (e) {
    e.ok = nowSec()
    e.by = by
    e.ask = null
    e.note = undefined
  }
  await save(userId, s)
  const prev = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(ownerKey(platform, handle)).first<{ value: string }>()
  if (prev && prev.value !== userId) {
    const other = await load(prev.value)
    if (other[platform] && same(other[platform]!.u, handle)) {
      delete other[platform]
      await save(prev.value, other)
      await notify(prev.value, { kind: 'account', title: `${labelOf(platform)} is now verified on another account`, body: `The @${handle} account was verified by someone who put a code in its bio, so it is no longer verified on yours.`, href: '/dashboard/accounts', dedupe: `bio-moved:${prev.value}:${platform}:${nowSec()}` })
    }
  }
  await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(ownerKey(platform, handle), userId, nowSec()).run()
  await auditSafe({ id: userId, email }, 'account.bio_verified', `${platform}:@${handle}`, by)
  await notify(userId, { kind: 'account', title: `${labelOf(platform)} verified`, body: `@${handle} is yours. Clips from it can now be checked automatically.`, href: '/dashboard/accounts', dedupe: `bio-ok:${userId}:${platform}:${handle.toLowerCase()}` })
}

export const labelOf = (p: Platform) => (p === 'tiktok' ? 'TikTok' : p === 'youtube' ? 'YouTube' : 'Instagram')

/** The person asks the team to look, for an account the site cannot read (Instagram, or a platform that blocks us). */
export async function askTeam(userId: string, email: string, platform: Platform): Promise<{ ok: true } | { ok: false; error: string }> {
  const l = await linked(userId, platform)
  if ('error' in l) return { ok: false, error: l.error }
  const store = await load(userId)
  const e = store[platform]
  const t = nowSec()
  if (!e || !same(e.u, l.handle) || (!e.ok && e.at + CODE_LIFE <= t)) return { ok: false, error: 'Get a code first and put it in your bio, then ask us to check.' }
  if (e.ok) return { ok: true }
  if (!e.ask) {
    e.ask = t
    await save(userId, store)
    await notifyAdmins({ title: `Check a ${labelOf(platform)} bio`, body: `@${l.handle} should have ${e.code} in its bio. ${email}`, href: `/admin/people/${userId}`, dedupe: `bio-ask:${userId}:${platform}:${e.at}` })
  }
  return { ok: true }
}

/** A person on the team decides a check that was handed to them. */
export async function decide(actor: { id: string; email: string }, userId: string, platform: Platform, action: 'approve' | 'decline' | 'remove'): Promise<{ ok: true } | { ok: false; error: string }> {
  const store = await load(userId)
  const e = store[platform]
  if (!e) return { ok: false, error: 'There is nothing to decide for that account.' }
  const d = await db()
  const u = await d.prepare('SELECT email FROM users WHERE id = ?1').bind(userId).first<{ email: string }>()
  if (action === 'approve') {
    const links = await linksOf(userId)
    const link = links.find((x) => x.platform === platform)
    const handle = link ? handleOf(platform, link.url) : null
    if (!handle || !same(handle, e.u)) return { ok: false, error: 'The linked account changed since the code was issued. Ask them to start again.' }
    await markVerified(userId, u?.email ?? '', platform, handle, 'team', store)
    await auditSafe(actor, 'account.bio_approved', userId, `${platform}:@${handle}`)
    return { ok: true }
  }
  if (action === 'decline') {
    e.ask = null
    e.note = 'The team could not see the code in your bio. Put it in, save, and ask again.'
    await save(userId, store)
    await notify(userId, { kind: 'account', title: `${labelOf(platform)} not verified yet`, body: 'We could not see the code in your bio. Put it in, save the bio, and check again.', href: '/dashboard/accounts', dedupe: `bio-no:${userId}:${platform}:${nowSec()}` })
    await auditSafe(actor, 'account.bio_declined', userId, `${platform}:@${e.u}`)
    return { ok: true }
  }
  if (e.ok) await d.prepare('DELETE FROM settings WHERE key = ?1 AND value = ?2').bind(ownerKey(platform, e.u), userId).run()
  delete store[platform]
  await save(userId, store)
  await auditSafe(actor, 'account.bio_removed', userId, `${platform}:@${e.u}`)
  return { ok: true }
}

/** Called when someone changes their linked accounts: anything that no longer matches an account they have is forgotten. */
export async function prune(userId: string, links: Link[]) {
  const store = await load(userId)
  let changed = false
  const d = await db()
  for (const p of PLATFORMS) {
    const e = store[p]
    if (!e) continue
    const l = links.find((x) => x.platform === p)
    const handle = l ? handleOf(p, l.url) : null
    if (!handle || !same(handle, e.u)) {
      if (e.ok) await d.prepare('DELETE FROM settings WHERE key = ?1 AND value = ?2').bind(ownerKey(p, e.u), userId).run()
      delete store[p]
      changed = true
    }
  }
  if (changed) await save(userId, store)
}


/** How many people are waiting for the team to check a bio by hand. */
export async function waitingChecks(): Promise<number> {
  try {
    const d = await db()
    const r = await d.prepare("SELECT COUNT(*) AS n FROM settings WHERE key LIKE 'acctv:%' AND value LIKE '%\"ask\":1%'").first<{ n: number }>()
    return r?.n ?? 0
  } catch {
    return 0
  }
}
