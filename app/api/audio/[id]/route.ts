import { AUDIO_MIMES } from '@/lib/audio'
import { db } from '@/lib/db'

/** Plays a campaign's audio preview. Only files whose type we checked are stored, and they are never served as pages. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('Not found', { status: 404 })
  const d = await db()
  const row = await d.prepare("SELECT mime, data FROM uploads WHERE id = ?1 AND kind = 'audio'").bind(id).first<{ mime: string; data: string }>()
  if (!row || !(AUDIO_MIMES as readonly string[]).includes(row.mime)) return new Response('Not found', { status: 404 })
  const bin = Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0))
  return new Response(bin, {
    headers: {
      'content-type': row.mime,
      'content-length': String(bin.length),
      'accept-ranges': 'none',
      'cache-control': 'public, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      'content-security-policy': "default-src 'none'; sandbox",
      'cross-origin-resource-policy': 'same-origin',
    },
  })
}
