import { safeEqual, sha256Hex } from './crypto'
import { db, nowSec } from './db'
import { hit, limit } from './guard'
import { HttpError } from './http'

/**
 * Keys for the owner API (/api/v1), so another tool, like a dashboard built in Base44, can run the admin work from anywhere.
 * A key is shown once when it is made and only a fingerprint is kept. Scopes decide what it may do. Nothing that moves money out
 * (sending withdrawals, correcting balances), deletes or bans people, changes roles or switches site-wide settings is available
 * through a key: those stay in the owner dashboard behind the admin password.
 */
export type ApiScope = 'read' | 'moderate' | 'message' | 'pay'
export const API_SCOPES: { id: ApiScope; label: string; hint: string }[] = [
  { id: 'read', label: 'Read', hint: 'See stats, people, campaigns, clips, withdrawals, the inbox and the audit log.' },
  { id: 'moderate', label: 'Moderate', hint: 'Accept, decline, pause, resume or end campaigns, and approve or decline clips.' },
  { id: 'message', label: 'Message', hint: 'Answer inbox conversations and tickets, message one person, post announcements in Discord.' },
  { id: 'pay', label: 'Pay', hint: 'Set verified views on a clip, which pays the clipper out of the brand balance.' },
]
export const isScope = (v: unknown): v is ApiScope => API_SCOPES.some((s) => s.id === v)

export type ApiKey = { id: string; name: string; scopes: ApiScope[]; hash: string; createdAt: number; createdBy: string; lastUsed: number | null }

const row = (id: string) => `adminapi:${id}`
const rand = (bytes: number) => [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('')

export async function createApiKey(name: string, scopes: ApiScope[], createdBy: string) {
  const id = rand(5)
  const secret = rand(24)
  const rec: ApiKey = { id, name: name.trim().slice(0, 40) || 'API key', scopes: [...new Set(scopes)].filter(isScope), hash: await sha256Hex(secret), createdAt: nowSec(), createdBy, lastUsed: null }
  const d = await db()
  await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3)').bind(row(id), JSON.stringify(rec), rec.createdAt).run()
  return { key: `lgk_${id}_${secret}`, record: { ...rec, hash: undefined } }
}

export async function listApiKeys(): Promise<Omit<ApiKey, 'hash'>[]> {
  const d = await db()
  const rows = (await d.prepare("SELECT value FROM settings WHERE key LIKE 'adminapi:%' ORDER BY updated_at DESC").all<{ value: string }>()).results
  const out: Omit<ApiKey, 'hash'>[] = []
  for (const r of rows) {
    try {
      const { hash: _h, ...rest } = JSON.parse(r.value) as ApiKey
      void _h
      out.push(rest)
    } catch {
      /* skip a broken row */
    }
  }
  return out
}

export async function revokeApiKey(id: string) {
  if (!/^[0-9a-f]{10}$/.test(id)) return false
  const d = await db()
  const res = await d.prepare('DELETE FROM settings WHERE key = ?1').bind(row(id)).run()
  return res.meta.changes === 1
}

/** Checks the key on a request. Throws 401 for a bad key and 403 for a missing scope. */
export async function authenticate(req: Request, scope: ApiScope): Promise<ApiKey> {
  const raw = (req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? req.headers.get('x-api-key') ?? '').trim()
  const m = /^lgk_([0-9a-f]{10})_([0-9a-f]{48})$/.exec(raw)
  await limit(req, { name: 'api-v1', max: 240, windowSec: 60 })
  if (!m) throw new HttpError(401, 'Send your key as "Authorization: Bearer lgk_…".')
  const d = await db()
  const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(row(m[1])).first<{ value: string }>()
  let key: ApiKey | null = null
  try {
    key = r ? (JSON.parse(r.value) as ApiKey) : null
  } catch {
    key = null
  }
  if (!key || !safeEqual(key.hash, await sha256Hex(m[2]))) throw new HttpError(401, 'That key is not valid, or it was revoked.')
  if ((await hit(`api-key:${key.id}`, 60)) > 240) throw new HttpError(429, 'Too many requests for this key. Slow down.')
  if (!key.scopes.includes(scope)) throw new HttpError(403, `This key does not have the "${scope}" scope.`)
  const t = nowSec()
  if (!key.lastUsed || t - key.lastUsed > 60) {
    key.lastUsed = t
    await d.prepare('UPDATE settings SET value = ?2 WHERE key = ?1').bind(row(key.id), JSON.stringify(key)).run()
  }
  return key
}
