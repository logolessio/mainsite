import { db, nowSec } from './db'
import { assertCanChangeHandle, recordHandleChange } from './handle-changes'
import { HttpError } from './http'
import { isLookKey, lookFor } from './looks'
import { parseExtras } from './profile-extras'
import { DEFAULT_SHOW, handleProblem, HANDLE_RE_LOOSE, RESERVED_WORDS, type ProfileLink } from './profile-style'
import type { UserRow } from './user'
import { reservedByAnother, reservedHandleFor } from './waitlist'

type ProfileRow = {
  user_id: string
  handle: string
  display_name: string
  bio: string
  avatar_key: string | null
  links_json: string
  style_json?: string
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

function slug(email: string) {
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16)
  return base.length >= 3 ? base : `${base}user`.slice(0, 16)
}

/** The person's profile (the name and words that sit on their page), created on first use with a handle taken from their email. */
export async function ensureProfile(user: UserRow): Promise<ProfileRow> {
  const d = await db()
  const found = await d.prepare('SELECT * FROM profiles WHERE user_id = ?1').bind(user.id).first<ProfileRow>()
  if (found) return found
  const base = slug(user.email)
  const t = nowSec()
  const name = clean(user.name ?? base).slice(0, 40) || base
  // a username this address reserved on the waitlist is the first one tried
  const tries = [...(await reservedHandleFor(user.email).then((h) => (h ? [h] : []))), base]
  for (let i = 0; i < 20; i++) {
    let handle = i < tries.length ? tries[i] : `${base}${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 20)
    // Official-looking names are not handed out automatically.
    if (RESERVED_WORDS.some((w) => handle.includes(w))) handle = `user${Math.floor(100000 + Math.random() * 900000)}`
    const res = await d
      .prepare(
        `INSERT OR IGNORE INTO profiles (user_id, handle, display_name, show_json, banner_kind, banner_value, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 'preset', ?6, ?5, ?5)`,
      )
      .bind(user.id, handle, name, JSON.stringify(DEFAULT_SHOW), t, lookFor(handle).id)
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

/** The profile behind logoless.io/<handle>, or null when nobody has that name (or the account is banned). */
export async function profileByHandle(handle: string) {
  if (!HANDLE_RE_LOOSE.test(handle.toLowerCase())) return null
  const row = await (await db())
    .prepare('SELECT p.*, u.status AS status FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.handle = ?1')
    .bind(handle.toLowerCase())
    .first<ProfileRow & { status: string }>()
  if (!row || row.status === 'banned') return null
  return {
    row,
    view: { handle: row.handle, displayName: row.display_name, bio: row.bio, links: parse<ProfileLink[]>(row.links_json, []), extras: parseExtras(row.style_json) },
    userId: row.user_id,
    suspended: row.status === 'suspended',
  }
}

/** A username as it is saved: lower case, with the punctuation the site allows, and not a reserved word (admins may take those). */
export function validHandle(raw: string, isAdmin: boolean) {
  const h = raw.trim().toLowerCase().replace(/^@/, '')
  const problem = handleProblem(h, { loose: true, isAdmin })
  if (problem) throw new HttpError(400, problem)
  return h
}

export type ProfileInput = {
  handle?: string
  displayName?: string
  bio?: string
  avatar?: string | null // upload id, or null to go back to the stand-in picture
}

/** Applies an edit to the name, words, picture and username that sit on a page. Returns which parts actually changed. */
export async function saveProfile(user: UserRow, input: ProfileInput, opts: { /** A first username (the name picked before signing up) is not a change: it is not held to the weekly limit or logged. */ firstHandle?: boolean } = {}) {
  const d = await db()
  const cur = await ensureProfile(user)
  const next = { ...cur }
  const changed: string[] = []

  if (input.handle !== undefined && input.handle.trim().toLowerCase().replace(/^@/, '') !== cur.handle) {
    next.handle = validHandle(input.handle, user.role === 'admin')
    if (await reservedByAnother(next.handle, user.email)) throw new HttpError(409, 'That username was reserved by someone on the waitlist.')
    if (!opts.firstHandle) await assertCanChangeHandle(user.id, user.role === 'admin')
    changed.push('handle')
  }
  if (input.displayName !== undefined) {
    const n = clean(input.displayName).slice(0, 40)
    if (!n) throw new HttpError(400, 'Add a display name.')
    next.display_name = n
  }
  if (input.bio !== undefined) {
    const b = input.bio.replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f\u007f<>]/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 400)
    if (b !== cur.bio) changed.push('bio')
    next.bio = b
  }
  if (input.avatar !== undefined) {
    if (input.avatar === null) next.avatar_key = null
    else if (isLookKey(input.avatar)) next.avatar_key = input.avatar // a ready-made look
    else {
      const own = await d.prepare("SELECT id FROM uploads WHERE id = ?1 AND user_id = ?2 AND kind = 'avatar'").bind(input.avatar, user.id).first()
      if (!own) throw new HttpError(400, 'Upload the picture first.')
      next.avatar_key = input.avatar
    }
  }

  try {
    await d
      .prepare('UPDATE profiles SET handle=?2, display_name=?3, bio=?4, avatar_key=?5, updated_at=?6 WHERE user_id=?1')
      .bind(user.id, next.handle, next.display_name, next.bio, next.avatar_key, nowSec())
      .run()
  } catch (e) {
    if (/UNIQUE/i.test(e instanceof Error ? e.message : '')) throw new HttpError(409, 'That username is taken.')
    throw e
  }
  if (changed.includes('handle') && !opts.firstHandle) await recordHandleChange(user.id, cur.handle, next.handle)
  // The name people see is the account's name everywhere (emails, the team's lists), so the two never differ.
  if (next.display_name !== cur.display_name) await d.prepare('UPDATE users SET name = ?2 WHERE id = ?1').bind(user.id, next.display_name).run().catch(() => null)
  return { profile: next, changed }
}
