/**
 * What the platform itself says about a submitted video, for the submissions channel: its title, the account that posted it, a
 * still, and the public numbers (views, likes, comments, shares). Only public pages and APIs are read, nothing is posted.
 *  - YouTube: the official Data API when a YOUTUBE_API_KEY is set, otherwise the public oEmbed and the still image
 *  - TikTok: the public oEmbed (title, account, still) and the public video page (the numbers)
 *  - Instagram only shares any of this with the creator's login, so only the link is shown
 * Everything is optional: a platform that does not answer simply leaves the field out. Nothing here reads the database.
 */
export type VideoInfo = {
  title?: string
  author?: string
  authorUrl?: string
  thumb?: string
  views?: number
  likes?: number
  comments?: number
  shares?: number
  postedAt?: number
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
const n = (v: unknown): number | undefined => {
  const x = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : NaN
  return Number.isFinite(x) && x >= 0 ? Math.floor(x) : undefined
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

async function getJson<T>(url: string, ms = 6000): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json' }, signal: AbortSignal.timeout(ms) })
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

type OEmbed = { title?: string; author_name?: string; author_url?: string; thumbnail_url?: string }

async function youtube(url: string, apiKey?: string): Promise<VideoInfo> {
  const id = youtubeId(url)
  if (!id) return {}
  const still = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  if (apiKey) {
    const j = await getJson<{ items?: { snippet?: { title?: string; channelTitle?: string; channelId?: string; publishedAt?: string }; statistics?: { viewCount?: string; likeCount?: string; commentCount?: string } }[] }>(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${encodeURIComponent(id)}&key=${encodeURIComponent(apiKey)}`,
    )
    const it = j?.items?.[0]
    if (it) {
      const at = it.snippet?.publishedAt ? Date.parse(it.snippet.publishedAt) : NaN
      return {
        title: it.snippet?.title,
        author: it.snippet?.channelTitle,
        authorUrl: it.snippet?.channelId ? `https://www.youtube.com/channel/${it.snippet.channelId}` : undefined,
        thumb: still,
        views: n(it.statistics?.viewCount),
        likes: n(it.statistics?.likeCount),
        comments: n(it.statistics?.commentCount),
        postedAt: Number.isFinite(at) ? Math.floor(at / 1000) : undefined,
      }
    }
  }
  const o = await getJson<OEmbed>(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`)
  return { title: o?.title, author: o?.author_name, authorUrl: o?.author_url, thumb: still }
}

async function tiktok(url: string): Promise<VideoInfo> {
  const [o, page] = await Promise.all([
    getJson<OEmbed>(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`),
    (async () => {
      try {
        const res = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' }, redirect: 'follow', signal: AbortSignal.timeout(7000) })
        return res.ok ? await res.text() : ''
      } catch {
        return ''
      }
    })(),
  ])
  const out: VideoInfo = { title: o?.title || undefined, author: o?.author_name, authorUrl: o?.author_url, thumb: o?.thumbnail_url }
  const data = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/.exec(page)?.[1]
  if (data) {
    try {
      const scope = JSON.parse(data) as { __DEFAULT_SCOPE__?: Record<string, { itemInfo?: { itemStruct?: { createTime?: string; stats?: Record<string, number> } } }> }
      const item = scope.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct
      if (item?.stats) {
        out.views = n(item.stats.playCount)
        out.likes = n(item.stats.diggCount)
        out.comments = n(item.stats.commentCount)
        out.shares = n(item.stats.shareCount)
        out.postedAt = n(item.createTime)
      }
    } catch {
      /* the numbers are optional */
    }
  }
  if (out.views === undefined) out.views = n(/"playCount":(\d+)/.exec(page)?.[1])
  return out
}

/** Never throws. Gives up on a platform after a few seconds. */
export async function videoInfo(platform: string, url: string, opts: { youtubeKey?: string } = {}): Promise<VideoInfo> {
  try {
    if (platform === 'youtube') return await youtube(url, opts.youtubeKey)
    if (platform === 'tiktok') return await tiktok(url)
  } catch {
    /* fall through */
  }
  return {}
}
