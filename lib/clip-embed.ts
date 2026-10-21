// Reading a clip's link: which post it is, and the address of the platform's own player for it. Safe for the browser: no secrets.

export type ClipPlatform = 'tiktok' | 'youtube' | 'instagram' | 'x'
export const CLIP_PLATFORMS: { id: ClipPlatform; label: string }[] = [
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'x', label: 'X' },
]
export const isClipPlatform = (p: string): p is ClipPlatform => CLIP_PLATFORMS.some((c) => c.id === p)

const parse = (raw: string) => {
  try {
    return new URL(raw)
  } catch {
    return null
  }
}

/** The id the platform's player needs, read from the link alone. Null when the link does not carry it (a TikTok short link, say). */
export function postId(platform: string, raw: string): string | null {
  const u = parse(raw)
  if (!u) return null
  if (platform === 'youtube') {
    if (u.hostname.includes('youtu.be')) return /^[\w-]{6,}$/.exec(u.pathname.split('/')[1] ?? '')?.[0] ?? null
    return u.searchParams.get('v') ?? /\/(?:shorts|live|embed)\/([\w-]{6,})/.exec(u.pathname)?.[1] ?? null
  }
  if (platform === 'tiktok') return /\/(?:video|photo)\/(\d{6,})/.exec(u.pathname)?.[1] ?? null
  if (platform === 'instagram') return /\/(?:p|reel|reels|tv)\/([\w-]{5,})/.exec(u.pathname)?.[1] ?? null
  if (platform === 'x') return /\/status(?:es)?\/(\d{1,25})/.exec(u.pathname)?.[1] ?? null
  return null
}

/** Is the post shaped like a phone video (TikTok, Reels, Shorts) or like a wide one? */
export function isTall(platform: string, raw: string) {
  if (platform === 'youtube') return /\/shorts\//.test(raw)
  return platform === 'tiktok' || platform === 'instagram'
}

/** The platform's own player, ready to play. Every one of these hosts is allowed in the site's frame rules (next.config.mjs). */
export function embedSrc(platform: string, id: string | null, raw: string): string | null {
  if (!id) return null
  const e = encodeURIComponent(id)
  if (platform === 'youtube') return `https://www.youtube-nocookie.com/embed/${e}?autoplay=1&playsinline=1&rel=0&modestbranding=1`
  if (platform === 'tiktok') return `https://www.tiktok.com/player/v1/${e}?autoplay=1&loop=1&rel=0&description=1&music_info=1`
  if (platform === 'instagram') return `https://www.instagram.com/${/\/reels?\//.test(raw) ? 'reel' : 'p'}/${e}/embed/captioned/`
  if (platform === 'x') return `https://platform.twitter.com/embed/Tweet.html?id=${e}&theme=dark&dnt=true`
  return null
}
