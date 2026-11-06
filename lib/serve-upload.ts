import { piecesOf, readRange } from './chunks'
import { b64ToBytes } from './upload'

type Row = { id: string; mime: string; size: number; data: string }

const BASE = {
  'cache-control': 'public, max-age=31536000, immutable',
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'none'; sandbox",
  'cross-origin-resource-policy': 'same-origin',
}

/**
 * Sends a stored file. A small one is one row of base64; a big one (lib/chunks.ts) is read piece by piece. Songs and videos answer byte ranges, because
 * Safari will not play them without, and it is what lets a song be skipped through.
 */
export function serveUpload(req: Request, row: Row): Response {
  const ranged = row.mime.startsWith('video/') || row.mime.startsWith('audio/')
  const pieces = piecesOf(row.data)
  if (row.data.startsWith('ch:') && !pieces) return new Response('Not found', { status: 404 }) // still arriving
  if (row.data.startsWith('bh:')) return new Response('Not found', { status: 404 }) // a hosted download, not a page file
  const size = pieces ? row.size : undefined
  const bytes = pieces ? null : b64ToBytes(row.data)
  const total = size ?? bytes!.length
  const headers: Record<string, string> = { ...BASE, 'content-type': row.mime }
  if (ranged) headers['accept-ranges'] = 'bytes'

  const range = ranged ? /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '') : null
  let start = 0
  let end = total - 1
  let status = 200
  if (range && (range[1] || range[2])) {
    start = range[1] ? Number(range[1]) : total - Number(range[2] || 0)
    end = range[1] && range[2] ? Number(range[2]) : total - 1
    start = Math.max(0, start)
    end = Math.min(total - 1, end)
    if (start > end) return new Response(null, { status: 416, headers: { ...headers, 'content-range': `bytes */${total}` } })
    status = 206
    headers['content-range'] = `bytes ${start}-${end}/${total}`
  }
  headers['content-length'] = String(end - start + 1)
  if (bytes) return new Response(status === 206 ? bytes.slice(start, end + 1) : bytes, { status, headers })
  return new Response(readRange(row.id, start, end), { status, headers })
}
