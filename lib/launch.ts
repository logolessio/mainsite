import { hmacHex, safeEqual, sha256Hex } from './crypto'
import { db, nowSec, setting } from './db'
import { HANDLE_RE, RESERVED_WORDS } from './profile-style'
import type { SettingKey } from './settings'

// The launch page: a countdown and a sign-up that stand in front of the whole site until the owners open it.
//   launch-signup:<hash of email>   { e: email, h: reserved username or null, t: when, u: 1 if they unsubscribed }
//   launch-handle:<username>        the hash of the email that reserved it
// (the switch, the end time and the words are ordinary settings: launch_on, launch_end, launch_headline, launch_text, launch_auto)

export type LaunchView = { on: boolean; closed: boolean; end: number | null; headline: string; text: string; auto: boolean }

/** What the visitor is shown, from the settings. `closed` is whether the site is shut behind the launch page right now. */
export function launchView(s: Record<SettingKey, string>, now = nowSec()): LaunchView {
  const end = /^\d{9,11}$/.test(s.launch_end) ? Number(s.launch_end) : null
  const on = s.launch_on === '1'
  const auto = s.launch_auto === '1'
  return { on, closed: on && !(auto && end !== null && now >= end), end, headline: s.launch_headline, text: s.launch_text, auto }
}

/** The pages that stay open behind the launch page: the legal pages, the unsubscribe page, the sign-in page (so an owner is never locked out) and the page that hands scroll's Google and Discord sign-ins over. */
export const launchExempt = (path: string) => /^\/(legal|launch|login|scroll-signin)(\/|$)/.test(path)

export const normEmail = (e: string) => e.trim().toLowerCase()
export const validEmail = (e: string) => e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)
export const emailKey = (email: string) => sha256Hex(normEmail(email))

async function secret() {
  return (await setting('AUTH_SECRET')) ?? 'logoless'
}
/** The token in an unsubscribe link: only this server can make one for an address. */
export const unsubToken = async (key: string) => (await hmacHex(await secret(), `launch-unsub:${key}`)).slice(0, 32)
export async function unsubUrl(email: string) {
  const key = await emailKey(email)
  return `https://logoless.io/api/launch/unsubscribe?k=${key}&t=${await unsubToken(key)}`
}

async function put(key: string, value: unknown) {
  await (await db())
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(key, JSON.stringify(value), nowSec())
    .run()
}

export type Signup = { e: string; h: string | null; t: number; u?: number }

/** Why a username cannot be reserved, or null if it is free. */
export async function handleProblem(raw: string, forEmailKey?: string): Promise<string | null> {
  const h = raw.trim().toLowerCase().replace(/^@/, '')
  if (!HANDLE_RE.test(h)) return 'Use 3 to 20 letters, numbers or underscores.'
  if (RESERVED_WORDS.some((w) => h.includes(w))) return 'That name is kept by logoless.'
  const d = await db()
  if (await d.prepare('SELECT 1 AS x FROM profiles WHERE handle = ?1').bind(h).first()) return 'That one is taken.'
  const held = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(`launch-handle:${h}`).first<{ value: string }>()
  if (held && held.value !== forEmailKey) return 'Somebody has already reserved that.'
  return null
}

/** Adds an address to the list, and reserves a username for it if one is given and free. Safe to repeat. */
export async function addSignup(email: string, handle?: string | null): Promise<{ handle: string | null; already: boolean }> {
  const e = normEmail(email)
  const key = await emailKey(e)
  const d = await db()
  const row = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(`launch-signup:${key}`).first<{ value: string }>()
  let cur: Signup | null = null
  try {
    cur = row ? (JSON.parse(row.value) as Signup) : null
  } catch {
    cur = null
  }
  let h = cur?.h ?? null
  const want = handle?.trim().toLowerCase().replace(/^@/, '') || null
  if (want && want !== h) {
    if (await handleProblem(want, key)) throw new Error('taken')
    // the INSERT only succeeds for the first person to ask, so two people cannot both get the name
    const res = await d.prepare('INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)').bind(`launch-handle:${want}`, key, nowSec()).run()
    if (res.meta.changes !== 1) {
      const held = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(`launch-handle:${want}`).first<{ value: string }>()
      if (held?.value !== key) throw new Error('taken')
    }
    if (h) await d.prepare('DELETE FROM settings WHERE key = ?1 AND value = ?2').bind(`launch-handle:${h}`, key).run()
    h = want
  }
  await put(`launch-signup:${key}`, { e, h, t: cur?.t ?? nowSec(), u: 0 } satisfies Signup)
  return { handle: h, already: Boolean(cur) }
}

export async function listSignups(limit = 200, offset = 0) {
  const d = await db()
  const rows = (await d.prepare("SELECT key, value, updated_at FROM settings WHERE key LIKE 'launch-signup:%' ORDER BY updated_at DESC LIMIT ?1 OFFSET ?2").bind(limit, offset).all<{ key: string; value: string; updated_at: number }>()).results
  return rows.flatMap((r) => {
    try {
      return [{ key: r.key.slice('launch-signup:'.length), ...(JSON.parse(r.value) as Signup) }]
    } catch {
      return []
    }
  })
}

export async function signupCounts() {
  const d = await db()
  const r = await d
    .prepare("SELECT COUNT(*) AS n, SUM(CASE WHEN value LIKE '%\"u\":1%' THEN 1 ELSE 0 END) AS gone, SUM(CASE WHEN value LIKE '%\"h\":\"%' THEN 1 ELSE 0 END) AS names FROM settings WHERE key LIKE 'launch-signup:%'")
    .first<{ n: number; gone: number | null; names: number | null }>()
  return { total: r?.n ?? 0, unsubscribed: r?.gone ?? 0, reserved: r?.names ?? 0 }
}

export async function unsubscribe(key: string, token: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/.test(key) || !safeEqual(token, await unsubToken(key))) return false
  const d = await db()
  const row = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(`launch-signup:${key}`).first<{ value: string }>()
  if (!row) return true
  try {
    await put(`launch-signup:${key}`, { ...(JSON.parse(row.value) as Signup), u: 1 })
  } catch {
    /* nothing to mark */
  }
  return true
}
