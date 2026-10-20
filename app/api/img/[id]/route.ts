import { db } from '@/lib/db'

/**
 * Serves an uploaded avatar, banner, background or background video. Only images we re-encoded ourselves and videos
 * whose real file type was checked are ever stored, and nothing is ever run as a page. Videos answer byte ranges,
 * because Safari will not play a video without them.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('Not found', { status: 404 })
  const d = await db()
  const row = await d.prepare('SELECT mime, data FROM uploads WHERE id = ?1').bind(id).first<{ mime: string; data: string }>()
  if (!row) return new Response('Not found', { status: 404 })
  const bin = Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0))
  const headers: Record<string, string> = {
    'content-type': row.mime,
    'cache-control': 'public, max-age=31536000, immutable',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'; sandbox",
    'cross-origin-resource-policy': 'same-origin',
  }
  if (!row.mime.startsWith('video/')) return new Response(bin, { headers })
  headers['accept-ranges'] = 'bytes'
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '')
  if (!range) return new Response(bin, { headers: { ...headers, 'content-length': String(bin.length) } })
  let start = range[1] ? Number(range[1]) : bin.length - Number(range[2] || 0)
  let end = range[1] && range[2] ? Number(range[2]) : bin.length - 1
  start = Math.max(0, start)
  end = Math.min(bin.length - 1, end)
  if (start > end) return new Response(null, { status: 416, headers: { ...headers, 'content-range': `bytes */${bin.length}` } })
  return new Response(bin.slice(start, end + 1), {
    status: 206,
    headers: { ...headers, 'content-range': `bytes ${start}-${end}/${bin.length}`, 'content-length': String(end - start + 1) },
  })
}
