import { db, nowSec, uid } from './db'
import { HttpError } from './http'
import { bioUploadIds } from './bio-store'
import { makeRoom, sweepChunks } from './quota'

/** A still picture is re-encoded in the browser first, and then has to be this small. (GIFs, videos and songs have no limit of their own: only the 50 MB.) */
export const MAX_IMAGE_BYTES = 450 * 1024
// Banners may be taller than 16 by 9 (up to square), and the profile grows to fit them.
export const IMAGE_LIMITS = { avatar: { w: 512, h: 512 }, banner: { w: 1600, h: 1600 }, cover: { w: 900, h: 900 }, background: { w: 1920, h: 1920 }, cursor: { w: 128, h: 128 } } as const
/** How many of each kind are kept. Banners keep more, so recent ones can be put back with one click. */
const KEEP: Record<string, number> = { banner: 8, background: 12, cover: 12, bgvideo: 3, cursor: 6, audio: 12 }
export type ImageKind = keyof typeof IMAGE_LIMITS

/** Reads width/height from the file header itself, so we never trust what the browser says. */
export function dimensions(b: Uint8Array, mime: string): { w: number; h: number } | null {
  if (mime === 'image/gif' && b.length > 10) return { w: b[6] | (b[7] << 8), h: b[8] | (b[9] << 8) }
  if (mime === 'image/png' && b.length > 24) {
    const v = new DataView(b.buffer, b.byteOffset)
    return { w: v.getUint32(16), h: v.getUint32(20) }
  }
  if (mime === 'image/jpeg') {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null
      const marker = b[i + 1]
      const len = (b[i + 2] << 8) | b[i + 3]
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return { h: (b[i + 5] << 8) | b[i + 6], w: (b[i + 7] << 8) | b[i + 8] }
      i += 2 + len
    }
    return null
  }
  if (mime === 'image/webp' && b.length > 30) {
    const tag = String.fromCharCode(...b.slice(12, 16))
    if (tag === 'VP8 ') return { w: (b[26] | (b[27] << 8)) & 0x3fff, h: (b[28] | (b[29] << 8)) & 0x3fff }
    if (tag === 'VP8L') {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)
      return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 }
    }
    if (tag === 'VP8X') return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) }
  }
  return null
}

export function sniff(b: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif' | null {
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return 'image/gif'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
  return null
}

const toBase64 = (b: Uint8Array) => {
  let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(s)
}

/**
 * Checks an image's real type, size and dimensions, then stores it for this person. Used for browser uploads and for
 * pictures fetched from Discord. SVG is refused on purpose because it can carry scripts.
 */
export async function storeImage(userId: string, kind: ImageKind, bytes: Uint8Array) {
  const mime = sniff(bytes)
  if (!mime || mime === 'image/gif') throw new HttpError(400, 'Only JPEG, PNG and WebP images are allowed here.')
  if (bytes.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'that image is too big. pick a smaller one.')
  const dim = dimensions(bytes, mime)
  const lim = IMAGE_LIMITS[kind]
  if (!dim || dim.w < 32 || dim.h < 32 || dim.w > lim.w * 1.05 || dim.h > lim.h * 1.05) throw new HttpError(400, 'That image has unsupported dimensions.')

  return insert(userId, kind, mime, bytes)
}

/** The uploads a person's profile is using right now. They are never cleared out to make room. */
export async function inUse(userId: string): Promise<string[]> {
  const d = await db()
  const row = await d.prepare('SELECT * FROM profiles WHERE user_id = ?1').bind(userId).first<{ avatar_key: string | null; banner_value: string; style_json?: string }>()
  if (!row) return []
  const ids: (string | null | undefined)[] = [row.avatar_key, row.banner_value]
  try {
    // the link-in-bio page (lib/bio-store.ts) keeps its own picture, video and cursor
    const page = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(`bio:${userId}`).first<{ value: string }>()
    if (page) ids.push(...bioUploadIds(page.value))
  } catch {
    /* no page yet */
  }
  try {
    const bg = (JSON.parse(row.style_json ?? '{}') as { bg?: { image?: string; video?: string } }).bg
    ids.push(bg?.image, bg?.video)
  } catch {
    /* no studio choices */
  }
  return ids.filter((x): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/.test(x))
}

/**
 * Gets a person's storage ready for one more file of `add` bytes of this kind: keeps only the latest few of the kind (never one the page is using),
 * clears pieces left behind, and makes room in their 50 MB (or says it will not fit).
 */
export async function makeSlot(userId: string, kind: string, add: number) {
  const d = await db()
  const keep = await inUse(userId).catch(() => [] as string[])
  await d
    .prepare(
      `DELETE FROM uploads WHERE user_id = ?1 AND kind = ?2 AND id NOT IN (SELECT id FROM uploads WHERE user_id = ?1 AND kind = ?2 ORDER BY created_at DESC LIMIT ?3)${keep.length ? ` AND id NOT IN (${keep.map((_, i) => `?${i + 4}`).join(',')})` : ''}`,
    )
    .bind(userId, kind, KEEP[kind] ?? 3, ...keep)
    .run()
  await sweepChunks(userId)
  await makeRoom(userId, add, keep)
}

async function insert(userId: string, kind: string, mime: string, bytes: Uint8Array) {
  await makeSlot(userId, kind, bytes.length)
  const id = uid()
  await (await db()).prepare('INSERT INTO uploads (id, user_id, kind, mime, size, data, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7)').bind(id, userId, kind, mime, bytes.length, toBase64(bytes), nowSec()).run()
  return id
}

/** Width and height of a stored image from the first bytes of its base64 data (all our images are WebP, PNG or JPEG). */
export function headDimensions(base64Head: string, mime: string) {
  try {
    const clean = base64Head.slice(0, Math.floor(base64Head.length / 4) * 4)
    return dimensions(Uint8Array.from(atob(clean), (c) => c.charCodeAt(0)), mime)
  } catch {
    return null
  }
}

/** Base64 to bytes, with a plain loop (it costs far less than mapping every character through a callback). */
export function b64ToBytes(data: string) {
  const bin = atob(data)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export const toB64 = toBase64

export function fromBase64(data: string) {
  if (!/^[A-Za-z0-9+/=]+$/.test(data)) throw new HttpError(400, 'That file could not be read.')
  try {
    return b64ToBytes(data)
  } catch {
    throw new HttpError(400, 'That file could not be read.')
  }
}
