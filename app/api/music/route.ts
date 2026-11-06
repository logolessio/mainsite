import { limit } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/**
 * Finds a song and its details (cover, title, artist, album, a 30 second preview) so a person can pick one instead of typing it in.
 *  GET /api/music?q=blinding lights   searches Apple's public song search
 *  GET /api/music?url=<a song link>   reads the details of a link from Spotify, SoundCloud, YouTube, Deezer or Apple Music
 * Only signed-in people can ask, and only a few times a minute, so this is not an open proxy.
 */
type Song = { title: string; artist: string; album: string; cover: string; preview: string; url: string }

const https = (v: unknown) => (typeof v === 'string' && /^https:\/\//i.test(v) && v.length < 600 ? v : '')
const clip = (v: unknown, n = 90) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n) : '')
const art = (u: unknown) => https(typeof u === 'string' ? u.replace(/\/\d+x\d+(bb)?\.(jpg|png|webp)$/i, '/600x600bb.$2') : '')

type Apple = { trackName?: string; artistName?: string; collectionName?: string; artworkUrl100?: string; previewUrl?: string; trackViewUrl?: string; collectionViewUrl?: string; wrapperType?: string }
const fromApple = (r: Apple): Song => ({ title: clip(r.trackName ?? r.collectionName), artist: clip(r.artistName), album: clip(r.collectionName), cover: art(r.artworkUrl100), preview: https(r.previewUrl), url: https(r.trackViewUrl ?? r.collectionViewUrl) })

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(7000), headers: { accept: 'application/json' } })
  if (!res.ok) throw new HttpError(404, "couldn't find that one.")
  return (await res.json()) as T
}

async function byLink(raw: string): Promise<Song> {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    throw new HttpError(400, 'That is not a link.')
  }
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '')
  const link = u.toString()
  if (host === 'open.spotify.com') {
    const j = await get<{ title?: string; thumbnail_url?: string }>(`https://open.spotify.com/oembed?url=${encodeURIComponent(link)}`)
    return { title: clip(j.title), artist: '', album: '', cover: https(j.thumbnail_url), preview: '', url: link }
  }
  if (host === 'soundcloud.com') {
    const j = await get<{ title?: string; author_name?: string; thumbnail_url?: string }>(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(link)}`)
    return { title: clip(j.title), artist: clip(j.author_name), album: '', cover: https(j.thumbnail_url), preview: '', url: link }
  }
  if (host === 'youtube.com' || host === 'youtu.be') {
    const j = await get<{ title?: string; author_name?: string; thumbnail_url?: string }>(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link)}`)
    return { title: clip(j.title), artist: clip(j.author_name).replace(/ - Topic$/, ''), album: '', cover: https(j.thumbnail_url), preview: '', url: link }
  }
  if (host === 'deezer.com') {
    const m = /\/(track|album)\/(\d{3,15})/.exec(u.pathname)
    if (!m) throw new HttpError(404, "couldn't find that one.")
    const j = await get<{ title?: string; artist?: { name?: string }; album?: { title?: string; cover_xl?: string }; cover_xl?: string; preview?: string }>(`https://api.deezer.com/${m[1]}/${m[2]}`)
    return { title: clip(j.title), artist: clip(j.artist?.name), album: clip(j.album?.title ?? (m[1] === 'album' ? j.title : '')), cover: https(j.album?.cover_xl ?? j.cover_xl), preview: https(j.preview), url: link }
  }
  if (host === 'apple.com' && u.hostname.toLowerCase().startsWith('music.')) {
    const track = u.searchParams.get('i') ?? /\/song\/[^/]+\/(\d{5,15})/.exec(u.pathname)?.[1]
    const album = /\/(?:album|playlist)\/[^/]+\/(?:pl\.)?(\d{5,15})/.exec(u.pathname)?.[1]
    const id = track ?? album
    if (!id || !/^\d+$/.test(id)) throw new HttpError(404, "couldn't find that one.")
    const j = await get<{ results?: Apple[] }>(`https://itunes.apple.com/lookup?id=${id}&country=us`)
    const r = j.results?.[0]
    if (!r) throw new HttpError(404, "couldn't find that one.")
    return { ...fromApple(r), url: link }
  }
  throw new HttpError(400, 'That kind of link is not one we can read yet. Search for the song instead, or type it in.')
}

export const GET = route(async (req: Request) => {
  const user = await requireUser()
  await limit(req, { name: 'music', max: 40, windowSec: 60, userId: user.id })
  const p = new URL(req.url).searchParams
  const q = (p.get('q') ?? '').trim().slice(0, 100)
  const url = (p.get('url') ?? '').trim().slice(0, 600)
  if (url) return json({ song: await byLink(url) })
  if (q.length < 2) return json({ songs: [] })
  const j = await get<{ results?: Apple[] }>(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=10&country=US`)
  return json({ songs: (j.results ?? []).map(fromApple).filter((s) => s.title && s.url) })
})
