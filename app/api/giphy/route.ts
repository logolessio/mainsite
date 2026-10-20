import { setting } from '@/lib/db'
import { protect } from '@/lib/guard'
import { json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/**
 * The GIF library for profile pictures, banners and backgrounds. The browser never sees the GIPHY key: it asks here,
 * and this asks GIPHY. Without a GIPHY_API_KEY secret the library simply says it is not switched on yet.
 * Answers are kept for an hour (GIPHY limits how often a key may ask), and only the few fields the picker needs are sent on.
 */
type GiphyImage = { url?: string; width?: string; height?: string; mp4?: string; webp?: string }
type GiphyItem = { id: string; title?: string; images?: Record<string, GiphyImage> }

const CACHE_SECONDS = 3600
/** Only GIPHY's own picture addresses are passed on. */
const giphyUrl = (v?: string) => (v && /^https:\/\/media\d?\.giphy\.com\/[^\s"'<>]+$/.test(v) ? v : '')
const mem = new Map<string, { at: number; body: unknown }>()

export const GET = route(async (req: Request) => {
  const user = await requireUser()
  const key = await setting('GIPHY_API_KEY')
  if (!key) return json({ enabled: false, results: [] })
  await protect(req, { name: 'giphy', max: 90, windowSec: 600, userId: user.id })

  const u = new URL(req.url)
  const q = (u.searchParams.get('q') ?? '').replace(/[^\p{L}\p{N} '_-]/gu, '').trim().slice(0, 50)
  const kind = u.searchParams.get('kind') === 'stickers' ? 'stickers' : 'gifs'
  const offset = Math.min(450, Math.max(0, Number(u.searchParams.get('offset')) || 0))
  const cacheKey = `${kind}|${q.toLowerCase()}|${offset}`
  const hit = mem.get(cacheKey)
  if (hit && Date.now() - hit.at < CACHE_SECONDS * 1000) return json(hit.body)

  const api = new URL(`https://api.giphy.com/v1/${kind}/${q ? 'search' : 'trending'}`)
  api.searchParams.set('api_key', key)
  api.searchParams.set('limit', '24')
  api.searchParams.set('offset', String(offset))
  api.searchParams.set('rating', 'pg-13')
  api.searchParams.set('bundle', 'messaging_non_clips')
  if (q) api.searchParams.set('q', q)
  const res = await fetch(api, { cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true } } as RequestInit).catch(() => null)
  if (!res?.ok) return json({ enabled: true, results: [], error: 'GIPHY did not answer. Please try again in a moment.' })
  const j = (await res.json().catch(() => ({}))) as { data?: GiphyItem[]; pagination?: { total_count?: number } }
  const body = {
    enabled: true,
    results: (j.data ?? [])
      .filter((g) => /^[A-Za-z0-9]{4,40}$/.test(g.id))
      .map((g) => {
        const small = g.images?.fixed_width_small ?? g.images?.fixed_width ?? {}
        return { id: g.id, title: (g.title ?? '').slice(0, 80), w: Number(small.width) || 100, h: Number(small.height) || 100, preview: giphyUrl(small.webp) || giphyUrl(small.url) }
      })
      .filter((g) => g.preview),
    next: offset + 24 < Math.min(500, j.pagination?.total_count ?? 0) ? offset + 24 : null,
  }
  if (mem.size > 200) mem.clear()
  mem.set(cacheKey, { at: Date.now(), body })
  return json(body)
})
