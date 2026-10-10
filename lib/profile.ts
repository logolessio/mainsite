import { db, nowSec } from './db'
import { HttpError } from './http'
import { hmacHex, safeEqual } from './crypto'
import { setting } from './db'
import {
  BANNER_PRESET_IDS,
  DEFAULT_SHOW,
  FONT_IDS,
  HANDLE_RE,
  LINK_PLATFORMS,
  RESERVED_WORDS,
  SHOW_OPTIONS,
  type FontId,
  type ProfileLink,
  type ProfileStats,
  type ProfileView,
  type ShowMap,
} from './profile-style'
import type { UserRow } from './user'

type ProfileRow = {
  user_id: string
  handle: string
  display_name: string
  bio: string
  country: string | null
  avatar_key: string | null
  banner_kind: 'preset' | 'image'
  banner_value: string
  dot_color: string
  accent: string
  font: string
  links_json: string
  website: string | null
  show_json: string
  badges_json: string
  niches_json: string
  created_at: number
  updated_at: number
}

const parse = <T>(s: string | null | undefined, fallback: T): T => {
  try {
    return s ? (JSON.parse(s) as T) : fallback
  } catch {
    return fallback
  }
}

const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim()
const COLOR = /^#[0-9a-f]{6}$/i

export function toView(row: ProfileRow, isStaff: boolean): ProfileView {
  const show = { ...DEFAULT_SHOW, ...parse<Partial<ShowMap>>(row.show_json, {}) }
  return {
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio,
    avatar: row.avatar_key ? `/api/img/${row.avatar_key}` : null,
    bannerKind: row.banner_kind,
    banner: row.banner_kind === 'image' ? `/api/img/${row.banner_value}` : row.banner_value,
    dotColor: row.dot_color,
    accent: row.accent,
    font: (FONT_IDS.includes(row.font) ? row.font : 'geist') as FontId,
    links: parse<ProfileLink[]>(row.links_json, []),
    website: row.website,
    badges: parse<string[]>(row.badges_json, []),
    show,
    joinedAt: row.created_at,
    country: row.country,
    isStaff,
  }
}

function slug(email: string) {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16)
  return base.length >= 3 ? base : `${base}user`.slice(0, 16)
}

/** The person's profile, created on first use with a handle taken from their email. */
export async function ensureProfile(user: UserRow): Promise<ProfileRow> {
  const d = await db()
  const found = await d.prepare('SELECT * FROM profiles WHERE user_id = ?1').bind(user.id).first<ProfileRow>()
  if (found) return found
  const base = slug(user.email)
  const t = nowSec()
  const name = clean(user.name ?? base).slice(0, 40) || base
  for (let i = 0; i < 20; i++) {
    let handle = i === 0 ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 20)
    // Official-looking names are not handed out automatically.
    if (RESERVED_WORDS.some((w) => handle.includes(w))) handle = `user${Math.floor(100000 + Math.random() * 900000)}`
    const res = await d
      .prepare(
        `INSERT OR IGNORE INTO profiles (user_id, handle, display_name, show_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)`,
      )
      .bind(user.id, handle, name, JSON.stringify(DEFAULT_SHOW), t)
      .run()
    if (res.meta.changes === 1) break
    // The user_id may already exist (parallel request); stop if so.
    const again = await d.prepare('SELECT * FROM profiles WHERE user_id = ?1').bind(user.id).first<ProfileRow>()
    if (again) return again
  }
  const row = await d.prepare('SELECT * FROM profiles WHERE user_id = ?1').bind(user.id).first<ProfileRow>()
  if (!row) throw new HttpError(500, 'Could not create your profile.')
  return row
}

export async function profileByHandle(handle: string) {
  if (!HANDLE_RE.test(handle.toLowerCase())) return null
  const d = await db()
  const row = await d
    .prepare(
      `SELECT p.*, u.role AS role, u.status AS status FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.handle = ?1`,
    )
    .bind(handle.toLowerCase())
    .first<ProfileRow & { role: string; status: string }>()
  if (!row || row.status === 'banned') return null
  return { row, view: toView(row, row.role === 'admin'), userId: row.user_id, suspended: row.status === 'suspended' }
}

export async function profileStats(userId: string): Promise<ProfileStats> {
  const d = await db()
  const r = await d
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM submissions WHERE user_id = ?1) AS clips,
         (SELECT COALESCE(SUM(views_verified), 0) FROM submissions WHERE user_id = ?1) AS views,
         (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger WHERE user_id = ?1 AND account = 'clipper' AND kind = 'earning') AS earnedCents,
         (SELECT COUNT(DISTINCT campaign_id) FROM submissions WHERE user_id = ?1) AS campaigns`,
    )
    .bind(userId)
    .first<ProfileStats>()
  return r ?? { clips: 0, views: 0, earnedCents: 0, campaigns: 0 }
}

// ---------- validation for saves ----------

export function validHandle(raw: string, isAdmin: boolean) {
  const h = raw.trim().toLowerCase().replace(/^@/, '')
  if (!HANDLE_RE.test(h)) throw new HttpError(400, 'Usernames are 3 to 20 letters, numbers or underscores.')
  if (!isAdmin && RESERVED_WORDS.some((w) => h.includes(w))) throw new HttpError(400, 'That name is reserved. Please pick another.')
  return h
}

const hostMatches = (host: string, allowed: readonly string[]) => allowed.some((a) => host === a || host.endsWith(`.${a}`))

/** Only https links, no logins in the address, and each platform must point at its own domain. */
export function cleanLinks(input: unknown): ProfileLink[] {
  if (!Array.isArray(input)) return []
  const out: ProfileLink[] = []
  const seen = new Set<string>()
  for (const item of input.slice(0, 9)) {
    const platform = (item as { platform?: string })?.platform
    const url = String((item as { url?: string })?.url ?? '').trim()
    const meta = LINK_PLATFORMS.find((p) => p.id === platform)
    if (!meta || !url) continue
    const u = safeUrl(url)
    if (!u || !hostMatches(u.hostname, meta.hosts)) throw new HttpError(400, `That does not look like a ${meta.label} link.`)
    if (seen.has(meta.id)) continue
    seen.add(meta.id)
    out.push({ platform: meta.id, url: u.toString().slice(0, 200) })
  }
  return out
}

export function safeUrl(raw: string): URL | null {
  if (raw.length > 200) return null
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return null
    if (u.username || u.password) return null
    const host = u.hostname.toLowerCase()
    if (!host.includes('.') || host === 'localhost' || /^[\d.]+$/.test(host) || host.startsWith('[')) return null
    return u
  } catch {
    return null
  }
}

export type ProfileInput = {
  handle?: string
  displayName?: string
  bio?: string
  avatar?: string | null // upload id, or null to go back to your sign-in picture
  bannerKind?: 'preset' | 'image'
  banner?: string
  dotColor?: string
  accent?: string
  font?: string
  links?: unknown
  website?: string | null
  show?: Partial<ShowMap>
  badges?: string[]
  country?: string | null
}

/** Applies a profile edit. Returns which customisations actually changed, for achievements. */
export async function saveProfile(user: UserRow, input: ProfileInput) {
  const d = await db()
  const cur = await ensureProfile(user)
  const next = { ...cur }
  const changed: string[] = []

  if (input.handle !== undefined && input.handle.trim().toLowerCase().replace(/^@/, '') !== cur.handle) {
    next.handle = validHandle(input.handle, user.role === 'admin')
    changed.push('handle')
  }
  if (input.displayName !== undefined) {
    const n = clean(input.displayName).slice(0, 40)
    if (!n) throw new HttpError(400, 'Add a display name.')
    next.display_name = n
  }
  if (input.bio !== undefined) {
    const b = clean(input.bio).slice(0, 280)
    if (b !== cur.bio) changed.push('bio')
    next.bio = b
  }
  if (input.avatar !== undefined) {
    if (input.avatar === null) next.avatar_key = null
    else {
      const own = await d.prepare("SELECT id FROM uploads WHERE id = ?1 AND user_id = ?2 AND kind = 'avatar'").bind(input.avatar, user.id).first()
      if (!own) throw new HttpError(400, 'Upload the picture first.')
      next.avatar_key = input.avatar
    }
  }
  if (input.bannerKind !== undefined && input.banner !== undefined) {
    if (input.bannerKind === 'preset') {
      if (!BANNER_PRESET_IDS.includes(input.banner)) throw new HttpError(400, 'Unknown banner.')
    } else {
      const own = await d
        .prepare("SELECT id FROM uploads WHERE id = ?1 AND user_id = ?2 AND kind = 'banner'")
        .bind(input.banner, user.id)
        .first()
      if (!own) throw new HttpError(400, 'Upload the banner image first.')
    }
    if (input.banner !== cur.banner_value || input.bannerKind !== cur.banner_kind) changed.push('banner')
    next.banner_kind = input.bannerKind
    next.banner_value = input.banner
  }
  if (input.dotColor !== undefined) {
    if (!COLOR.test(input.dotColor)) throw new HttpError(400, 'Pick a valid dot colour.')
    if (input.dotColor.toLowerCase() !== cur.dot_color.toLowerCase()) changed.push('dots')
    next.dot_color = input.dotColor.toLowerCase()
  }
  if (input.accent !== undefined) {
    if (!COLOR.test(input.accent)) throw new HttpError(400, 'Pick a valid accent colour.')
    if (input.accent.toLowerCase() !== cur.accent.toLowerCase()) changed.push('accent')
    next.accent = input.accent.toLowerCase()
  }
  if (input.font !== undefined) {
    if (!FONT_IDS.includes(input.font)) throw new HttpError(400, 'Unknown font.')
    if (input.font !== cur.font) changed.push('font')
    next.font = input.font
  }
  if (input.links !== undefined) {
    const links = cleanLinks(input.links)
    if (JSON.stringify(links) !== cur.links_json) changed.push('links')
    next.links_json = JSON.stringify(links)
  }
  if (input.website !== undefined) {
    const w = (input.website ?? '').trim()
    if (!w) next.website = null
    else {
      const u = safeUrl(w)
      if (!u) throw new HttpError(400, 'Use a full https:// address for your website.')
      next.website = u.toString()
    }
    if (next.website !== cur.website) changed.push('website')
  }
  if (input.show !== undefined) {
    const show = { ...DEFAULT_SHOW, ...parse<Partial<ShowMap>>(cur.show_json, {}) }
    for (const o of SHOW_OPTIONS) if (typeof input.show[o.key] === 'boolean') show[o.key] = input.show[o.key] as boolean
    next.show_json = JSON.stringify(show)
  }
  if (input.country !== undefined) {
    const c = (input.country ?? '').toUpperCase()
    next.country = /^[A-Z]{2}$/.test(c) ? c : null
  }
  if (input.badges !== undefined) {
    if (!Array.isArray(input.badges) || input.badges.length > 5) throw new HttpError(400, 'You can equip up to 5 badges.')
    const ids = [...new Set(input.badges.map(String))]
    if (ids.length) {
      const have = (
        await d
          .prepare(`SELECT badge_id FROM badges_unlocked WHERE user_id = ?1 AND badge_id IN (${ids.map((_, i) => `?${i + 2}`).join(',')})`)
          .bind(user.id, ...ids)
          .all<{ badge_id: string }>()
      ).results.map((r) => r.badge_id)
      if (have.length !== ids.length) throw new HttpError(400, 'You can only equip badges you have unlocked.')
    }
    next.badges_json = JSON.stringify(ids)
    changed.push('badges')
  }

  try {
    await d
      .prepare(
        `UPDATE profiles SET handle=?2, display_name=?3, bio=?4, country=?5, banner_kind=?6, banner_value=?7, dot_color=?8,
           accent=?9, font=?10, links_json=?11, website=?12, show_json=?13, badges_json=?14, updated_at=?15, avatar_key=?16 WHERE user_id=?1`,
      )
      .bind(
        user.id,
        next.handle,
        next.display_name,
        next.bio,
        next.country,
        next.banner_kind,
        next.banner_value,
        next.dot_color,
        next.accent,
        next.font,
        next.links_json,
        next.website,
        next.show_json,
        next.badges_json,
        nowSec(),
        next.avatar_key,
      )
      .run()
  } catch (e) {
    if (/UNIQUE/i.test(e instanceof Error ? e.message : '')) throw new HttpError(409, 'That username is taken.')
    throw e
  }
  return { profile: next, changed }
}

/** Signed link for the "you are leaving logoless" page, so it cannot be used to launder arbitrary addresses. */
export async function externalHref(url: string) {
  const secret = (await setting('AUTH_SECRET')) ?? 'logoless'
  const sig = (await hmacHex(secret, `out|${url}`)).slice(0, 32)
  return `/out?u=${encodeURIComponent(url)}&s=${sig}`
}

export async function verifyExternal(url: string, sig: string) {
  const secret = (await setting('AUTH_SECRET')) ?? 'logoless'
  const expect = (await hmacHex(secret, `out|${url}`)).slice(0, 32)
  return safeEqual(expect, sig) && !!safeUrl(url)
}
