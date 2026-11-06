// Big files: songs, videos and GIFs. A database row can only hold about 2 MB, so a file is kept as pieces of CHUNK bytes. The "main" row is the file
// (its id, kind, type and total size, and `data` = 'ch:<pieces>' once it is complete, 'ch:0' while it is still arriving); each piece is its own row of
// kind 'chunk' with the id '<file id>.<n>'. Only the main row counts toward the person's 50 MB (see lib/quota.ts). There is no limit per file, only that
// allowance. The browser sends the pieces one after another (components never hold the whole file), and a piece is served back with byte ranges so a song
// can be skipped through and Safari will play a video.
import { db, nowSec, uid } from './db'
import { sniffAudio } from './audio'
import { HttpError } from './http'
import { USER_QUOTA_BYTES, megabytes, removeUpload } from './quota'
import { IMAGE_LIMITS, b64ToBytes, dimensions, makeSlot, sniff, toB64, type ImageKind } from './upload'

/** Raw bytes in one piece. Small enough that turning it into text and back stays well inside a request's time. */
export const CHUNK = 512 * 1024

export type BigType = 'audio' | 'video' | 'gif'
const IMAGE_KINDS = Object.keys(IMAGE_LIMITS) as ImageKind[]

export const piecesFor = (size: number) => Math.ceil(size / CHUNK)

/** The row kind a big file is kept under. */
function kindFor(type: BigType, kind: string | undefined) {
  if (type === 'audio') return 'audio'
  if (type === 'video') return 'bgvideo'
  if (kind && kind !== 'cursor' && (IMAGE_KINDS as string[]).includes(kind)) return kind
  throw new HttpError(400, 'Unknown upload type.')
}

/** Starts an upload: reserves the space and hands back the id to send the pieces to. */
export async function beginBig(userId: string, type: BigType, kind: string | undefined, size: number) {
  if (!Number.isInteger(size) || size <= 0) throw new HttpError(400, 'That file is empty.')
  if (type === 'audio' && size < 1024) throw new HttpError(400, 'That file is too short to be a song.')
  if (size > USER_QUOTA_BYTES) throw new HttpError(413, `That file is ${megabytes(size)}. Your whole allowance is ${megabytes(USER_QUOTA_BYTES)}, so it can't be kept here. Host it anywhere and paste the link.`)
  const rowKind = kindFor(type, kind)
  const d = await db()
  // an upload that never finished (the tab was closed) is cleared after an hour
  const stale = (await d.prepare("SELECT id FROM uploads WHERE user_id = ?1 AND data = 'ch:0' AND created_at < ?2").bind(userId, nowSec() - 3600).all<{ id: string }>()).results
  for (const r of stale) await removeUpload(r.id)
  await makeSlot(userId, rowKind, size)
  const id = uid()
  await d.prepare("INSERT INTO uploads (id, user_id, kind, mime, size, data, created_at) VALUES (?1, ?2, ?3, 'application/octet-stream', ?4, 'ch:0', ?5)").bind(id, userId, rowKind, size, nowSec()).run()
  return { id, chunk: CHUNK, pieces: piecesFor(size) }
}

type Pending = { id: string; kind: string; mime: string; size: number }

async function pending(userId: string, id: string): Promise<Pending> {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new HttpError(404, 'That upload is not there any more. Start it again.')
  const row = await (await db()).prepare("SELECT id, kind, mime, size FROM uploads WHERE id = ?1 AND user_id = ?2 AND data = 'ch:0'").bind(id, userId).first<Pending>()
  if (!row) throw new HttpError(404, 'That upload is not there any more. Start it again.')
  return row
}

/** Checks how the first piece begins, so a file is the type it claims to be. Returns its real type. */
function checkHead(row: Pending, b: Uint8Array): string {
  if (row.kind === 'audio') {
    const mime = sniffAudio(b)
    if (!mime) throw new HttpError(400, 'Use an MP3, M4A, OGG or WAV file.')
    return mime
  }
  if (row.kind === 'bgvideo') {
    const isMp4 = b.length > 12 && String.fromCharCode(...b.slice(4, 8)) === 'ftyp'
    const isWebm = b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3
    if (!isMp4 && !isWebm) throw new HttpError(400, 'Only MP4 and WebM videos are allowed.')
    return isMp4 ? 'video/mp4' : 'video/webm'
  }
  // an animated GIF for a picture, banner or background; stills are re-encoded in the browser and go the other way
  if (sniff(b) !== 'image/gif') throw new HttpError(400, 'Only GIFs are sent this way.')
  const dim = dimensions(b, 'image/gif')
  const lim = IMAGE_LIMITS[row.kind as ImageKind]
  if (!dim || dim.w < 32 || dim.h < 32 || dim.w > lim.w * 1.05 || dim.h > lim.h * 1.05) throw new HttpError(400, 'That GIF has unsupported dimensions.')
  return 'image/gif'
}

/** Keeps one piece. Pieces can arrive in any order and be sent again; the first one decides (and checks) the file's type. */
export async function putPiece(userId: string, id: string, n: number, bytes: Uint8Array) {
  const row = await pending(userId, id)
  const pieces = piecesFor(row.size)
  if (!Number.isInteger(n) || n < 0 || n >= pieces) throw new HttpError(400, 'That piece is out of place.')
  const expected = n === pieces - 1 ? row.size - CHUNK * (pieces - 1) : CHUNK
  if (bytes.length !== expected) throw new HttpError(400, 'That piece is the wrong size. Start the upload again.')
  const d = await db()
  let mime = row.mime
  if (n === 0) {
    try {
      mime = checkHead(row, bytes)
    } catch (e) {
      await removeUpload(row.id)
      throw e
    }
    await d.prepare('UPDATE uploads SET mime = ?2 WHERE id = ?1').bind(row.id, mime).run()
  }
  await d.prepare("INSERT OR REPLACE INTO uploads (id, user_id, kind, mime, size, data, created_at) VALUES (?1, ?2, 'chunk', ?3, ?4, ?5, ?6)").bind(`${row.id}.${n}`, userId, mime, bytes.length, toB64(bytes), nowSec()).run()
}

/** Closes an upload once every piece is there and adds up to the size that was promised. */
export async function finishBig(userId: string, id: string) {
  const row = await pending(userId, id)
  const pieces = piecesFor(row.size)
  const d = await db()
  const have = await d.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS bytes FROM uploads WHERE user_id = ?1 AND kind = 'chunk' AND id LIKE ?2").bind(userId, `${row.id}.%`).first<{ n: number; bytes: number }>()
  if (!have || have.n !== pieces || have.bytes !== row.size || row.mime === 'application/octet-stream') {
    await removeUpload(row.id)
    throw new HttpError(400, 'That upload did not arrive in full. Try again.')
  }
  await d.prepare('UPDATE uploads SET data = ?2 WHERE id = ?1').bind(row.id, `ch:${pieces}`).run()
  return row.id
}

export async function abortBig(userId: string, id: string) {
  const row = await pending(userId, id).catch(() => null)
  if (row) await removeUpload(row.id)
}

/** What a stored file is, as the serving routes need it. */
export type Stored = { id: string; mime: string; size: number; data: string }

/** The number of pieces if this row is a finished big file, otherwise 0. */
export const piecesOf = (data: string) => (/^ch:[1-9]\d*$/.test(data) ? Number(data.slice(3)) : 0)

/** The bytes from `start` to `end` (both included) of a big file, read piece by piece so only a piece is ever in memory. */
export function readRange(id: string, start: number, end: number): ReadableStream<Uint8Array> {
  const first = Math.floor(start / CHUNK)
  const last = Math.floor(end / CHUNK)
  let n = first
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (n > last) return controller.close()
      const row = await (await db()).prepare('SELECT data FROM uploads WHERE id = ?1').bind(`${id}.${n}`).first<{ data: string }>()
      if (!row) return controller.error(new Error('a piece is missing'))
      const bytes = b64ToBytes(row.data)
      const from = n === first ? start - first * CHUNK : 0
      const to = n === last ? end - last * CHUNK + 1 : bytes.length
      controller.enqueue(from === 0 && to === bytes.length ? bytes : bytes.subarray(from, to))
      n++
    },
  })
}
