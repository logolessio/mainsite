/**
 * Looking up the public view count of a submitted link. Only public pages and APIs are read, nothing is posted, and nothing needs
 * the creator's login. What is supported:
 *  - YouTube: the official YouTube Data API when a YOUTUBE_API_KEY is set, otherwise the public watch page
 *  - TikTok: the public video page
 *  - Instagram does not let anyone look views up without the creator's login, so those stay with our team
 * Nothing here reads the database, so it can be tested on its own.
 */
export type Platform = 'tiktok' | 'youtube' | 'instagram'

export type Lookup =
  | { ok: true; views: number; postedAt: number | null }
  /** gone: the video is not there any more (deleted or private). unsupported: this platform cannot be looked up. */
  | { ok: false; gone: boolean; unsupported?: boolean; why: string }

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}

export function youtubeId(raw: string): string | null {
  try {
    const u = new URL(raw)
    if (u.hostname.includes('youtu.be')) return u.pathname.split('/')[1] || null
    return u.searchParams.get('v') ?? /\/(?:shorts|live|embed)\/([\w-]{6,})/.exec(u.pathname)?.[1] ?? null
  } catch {
    return null
  }
}

async function youtube(raw: string, apiKey?: string): Promise<Lookup> {
  const id = youtubeId(raw)
  if (!id) return { ok: false, gone: false, why: 'could not read the video id' }
  try {
    if (apiKey) {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${encodeURIComponent(id)}&key=${encodeURIComponent(apiKey)}`, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) return { ok: false, gone: false, why: `YouTube answered ${res.status}` }
      const j = (await res.json()) as { items?: { statistics?: { viewCount?: string }; snippet?: { publishedAt?: string } }[] }
      const item = j.items?.[0]
      if (!item) return { ok: false, gone: true, why: 'the video is private or removed' }
      const views = num(item.statistics?.viewCount)
      if (views === null) return { ok: false, gone: false, why: 'YouTube did not give a view count' }
      const at = item.snippet?.publishedAt ? Date.parse(item.snippet.publishedAt) : NaN
      return { ok: true, views, postedAt: Number.isFinite(at) ? Math.floor(at / 1000) : null }
    }
    const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}&hl=en`, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9', cookie: 'CONSENT=YES+1; SOCS=CAI' }, signal: AbortSignal.timeout(9000) })
    if (res.status === 404) return { ok: false, gone: true, why: 'the video was not found' }
    if (!res.ok) return { ok: false, gone: false, why: `YouTube answered ${res.status}` }
    const html = await res.text()
    if (/"playabilityStatus":\{"status":"(ERROR|LOGIN_REQUIRED|UNPLAYABLE)"/.test(html) && !/"viewCount":"\d+"/.test(html)) return { ok: false, gone: true, why: 'the video is private or removed' }
    const views = num(/"viewCount":"(\d+)"/.exec(html)?.[1])
    if (views === null) return { ok: false, gone: false, why: 'could not read the view count' }
    const at = /"publishDate":"([^"]+)"/.exec(html)?.[1]
    const t = at ? Date.parse(at) : NaN
    return { ok: true, views, postedAt: Number.isFinite(t) ? Math.floor(t / 1000) : null }
  } catch {
    return { ok: false, gone: false, why: 'could not reach YouTube' }
  }
}

async function tiktok(raw: string): Promise<Lookup> {
  try {
    const res = await fetch(raw, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(9000) })
    if (res.status === 404) return { ok: false, gone: true, why: 'the video was not found' }
    if (!res.ok) return { ok: false, gone: false, why: `TikTok answered ${res.status}` }
    const html = await res.text()
    const data = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1]
    if (data) {
      try {
        const scope = JSON.parse(data) as { __DEFAULT_SCOPE__?: Record<string, { itemInfo?: { itemStruct?: { createTime?: string; stats?: { playCount?: number } } }; statusCode?: number }> }
        const detail = scope.__DEFAULT_SCOPE__?.['webapp.video-detail']
        const item = detail?.itemInfo?.itemStruct
        const views = num(item?.stats?.playCount)
        if (views !== null) return { ok: true, views, postedAt: num(item?.createTime) }
        if (detail && detail.statusCode && detail.statusCode !== 0) return { ok: false, gone: true, why: 'the video is private or removed' }
      } catch {
        /* fall through to the plain search below */
      }
    }
    const views = num(/"playCount":(\d+)/.exec(html)?.[1])
    return views === null ? { ok: false, gone: false, why: 'could not read the view count' } : { ok: true, views, postedAt: null }
  } catch {
    return { ok: false, gone: false, why: 'could not reach TikTok' }
  }
}

export async function lookupViews(platform: string, url: string, opts: { youtubeKey?: string } = {}): Promise<Lookup> {
  if (platform === 'youtube') return youtube(url, opts.youtubeKey)
  if (platform === 'tiktok') return tiktok(url)
  return { ok: false, gone: false, unsupported: true, why: 'this platform cannot be looked up automatically' }
}
