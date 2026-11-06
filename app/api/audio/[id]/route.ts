import { AUDIO_MIMES } from '@/lib/audio'
import { db } from '@/lib/db'
import { serveUpload } from '@/lib/serve-upload'

/** Plays an uploaded song. Only files whose type we checked are stored, and they are never served as pages. Byte ranges are answered so it can be skipped through. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('Not found', { status: 404 })
  const d = await db()
  const row = await d.prepare("SELECT id, mime, size, data FROM uploads WHERE id = ?1 AND kind = 'audio'").bind(id).first<{ id: string; mime: string; size: number; data: string }>()
  if (!row || !(AUDIO_MIMES as readonly string[]).includes(row.mime)) return new Response('Not found', { status: 404 })
  return serveUpload(req, row)
}
