import { db, nowSec, uid } from './db'
import { HttpError } from './http'

export const MAX_IMAGE_BYTES = 450 * 1024
export const IMAGE_LIMITS = { avatar: { w: 512, h: 512 }, banner: { w: 1600, h: 900 }, cover: { w: 900, h: 900 } } as const
export type ImageKind = keyof typeof IMAGE_LIMITS

/** Reads width/height from the file header itself, so we never trust what the browser says. */
function dimensions(b: Uint8Array, mime: string): { w: number; h: number } | null {
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

function sniff(b: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | null {
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
  if (bytes.length > MAX_IMAGE_BYTES) throw new HttpError(413, 'That image is too large. Please pick a smaller one.')
  const mime = sniff(bytes)
  if (!mime) throw new HttpError(400, 'Only JPEG, PNG and WebP images are allowed.')
  const dim = dimensions(bytes, mime)
  const lim = IMAGE_LIMITS[kind]
  if (!dim || dim.w < 32 || dim.h < 32 || dim.w > lim.w * 1.05 || dim.h > lim.h * 1.05) throw new HttpError(400, 'That image has unsupported dimensions.')

  const d = await db()
  // Keep only the latest few per kind so nobody can fill the database.
  await d
    .prepare('DELETE FROM uploads WHERE user_id = ?1 AND kind = ?2 AND id NOT IN (SELECT id FROM uploads WHERE user_id = ?1 AND kind = ?2 ORDER BY created_at DESC LIMIT 3)')
    .bind(userId, kind)
    .run()
  const id = uid()
  await d.prepare('INSERT INTO uploads (id, user_id, kind, mime, size, data, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7)').bind(id, userId, kind, mime, bytes.length, toBase64(bytes), nowSec()).run()
  return id
}

export function fromBase64(data: string) {
  if (!/^[A-Za-z0-9+/=]+$/.test(data)) throw new HttpError(400, 'That file could not be read.')
  try {
    return Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  } catch {
    throw new HttpError(400, 'That file could not be read.')
  }
}
