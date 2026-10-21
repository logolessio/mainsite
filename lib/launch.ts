import { hmacHex, safeEqual, sha256Hex } from './crypto'
import { db, nowSec, setting } from './db'
import { cleanPage, normHandle, type PageConfig, WAITLIST_HANDLE_RE } from './launch-page'
import { isReservedHandle } from './profile-style'
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
export const launchExempt = (path: string) => /^\/(legal|launch|login)(\/|$)/.test(path)
/** With the new page (the launch-links feature) /links stays open too, so a link in a bio still works while the site is closed. */
export const linksExempt = (path: string) => /^\/links\/?$/.test(path)

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
  const h = normHandle(raw)
  if (h.length < 3) return 'At least 3 characters.'
  if (h.length > 20) return 'Up to 20 characters.'
  if (/[^a-z0-9._]/.test(h)) return 'Letters, numbers, dots and underscores only.'
  if (!WAITLIST_HANDLE_RE.test(h)) return 'A dot cannot start or end it, or come twice in a row.'
  if (isReservedHandle(h, true)) return 'That name is kept by logoless.'
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
  const want = (handle && normHandle(handle)) || null
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
    const cur = JSON.parse(row.value) as Signup
    // leaving the list also frees the username it held and the device's spot
    if (cur.h) await d.prepare('DELETE FROM settings WHERE key = ?1 AND value = ?2').bind(`launch-handle:${cur.h}`, key).run()
    await d.prepare('DELETE FROM launch_devices WHERE email_key = ?1').bind(key).run().catch(() => null)
    await put(`launch-signup:${key}`, { ...cur, h: null, u: 1 })
  } catch {
    /* nothing to mark */
  }
  return true
}

/** The username this address reserved on the waitlist, if it still holds one. */
export async function reservedHandleFor(email: string): Promise<string | null> {
  try {
    const s = await signupFor(await emailKey(email))
    return s && !s.u && s.h ? s.h : null
  } catch {
    return null
  }
}

/** True when the username was reserved on the waitlist by a different address, so nobody else can take it once the site is open. */
export async function reservedByAnother(handle: string, email: string): Promise<boolean> {
  try {
    const row = await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(`launch-handle:${normHandle(handle)}`).first<{ value: string }>()
    return Boolean(row) && row?.value !== (await emailKey(email))
  } catch {
    return false
  }
}

/** One person on the list, by the hash of their address. */
export async function signupFor(key: string): Promise<Signup | null> {
  const row = await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(`launch-signup:${key}`).first<{ value: string }>()
  try {
    return row ? (JSON.parse(row.value) as Signup) : null
  } catch {
    return null
  }
}

const PAGE_KEY = 'site:launch-page'

/** The words and look of the coming-soon and links page (see lib/launch-page.ts). The defaults if nothing was saved or it cannot be read. */
export async function getPage(): Promise<PageConfig> {
  try {
    const row = await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(PAGE_KEY).first<{ value: string }>()
    return cleanPage(row ? JSON.parse(row.value) : null)
  } catch {
    return cleanPage(null)
  }
}

export async function savePage(page: PageConfig) {
  await put(PAGE_KEY, cleanPage(page))
}

/** The headers that put an Unsubscribe button in the mail app itself (one click, RFC 8058). The same link as in the email. */
export const unsubHeaders = (url: string) => ({ 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' })
