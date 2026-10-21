import { db, nowSec, uid } from './db'
import { HttpError } from './http'

/**
 * Short audio previews for campaigns (the part of the song creators should use). Stored like pictures, in the uploads table,
 * so no storage bucket is needed; that is why they are kept small: about 30 seconds of a normal MP3.
 */
export const MAX_AUDIO_BYTES = 1024 * 1024
export const AUDIO_MIMES = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav'] as const
/** How many audio previews and backgrounds one person keeps: enough for several campaigns at once. */
const KEEP = 12

/** The real type, read from the first bytes. What the browser says the file is does not count. */
export function sniffAudio(b: Uint8Array): (typeof AUDIO_MIMES)[number] | null {
  const s = (from: number, to: number) => String.fromCharCode(...b.slice(from, to))
  if (s(0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'audio/mpeg'
  if (s(4, 8) === 'ftyp') return 'audio/mp4'
  if (s(0, 4) === 'OggS') return 'audio/ogg'
  if (s(0, 4) === 'RIFF' && s(8, 12) === 'WAVE') return 'audio/wav'
  return null
}

const toBase64 = (b: Uint8Array) => {
  let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(s)
}

export async function storeAudio(userId: string, bytes: Uint8Array) {
  if (bytes.length > MAX_AUDIO_BYTES) throw new HttpError(413, 'That file is too large. Keep the preview under 1 MB (about 30 seconds of MP3).')
  if (bytes.length < 1024) throw new HttpError(400, 'That file is too short to be a song.')
  const mime = sniffAudio(bytes)
  if (!mime) throw new HttpError(400, 'Use an MP3, M4A, OGG or WAV file.')
  const d = await db()
  await d.prepare("DELETE FROM uploads WHERE user_id = ?1 AND kind = 'audio' AND id NOT IN (SELECT id FROM uploads WHERE user_id = ?1 AND kind = 'audio' ORDER BY created_at DESC LIMIT ?2)").bind(userId, KEEP - 1).run()
  const id = uid()
  await d.prepare("INSERT INTO uploads (id, user_id, kind, mime, size, data, created_at) VALUES (?1, ?2, 'audio', ?3, ?4, ?5, ?6)").bind(id, userId, mime, bytes.length, toBase64(bytes), nowSec()).run()
  return id
}
