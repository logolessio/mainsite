import TITLES from './titles.json'

/**
 * The catalogue of 17.logoless.io. The film, series and anime data (title, year, plot, cast, ratings, poster) is real, from OMDb, kept in
 * titles.json by scripts/seventeen-omdb.mjs; the site never calls OMDb itself. Newest first is the order of that list.
 *
 * The FILES in each pack are placeholders made from that data (one file per lead actor or season, plus a slow-motion cut) until the team
 * uploads the real ones: give a file its `url` once it is up. A file without one sends people to the Discord, where the team posts the link.
 */

export type PackKind = 'Film' | 'Series' | 'Anime'
export const KINDS: PackKind[] = ['Film', 'Series', 'Anime']

export type PackFile = {
  name: string
  /** what kind of cut it is, for the filter on the pack's page */
  tag: 'Scenes' | 'Season' | 'Twixtor'
  quality: string
  /** e.g. 4:12 */
  length: string
  /** e.g. 1.2 GB */
  size: string
  /** the download (Google Drive, Mega, …). Without it the button opens the Discord. */
  url?: string
}

/** One title as OMDb describes it (see scripts/seventeen-omdb.mjs). */
export type Title = {
  imdbID: string
  kind: PackKind
  title: string
  /** "2014", or "2019–2026" / "2022–" for a series */
  year: string
  rated?: string
  released?: string
  runtime?: string
  genres: string[]
  director?: string
  writer?: string
  actors: string[]
  plot?: string
  plotFull?: string
  language?: string
  country?: string
  awards?: string
  /** the poster's address without its size: see poster() */
  poster?: string
  imdbRating?: string
  imdbVotes?: string
  metascore?: string
  rottenTomatoes?: string
  seasons?: string
}

export type Pack = Title & {
  slug: string
  /** when it went up, YYYY-MM-DD */
  added: string
  /** the best quality in the pack */
  quality: string
  files: PackFile[]
}

/** A poster at the width asked for (IMDb's image server sizes them on the fly). */
export const poster = (p: Pick<Title, 'poster'>, width: number) => (p.poster ? `${p.poster}QL80_UX${width}_.jpg` : undefined)

const slugOf = (t: string) =>
  t
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// the same made-up lengths and sizes on every build: a small seeded random from the title
const seeded = (s: string) => {
  let h = 2166136261
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h >>> 0) % 10000) / 10000
  }
}

const filesOf = (t: Title, quality: string): PackFile[] => {
  const rnd = seeded(t.imdbID)
  const mbPerMin = quality === '4K' ? 340 : 120
  const file = (name: string, tag: PackFile['tag'], minMin: number, maxMin: number): PackFile => {
    const secs = Math.round((minMin + rnd() * (maxMin - minMin)) * 60)
    const mb = (secs / 60) * mbPerMin * (0.85 + rnd() * 0.3)
    return { name, tag, quality, length: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, size: mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${Math.round(mb)} MB` }
  }
  const seasons = Math.min(Number(t.seasons ?? 0), 6)
  const actors = t.actors.slice(0, t.kind === 'Film' ? 3 : 2)
  return [
    ...Array.from({ length: seasons }, (_, i) => file(t.kind === 'Anime' ? `Season ${i + 1} fights` : `Season ${i + 1}`, 'Season', 6, 16)),
    ...(t.kind === 'Anime' ? [] : actors.map((a) => file(`${a} scenes`, 'Scenes', 3, 11))),
    file(t.kind === 'Film' ? 'Best moments' : 'Best of the series', 'Scenes', 4, 9),
    file('Twixtor slow motion', 'Twixtor', 1.5, 4),
  ]
}

// newest first, a pack every day or two before the last update
const UPDATED = Date.UTC(2026, 9, 26)

export const PACKS: Pack[] = (TITLES as Title[]).map((t, i) => {
  const quality = t.kind === 'Anime' ? '1080p' : '4K'
  return {
    ...t,
    slug: slugOf(t.title),
    added: new Date(UPDATED - Math.round(i * 1.6) * 86_400_000).toISOString().slice(0, 10),
    quality,
    files: filesOf(t, quality),
  }
})

export const packBySlug = (slug: string) => PACKS.find((p) => p.slug === slug)

export const topRated = (n = 10) => [...PACKS].sort((a, b) => Number(b.imdbRating ?? 0) - Number(a.imdbRating ?? 0)).slice(0, n)

/** The packs most like this one: the most genres in common, the same kind first, then the best rated. */
export const relatedPacks = (pack: Pack, n = 12) =>
  PACKS.filter((p) => p.slug !== pack.slug)
    .map((p) => ({ p, score: p.genres.filter((g) => pack.genres.includes(g)).length * 2 + (p.kind === pack.kind ? 1 : 0) + Number(p.imdbRating ?? 0) / 10 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.p)

/** The genres with enough packs to be worth a filter, most packs first. */
export const GENRES = Object.entries(
  PACKS.flatMap((p) => p.genres).reduce<Record<string, number>>((m, g) => ({ ...m, [g]: (m[g] ?? 0) + 1 }), {}),
)
  .filter(([, n]) => n >= 3)
  .sort((a, b) => b[1] - a[1])
  .map(([g]) => g)

/** "1999", or "2019" for a series that began then */
export const firstYear = (p: Pick<Title, 'year'>) => p.year.slice(0, 4)

/** Runtime for a film, seasons for a series */
export const lengthOf = (p: Title) => (p.kind === 'Film' ? p.runtime : p.seasons ? `${p.seasons} ${p.seasons === '1' ? 'season' : 'seasons'}` : undefined)

/** Everything the header's search needs, kept small: it is sent with every page. */
export type SearchItem = Pick<Pack, 'slug' | 'title' | 'year' | 'kind' | 'imdbRating'> & { thumb?: string; people: string }
export const searchIndex = (): SearchItem[] =>
  PACKS.map((p) => ({ slug: p.slug, title: p.title, year: p.year, kind: p.kind, imdbRating: p.imdbRating, thumb: poster(p, 92), people: [p.director, ...p.actors].filter(Boolean).join(', ') }))
