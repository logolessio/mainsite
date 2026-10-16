import { lookById, lookSvg } from '@/lib/looks'

/** A ready-made look as a picture: ?kind=avatar (square, with the person's first letter in ?l=) or ?kind=banner. Open to everyone. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const look = lookById(id)
  if (!look) return new Response('Not found', { status: 404 })
  const url = new URL(req.url)
  const kind = url.searchParams.get('kind') === 'banner' ? 'banner' : 'avatar'
  return new Response(lookSvg(look, kind, url.searchParams.get('l') ?? undefined), {
    headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' },
  })
}
