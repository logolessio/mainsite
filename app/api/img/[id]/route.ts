import { db } from '@/lib/db'

/** Serves an uploaded avatar or banner. Only images we re-encoded ourselves are ever stored, and they are never run as pages. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('Not found', { status: 404 })
  const d = await db()
  const row = await d.prepare('SELECT mime, data FROM uploads WHERE id = ?1').bind(id).first<{ mime: string; data: string }>()
  if (!row) return new Response('Not found', { status: 404 })
  const bin = Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0))
  return new Response(bin, {
    headers: {
      'content-type': row.mime,
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
      'cross-origin-resource-policy': 'same-origin',
    },
  })
}
