import { setting } from '../db'
import { GENRES, type Clip, type Mini, type Where, type Provider } from './types'

// The Movie Database (themoviedb.org). Everything goes through the server, so the key never reaches a browser.
// This product uses the TMDB API but is not endorsed or certified by TMDB. Where-to-watch data is provided by JustWatch.

const BASE = 'https://api.themoviedb.org/3'

type Raw = Record<string, unknown>

/** One call to TMDB. Cached by Cloudflare for `ttl` seconds, so a busy hour is a few real calls, not thousands. Null on any failure. */
async function call<T = Raw>(path: string, params: Record<string, string | number | undefined> = {}, ttl = 3600): Promise<T | null> {
  const key = await setting('TMDB_API_KEY')
  if (!key) return null
  const q = new URLSearchParams({ api_key: key, language: 'en-US' })
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
  try {
    const res = await fetch(`${BASE}${path}?${q}`, { signal: AbortSignal.timeout(9000), cf: { cacheTtl: ttl, cacheEverything: true } } as RequestInit)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export const tmdbReady = async () => Boolean(await setting('TMDB_API_KEY'))

type Row = { id: number; title?: string; poster_path?: string | null; release_date?: string; vote_average?: number; genre_ids?: number[]; backdrop_path?: string | null; vote_count?: number; popularity?: number; adult?: boolean }
const rows = (r: Raw | null): Row[] => ((r?.results as Row[] | undefined) ?? []).filter((m) => m && m.id && m.title && m.poster_path && !m.adult)

export const toMini = (m: Row): Mini => ({ id: m.id, t: m.title ?? '', p: m.poster_path ?? null, y: (m.release_date ?? '').slice(0, 4), r: Math.round((m.vote_average ?? 0) * 10) / 10 })

// ---------- lists a feed is made from ----------
export const trending = async (page = 1) => rows(await call('/trending/movie/week', { page }, 1800))
export const popular = async (page = 1) => rows(await call('/movie/popular', { page }, 3600))
export const topRated = async (page = 1) => rows(await call('/movie/top_rated', { page }, 86400))
export const nowPlaying = async (page = 1) => rows(await call('/movie/now_playing', { page, region: 'US' }, 3600))
export const recommendations = async (id: number, page = 1) => rows(await call(`/movie/${id}/recommendations`, { page }, 86400))
export const similar = async (id: number, page = 1) => rows(await call(`/movie/${id}/similar`, { page }, 86400))
export const byGenre = async (genre: number, page = 1) =>
  rows(await call('/discover/movie', { with_genres: genre, sort_by: 'popularity.desc', 'vote_count.gte': 300, 'vote_average.gte': 6, page, include_adult: 'false' }, 3600))

export async function search(q: string): Promise<Mini[]> {
  const r = await call('/search/movie', { query: q, include_adult: 'false', page: 1 }, 600)
  const term = q.toLowerCase()
  // titles that begin with what was typed first, then the better known
  return rows(r)
    .sort((a, b) => Number((b.title ?? '').toLowerCase().startsWith(term)) - Number((a.title ?? '').toLowerCase().startsWith(term)) || (b.popularity ?? 0) - (a.popularity ?? 0))
    .slice(0, 14)
    .map(toMini)
}

// ---------- one movie, ready to play ----------
type Detail = Row & {
  tagline?: string
  overview?: string
  runtime?: number
  genres?: { id: number; name: string }[]
  videos?: { results?: { key: string; site: string; type: string; official: boolean; name: string; published_at?: string; iso_639_1?: string }[] }
  credits?: { cast?: { name: string; order: number }[]; crew?: { name: string; job: string }[] }
  release_dates?: { results?: { iso_3166_1: string; release_dates?: { certification?: string }[] }[] }
}

/** The best trailer on YouTube: an official trailer first, then any trailer, then a teaser. */
function pickTrailer(d: Detail) {
  const v = (d.videos?.results ?? []).filter((x) => x.site === 'YouTube' && x.key)
  const order = (x: (typeof v)[number]) => (x.type === 'Trailer' ? (x.official ? 0 : 1) : x.type === 'Teaser' ? 2 : 9) + (x.iso_639_1 && x.iso_639_1 !== 'en' ? 3 : 0)
  const best = [...v].filter((x) => x.type === 'Trailer' || x.type === 'Teaser').sort((a, b) => order(a) - order(b) || (b.published_at ?? '').localeCompare(a.published_at ?? ''))[0]
  return best ? { key: best.key, name: best.name } : null
}

function toClip(d: Detail): Clip | null {
  const trailer = pickTrailer(d)
  if (!trailer || !d.title) return null
  const us = d.release_dates?.results?.find((r) => r.iso_3166_1 === 'US')?.release_dates?.find((x) => x.certification)?.certification
  return {
    id: d.id,
    title: d.title,
    tagline: d.tagline ?? '',
    overview: d.overview ?? '',
    year: (d.release_date ?? '').slice(0, 4),
    runtime: d.runtime ?? 0,
    rating: Math.round((d.vote_average ?? 0) * 10) / 10,
    votes: d.vote_count ?? 0,
    genres: (d.genres ?? []).map((g) => g.name).slice(0, 3),
    poster: d.poster_path ?? null,
    backdrop: d.backdrop_path ?? null,
    trailer,
    cast: (d.credits?.cast ?? []).sort((a, b) => a.order - b.order).slice(0, 4).map((c) => c.name),
    director: d.credits?.crew?.find((c) => c.job === 'Director')?.name ?? null,
    cert: us ?? null,
  }
}

export async function clip(id: number): Promise<Clip | null> {
  const d = await call<Detail>(`/movie/${id}`, { append_to_response: 'videos,credits,release_dates', include_video_language: 'en,null' }, 86400)
  return d ? toClip(d) : null
}

/** The genre ids a set of movies leans towards, most common first. */
export async function tasteOf(ids: number[]): Promise<number[]> {
  const found = await Promise.all(ids.slice(0, 8).map((id) => call<Detail>(`/movie/${id}`, {}, 604800)))
  const count = new Map<number, number>()
  for (const d of found) for (const g of d?.genres ?? []) count.set(g.id, (count.get(g.id) ?? 0) + 1)
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).filter((id) => id in GENRES).slice(0, 4)
}

// ---------- where to watch ----------
export async function where(id: number, region: string): Promise<Where> {
  const r = await call<{ results?: Record<string, { link?: string; flatrate?: P[]; free?: P[]; ads?: P[]; rent?: P[]; buy?: P[] }> }>(`/movie/${id}/watch/providers`, {}, 21600)
  type P = { provider_id: number; provider_name: string; logo_path: string; display_priority?: number }
  const here = r?.results?.[region]
  const list = (a?: P[]): Provider[] => (a ?? []).sort((x, y) => (x.display_priority ?? 99) - (y.display_priority ?? 99)).map((p) => ({ id: p.provider_id, name: p.provider_name, logo: p.logo_path }))
  const free = list([...(here?.free ?? []), ...(here?.ads ?? [])])
  return { region, link: here?.link ?? null, stream: list(here?.flatrate), free, rent: list(here?.rent), buy: list(here?.buy) }
}

// ---------- the feed ----------
type Source = { k: 'rec'; id: number } | { k: 'genre'; g: number } | { k: 'trending' } | { k: 'popular' } | { k: 'top' } | { k: 'now' } | { k: 'similar'; id: number }

/** The order the sources are visited in. A person's favourites and the genres they lean towards come round often; the rest keep it fresh. */
function plan(favs: number[], taste: number[]): Source[] {
  const out: Source[] = []
  const f = favs.slice(0, 6)
  const g = taste.slice(0, 3)
  const pattern = ['fav', 'trending', 'genre', 'fav', 'popular', 'fav', 'top', 'genre', 'now', 'fav', 'similar', 'genre']
  let fi = 0
  let gi = 0
  for (const p of pattern) {
    if (p === 'fav' && f.length) out.push({ k: 'rec', id: f[fi++ % f.length] })
    else if (p === 'similar' && f.length) out.push({ k: 'similar', id: f[fi++ % f.length] })
    else if (p === 'genre' && g.length) out.push({ k: 'genre', g: g[gi++ % g.length] })
    else if (p === 'trending' || p === 'fav' || p === 'genre' || p === 'similar') out.push({ k: 'trending' })
    else out.push({ k: p as 'popular' | 'top' | 'now' })
  }
  return out
}

async function candidates(s: Source, page: number): Promise<Row[]> {
  switch (s.k) {
    case 'rec': return recommendations(s.id, page)
    case 'similar': return similar(s.id, page)
    case 'genre': return byGenre(s.g, page)
    case 'trending': return trending(page)
    case 'popular': return popular(page)
    case 'top': return topRated(page)
    case 'now': return nowPlaying(page)
  }
}

/** The next few trailers for a feed. `cursor` is how many calls have been made so far; `skip` is what the person has already been shown. */
export async function feed(cursor: number, favs: number[], taste: number[], skip: Set<number>, want = 6): Promise<{ clips: Clip[]; used: number }> {
  const steps = plan(favs, taste)
  const out: Clip[] = []
  const seen = new Set(skip)
  // a source can run dry or hold nothing playable, so look at a few before giving up
  let used = 0
  for (let n = 0; n < 4 && out.length < want; n++) {
    used = n + 1
    const at = cursor + n
    const s = steps[at % steps.length]
    const page = Math.floor(at / steps.length) + 1
    const fresh = (await candidates(s, page)).filter((m) => !seen.has(m.id)).slice(0, 10)
    for (const m of fresh) seen.add(m.id)
    const found = (await Promise.all(fresh.map((m) => clip(m.id)))).filter((c): c is Clip => Boolean(c))
    out.push(...found)
  }
  return { clips: out, used }
}
