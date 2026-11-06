import { db } from '@/lib/db'
import { serveUpload } from '@/lib/serve-upload'

/**
 * Serves an uploaded avatar, banner, background, GIF or background video. Only images we re-encoded ourselves, GIFs and videos whose real file type was
 * checked are ever stored, and nothing is ever run as a page. Videos answer byte ranges, because Safari will not play a video without them.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('Not found', { status: 404 })
  const d = await db()
  const row = await d.prepare("SELECT id, mime, size, data FROM uploads WHERE id = ?1 AND kind != 'chunk'").bind(id).first<{ id: string; mime: string; size: number; data: string }>()
  if (!row) return new Response('Not found', { status: 404 })
  return serveUpload(req, row)
}
