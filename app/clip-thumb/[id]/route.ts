import { db } from '@/lib/db'
import { FEED_VISIBLE, refreshClips } from '@/lib/clip-feed'
import { featureOn } from '@/lib/features'
import { route } from '@/lib/http'

/** Only the platforms' own picture servers are ever fetched from, whatever the stored address says. */
const IMAGE_HOSTS = /(^|\.)(tiktokcdn(-[a-z]+)?\.com|ibyteimg\.com|cdninstagram\.com|fbcdn\.net|twimg\.com|ytimg\.com|ggpht\.com)$/
const MAX = 4 * 1024 * 1024
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

type EdgeCache = { match(k: Request): Promise<Response | undefined>; put(k: Request, r: Response): Promise<void> }
const edge = () => (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches?.default ?? null

const nothing = () => new Response(null, { status: 404, headers: { 'cache-control': 'no-store' } })

async function stored(id: string) {
  const d = await db()
  return d
    .prepare(
      `SELECT m.thumb, m.fetched_at FROM submissions s JOIN users u ON u.id = s.user_id JOIN profiles p ON p.user_id = s.user_id JOIN clip_meta m ON m.submission_id = s.id
       WHERE s.id = ?1 AND ${FEED_VISIBLE}`,
    )
    .bind(id)
    .first<{ thumb: string | null; fetched_at: number }>()
}

async function pull(src: string | null | undefined): Promise<{ type: string; bytes: ArrayBuffer } | null> {
  if (!src) return null
  let u: URL
  try {
    u = new URL(src)
  } catch {
    return null
  }
  if (u.protocol !== 'https:' || !IMAGE_HOSTS.test(u.hostname)) return null
  try {
    const res = await fetch(u, { headers: { 'user-agent': UA, accept: 'image/avif,image/webp,image/*' }, signal: AbortSignal.timeout(8000) })
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !/^image\/(jpeg|png|webp|avif|gif|heic)/.test(type) || Number(res.headers.get('content-length') ?? 0) > MAX) return null
    const bytes = await res.arrayBuffer()
    return bytes.byteLength > MAX ? null : { type, bytes }
  } catch {
    return null
  }
}

/**
 * A clip's picture, fetched from TikTok, Instagram or X and served from our own address. Their picture links expire and refuse to show
 * on other sites, so they cannot be used directly. Pictures are kept in Cloudflare's cache and the browser for a day. (It lives outside
 * /api because every /api answer is marked never-store in next.config.mjs.)
 */
export const GET = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  if (!(await featureOn('submissions-feed'))) return nothing()
  const { id } = await ctx.params
  if (!/^[\w-]{6,64}$/.test(id)) return nothing()
  const cache = edge()
  const key = new Request(new URL(req.url).toString())
  const hit = await cache?.match(key).catch(() => undefined)
  if (hit) return hit

  let row = await stored(id)
  if (!row) return nothing()
  let img = await pull(row.thumb)
  if (!img) {
    // most often an expired TikTok link: ask the platform for a new one, once
    await refreshClips([id], null, true)
    row = await stored(id)
    img = await pull(row?.thumb)
  }
  if (!img) return nothing()
  const res = new Response(img.bytes, { headers: { 'content-type': img.type, 'cache-control': 'public, max-age=86400, stale-while-revalidate=604800', 'x-content-type-options': 'nosniff' } })
  if (cache) await cache.put(key, res.clone()).catch(() => undefined)
  return res
})
