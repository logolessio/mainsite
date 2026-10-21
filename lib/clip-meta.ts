import { postId, type ClipPlatform } from './clip-embed'

/**
 * What a platform says about a posted clip: its picture, title, who posted it, and its public numbers. Only oEmbed, public pages and
 * public endpoints are read, nothing is posted, and nothing needs the clipper's login. Each platform gives what it gives:
 *
 *  - YouTube   oEmbed for the title and picture. Views, likes, comments and the date from the YouTube Data API when YOUTUBE_API_KEY
 *              is set; without it, views, likes and the date are read from the public watch page (no comment count).
 *  - TikTok    oEmbed for the title and player id, and the public video page for views, likes, comments, the date and the picture.
 *              TikTok has no key to add for this.
 *  - Instagram With META_APP_ID and META_CLIENT_TOKEN set, Meta's oEmbed for the picture and author. Without them (or as well), the
 *              public post page's preview tags, which carry likes, comments, author and date. Instagram never shows views publicly.
 *  - X         X's public embed data for likes, replies, the date and the picture. Views only with an X_BEARER_TOKEN (X API, paid plan).
 *
 * Nothing here reads the database, so it can be tested on its own. Every call gives up after a few seconds.
 */
export type ClipMeta = {
  ok: boolean
  gone: boolean
  embedId: string | null
  thumb: string | null
  title: string | null
  author: string | null
  views: number | null
  likes: number | null
  comments: number | null
  postedAt: number | null
}

export type MetaKeys = { youtube?: string; metaAppId?: string; metaClientToken?: string; xBearer?: string }

const BROWSER = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
// An honest name for the pages that answer link-preview robots with their preview tags (Instagram does).
const BOT = 'Mozilla/5.0 (compatible; logolessbot/1.0; +https://logoless.io)'
const TIMEOUT = 6000

const blank = (embedId: string | null): ClipMeta => ({ ok: false, gone: false, embedId, thumb: null, title: null, author: null, views: null, likes: null, comments: null, postedAt: null })

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(/,/g, '')) : typeof v === 'number' ? v : NaN
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : null
}
const secs = (s: string | null | undefined) => {
  const t = s ? Date.parse(s) : NaN
  return Number.isFinite(t) ? Math.floor(t / 1000) : null
}
const text = (s: unknown, max = 160) => (typeof s === 'string' && s.trim() ? s.replace(/\s+/g, ' ').trim().slice(0, max) : null)
const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
/** "1.2M", "4K", "60,123": the short counts pages print, as a number. */
function shortCount(s: string | undefined): number | null {
  if (!s) return null
  const m = /^([\d.,]+)\s*([KMB])?$/i.exec(s.trim())
  if (!m) return null
  const base = Number(m[1].replace(/,/g, ''))
  const mult = { k: 1e3, m: 1e6, b: 1e9 }[(m[2] ?? '').toLowerCase() as 'k' | 'm' | 'b'] ?? 1
  return Number.isFinite(base) ? Math.round(base * mult) : null
}

async function getJson<T>(url: string, init: RequestInit = {}): Promise<{ status: number; data: T | null }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT) })
  if (!res.ok) return { status: res.status, data: null }
  try {
    return { status: res.status, data: (await res.json()) as T }
  } catch {
    return { status: res.status, data: null }
  }
}

async function getText(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT) })
  return { status: res.status, html: res.ok ? await res.text() : '' }
}

async function youtube(url: string, keys: MetaKeys): Promise<ClipMeta> {
  const id = postId('youtube', url)
  const m = blank(id)
  if (!id) return m
  m.thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  const watch = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`
  const [oembed, stats] = await Promise.allSettled([
    getJson<{ title?: string; author_name?: string }>(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`),
    keys.youtube
      ? getJson<{ items?: { statistics?: Record<string, string>; snippet?: { publishedAt?: string; title?: string; channelTitle?: string; thumbnails?: Record<string, { url?: string }> } }[] }>(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${encodeURIComponent(id)}&key=${encodeURIComponent(keys.youtube)}`,
        )
      : getText(`${watch}&hl=en`, { 'user-agent': BROWSER, 'accept-language': 'en-US,en;q=0.9', cookie: 'CONSENT=YES+1; SOCS=CAI' }),
  ])
  if (oembed.status === 'fulfilled') {
    if (oembed.value.data) {
      m.ok = true
      m.title = text(oembed.value.data.title)
      m.author = text(oembed.value.data.author_name, 80)
    } else if (oembed.value.status === 404 || oembed.value.status === 401) m.gone = true // 401: private or embedding switched off
  }
  if (stats.status === 'fulfilled') {
    const v = stats.value
    if ('data' in v) {
      const item = v.data?.items?.[0]
      if (item) {
        m.ok = true
        m.gone = false
        m.views = num(item.statistics?.viewCount)
        m.likes = num(item.statistics?.likeCount)
        m.comments = num(item.statistics?.commentCount)
        m.postedAt = secs(item.snippet?.publishedAt)
        m.title ??= text(item.snippet?.title)
        m.author ??= text(item.snippet?.channelTitle, 80)
        m.thumb = item.snippet?.thumbnails?.high?.url ?? m.thumb
      } else if (v.data) m.gone = true
    } else if (v.html) {
      m.views = num(/"viewCount":"(\d+)"/.exec(v.html)?.[1])
      m.likes = num(/"likeCount":"(\d+)"/.exec(v.html)?.[1]) ?? num(/"likeCountIfLikedNumber":"(\d+)"/.exec(v.html)?.[1])
      m.postedAt = secs(/"publishDate":"([^"]+)"/.exec(v.html)?.[1])
      if (m.views !== null) m.ok = true
    }
  }
  return m
}

type TikTokItem = { id?: string; desc?: string; createTime?: string | number; author?: { uniqueId?: string; nickname?: string }; video?: { cover?: string; originCover?: string; dynamicCover?: string }; stats?: { playCount?: number; diggCount?: number; commentCount?: number } }

async function tiktok(url: string): Promise<ClipMeta> {
  const m = blank(postId('tiktok', url))
  const [oembed, page, preview] = await Promise.allSettled([
    getJson<{ title?: string; author_name?: string; thumbnail_url?: string; embed_product_id?: string }>(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`),
    getText(url, { 'user-agent': BROWSER, 'accept-language': 'en-US,en;q=0.9' }),
    // the same page as link previews see it: TikTok sends these robots the picture and the poster's name even when it sends a person to the log in page
    getText(url, { 'user-agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'accept-language': 'en-US,en;q=0.9' }),
  ])
  if (oembed.status === 'fulfilled') {
    const o = oembed.value.data
    if (o) {
      m.embedId = o.embed_product_id ?? m.embedId
      m.title = text(o.title)
      m.author = text(o.author_name, 80)
      m.thumb = o.thumbnail_url ?? null
      if (m.embedId) m.ok = true
    } else if (oembed.value.status === 400 || oembed.value.status === 404) m.gone = true
  }
  if (page.status === 'fulfilled' && page.value.html) {
    const data = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/.exec(page.value.html)?.[1]
    try {
      const scope = data ? (JSON.parse(data) as { __DEFAULT_SCOPE__?: Record<string, { itemInfo?: { itemStruct?: TikTokItem }; statusCode?: number }> }) : null
      const detail = scope?.__DEFAULT_SCOPE__?.['webapp.video-detail']
      const item = detail?.itemInfo?.itemStruct
      if (item?.stats) {
        m.ok = true
        m.gone = false
        m.embedId ??= item.id ?? null
        m.views = num(item.stats.playCount)
        m.likes = num(item.stats.diggCount)
        m.comments = num(item.stats.commentCount)
        m.postedAt = num(item.createTime)
        m.title ??= text(item.desc)
        m.author ??= text(item.author?.nickname ?? item.author?.uniqueId, 80)
        m.thumb ??= item.video?.originCover ?? item.video?.cover ?? null
      } else if (detail?.statusCode && detail.statusCode !== 0 && !m.ok) m.gone = true
    } catch {
      /* TikTok changed its page; the oEmbed answer is still used */
    }
  } else if (page.status === 'fulfilled' && page.value.status === 404) m.gone = true
  // a thumbnail and the poster's name, when nothing else gave them
  if (!m.thumb && preview.status === 'fulfilled' && preview.value.html) {
    const og = (prop: string) => new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]*)"`, 'i').exec(preview.value.html)?.[1]
    const img = og('og:image')
    if (img) {
      m.thumb = decode(img)
      m.ok = true
      m.gone = false
    }
    const who = /^TikTok\s*[·|-]\s*(.+)$/.exec(decode(og('og:title') ?? ''))?.[1]
    if (who && !m.author) m.author = text(who, 80)
  }
  return m
}

async function instagram(url: string, keys: MetaKeys): Promise<ClipMeta> {
  const code = postId('instagram', url)
  const m = blank(code)
  if (!code) return m
  const clean = `https://www.instagram.com/${/\/reels?\//.test(url) ? 'reel' : 'p'}/${code}/`
  if (keys.metaAppId && keys.metaClientToken) {
    try {
      const r = await getJson<{ thumbnail_url?: string; author_name?: string; title?: string }>(
        `https://graph.facebook.com/v22.0/instagram_oembed?omitscript=true&url=${encodeURIComponent(clean)}&access_token=${encodeURIComponent(`${keys.metaAppId}|${keys.metaClientToken}`)}`,
      )
      if (r.data) {
        m.ok = true
        m.thumb = r.data.thumbnail_url ?? null
        m.author = text(r.data.author_name, 80)
        m.title = text(r.data.title)
      }
    } catch {
      /* falls back to the public page below */
    }
  }
  try {
    const { status, html } = await getText(clean, { 'user-agent': BOT, 'accept-language': 'en-US,en;q=0.9' })
    if (status === 404) m.gone = !m.ok
    const tag = (p: string) => {
      const raw = new RegExp(`<meta (?:property|name)="${p}" content="([^"]*)"`).exec(html)?.[1]
      return raw ? decode(raw) : undefined
    }
    // "60M likes, 4M comments - world_record_egg on January 4, 2019: "the caption""
    const d = tag('description') ?? tag('og:description')
    const line = d ? /^([\d.,]+[KMB]?) likes?, ([\d.,]+[KMB]?) comments? - ([\w.]+) on ([A-Z][a-z]+ \d{1,2}, \d{4})/i.exec(d) : null
    if (line) {
      m.ok = true
      m.likes = shortCount(line[1])
      m.comments = shortCount(line[2])
      m.author ??= line[3]
      m.postedAt = secs(`${line[4]} 12:00 UTC`)
    }
    const caption = d ? /\d{4}: [“"]([\s\S]*?)[”"]?\.?\s*$/.exec(d)?.[1] : undefined
    m.title ??= text(caption)
    const img = tag('og:image')
    if (img) {
      m.ok = true
      m.thumb ??= img
    }
  } catch {
    /* Instagram did not answer; whatever oEmbed gave is kept */
  }
  return m
}

/** The token X's own embed code uses to read a post's public data. */
const xToken = (id: string) => ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '')

type XTweet = { text?: string; created_at?: string; favorite_count?: number; conversation_count?: number; user?: { name?: string; screen_name?: string }; mediaDetails?: { media_url_https?: string }[]; video?: { poster?: string }; tombstone?: unknown }

async function x(url: string, keys: MetaKeys): Promise<ClipMeta> {
  const id = postId('x', url)
  const m = blank(id)
  if (!id) return m
  try {
    const r = await getJson<XTweet>(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&lang=en&token=${xToken(id)}`)
    const t = r.data
    if (t && !t.tombstone && (t.text !== undefined || t.user)) {
      m.ok = true
      m.title = text(t.text)
      m.author = text(t.user?.name ?? t.user?.screen_name, 80)
      m.likes = num(t.favorite_count)
      m.comments = num(t.conversation_count)
      m.postedAt = secs(t.created_at)
      m.thumb = t.video?.poster ?? t.mediaDetails?.[0]?.media_url_https ?? null
    } else if (r.status === 404 || t?.tombstone) m.gone = true
  } catch {
    /* X did not answer */
  }
  if (keys.xBearer) {
    try {
      const r = await getJson<{ data?: { public_metrics?: { impression_count?: number; like_count?: number; reply_count?: number }; created_at?: string } }>(
        `https://api.x.com/2/tweets/${id}?tweet.fields=public_metrics,created_at`,
        { headers: { authorization: `Bearer ${keys.xBearer}` } },
      )
      const pm = r.data?.data?.public_metrics
      if (pm) {
        m.ok = true
        m.views = num(pm.impression_count)
        m.likes ??= num(pm.like_count)
        m.comments ??= num(pm.reply_count)
        m.postedAt ??= secs(r.data?.data?.created_at)
      }
    } catch {
      /* views stay unknown */
    }
  }
  return m
}

async function read(platform: string, url: string, keys: MetaKeys): Promise<ClipMeta> {
  if (platform === 'youtube') return youtube(url, keys)
  if (platform === 'tiktok') return tiktok(url)
  if (platform === 'instagram') return instagram(url, keys)
  if (platform === 'x') return x(url, keys)
  return blank(postId(platform as ClipPlatform, url))
}

export async function fetchClipMeta(platform: string, url: string, keys: MetaKeys = {}): Promise<ClipMeta> {
  try {
    const m = await read(platform, url, keys)
    // it only counts as an answer when something worth showing came back (a platform that rate-limits us is asked again sooner)
    m.ok = !m.gone && Boolean(m.thumb || m.title || m.views !== null || m.likes !== null)
    return m
  } catch {
    /* a platform that is down never breaks the page */
    return blank(postId(platform as ClipPlatform, url))
  }
}
