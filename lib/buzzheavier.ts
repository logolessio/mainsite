// Files people host from their page (a preset pack, a LUT, a project file, anything that is not a picture, video or sound shown on the page itself) live in
// the site owner's Buzzheavier account and are opened on Buzzheavier's own download page. Uses its public API: https://buzzheavier.com/developers
//
// The account id is a secret (the Worker secret BUZZHEAVIER_ID, or BUZZHEAVIER_ID in .env.local while developing). It is only ever read here, on the server.
//
// Why only downloads: Buzzheavier's download addresses sit behind a Cloudflare bot check and refuse to be embedded by other sites, so a picture, video or
// song kept there cannot be shown on a page. Those stay on our own storage (see lib/upload.ts) or are linked from wherever the person keeps them.
import { db, nowSec, setting } from './db'
import { HttpError } from './http'

const API = 'https://buzzheavier.com/api'
const UPLOAD = 'https://w.buzzheavier.com'

/** One file: up to this size (a Worker takes a request body of up to 100 MB). */
export const MAX_HOST_BYTES = 90 * 1024 * 1024
/** All the files one person hosts, together. */
export const HOST_QUOTA_BYTES = 500 * 1024 * 1024
export const MAX_HOST_FILES = 20

/** Programs and scripts are not hosted (this account is the site's, so it is not a place to hand out things that run). */
const BLOCKED = new Set(['exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'pif', 'vbs', 'vbe', 'js', 'jse', 'wsf', 'ps1', 'psm1', 'jar', 'apk', 'ipa', 'dmg', 'pkg', 'app', 'deb', 'rpm', 'sh', 'bash', 'lnk', 'reg', 'hta', 'cpl', 'dll', 'sys', 'appimage', 'run'])

export const hostToken = async () => (await setting('BUZZHEAVIER_ID')) ?? null

/** A file name that is safe to store and to put in an address. Throws if it is a kind we do not host. */
export function safeName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? ''
  const clean = base.replace(/[^\p{L}\p{N}._ ()+-]/gu, '_').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').slice(0, 120)
  if (!clean) throw new HttpError(400, 'That file needs a name.')
  const ext = clean.includes('.') ? clean.split('.').pop()!.toLowerCase() : ''
  if (BLOCKED.has(ext)) throw new HttpError(400, 'Programs and scripts cannot be hosted here. Put them in a zip first.')
  return clean
}

/** Refuses a file that starts like a program (Windows, Linux or Mac), whatever it is called. */
export function looksExecutable(head: Uint8Array): boolean {
  const [a, b, c, d] = head
  return (a === 0x4d && b === 0x5a) || (a === 0x7f && b === 0x45 && c === 0x4c && d === 0x46) || (a === 0xcf && b === 0xfa && c === 0xed && d === 0xfe) || (a === 0xce && b === 0xfa && c === 0xed && d === 0xfe) || (a === 0x23 && b === 0x21)
}

async function api<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { ...init, headers: { authorization: `Bearer ${token}`, ...(init.body ? { 'content-type': 'application/json' } : {}) } })
  const j = (await res.json().catch(() => null)) as { data?: T } | null
  if (!res.ok || !j) throw new HttpError(502, 'The file host did not answer. Try again in a moment.')
  return j.data as T
}

type Dir = { id: string; children?: { id: string; name: string; isDirectory: boolean }[] }

/** The one folder ("logoless") that holds everything, found or made once and then remembered. */
async function folder(token: string, fresh = false): Promise<string> {
  const d = await db()
  if (!fresh) {
    const hit = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind('bh:folder').first<{ value: string }>()
    if (hit?.value) return hit.value
  }
  const root = await api<Dir>(token, '/fs')
  let id = root.children?.find((c) => c.isDirectory && c.name === 'logoless')?.id
  if (!id) id = (await api<{ id: string }>(token, `/fs/${root.id}`, { method: 'POST', body: JSON.stringify({ name: 'logoless' }) })).id
  await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind('bh:folder', id, nowSec()).run()
  return id
}

/** Makes a folder of its own for one file, so that taking the file away later is one call. */
export async function newFileFolder(token: string, name: string): Promise<string> {
  try {
    return (await api<{ id: string }>(token, `/fs/${await folder(token)}`, { method: 'POST', body: JSON.stringify({ name }) })).id
  } catch {
    // the remembered folder may have been moved or deleted: look again once
    return (await api<{ id: string }>(token, `/fs/${await folder(token, true)}`, { method: 'POST', body: JSON.stringify({ name }) })).id
  }
}

/** Streams a file into a folder. Gives back the file's id (its page is https://buzzheavier.com/<id>). */
export async function putFile(token: string, dirId: string, name: string, mime: string, length: number, body: ReadableStream<Uint8Array>): Promise<string> {
  const res = await fetch(`${UPLOAD}/${dirId}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${token}`, 'content-type': mime, 'content-length': String(length) },
    body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' })
  const j = (await res.json().catch(() => null)) as { data?: { id?: string } } | null
  const id = j?.data?.id
  if (!res.ok || typeof id !== 'string') throw new HttpError(502, 'The file host did not take that file. Try again in a moment.')
  return id
}

/** Takes a file away (its folder and everything in it). */
export async function removeFolder(token: string, dirId: string) {
  await api<null>(token, `/fs/${dirId}`, { method: 'DELETE' }).catch(() => null)
}
