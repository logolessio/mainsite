// What the trailers site passes around. Safe for the browser: only types and small helpers.

/** A movie as the lists remember it (liked, saved, favourites): just enough to draw a poster and to find it again. */
export type Mini = { id: number; t: string; p: string | null; y: string; r: number }

/** A movie ready to play: the details, and the YouTube trailer. */
export type Clip = {
  id: number
  title: string
  tagline: string
  overview: string
  year: string
  runtime: number
  rating: number
  votes: number
  genres: string[]
  poster: string | null
  backdrop: string | null
  trailer: { key: string; name: string }
  cast: string[]
  director: string | null
  cert: string | null
}

export type Provider = { id: number; name: string; logo: string }
export type Where = { region: string; link: string | null; stream: Provider[]; free: Provider[]; rent: Provider[]; buy: Provider[] }

export type Settings = {
  region: string
  sound: boolean // start trailers with sound
  autoNext: boolean // move to the next trailer when one ends
  ambient: boolean // the soft glow of the film's colours around the screen
  glass: number // 0 to 100: how strongly the glass bends what is behind it
}

export const DEFAULT_SETTINGS: Settings = { region: 'US', sound: true, autoNext: false, ambient: true, glass: 70 }

export type Profile = {
  v: 1
  username: string
  name: string
  createdAt: number
  favorites: Mini[]
  taste: number[] // the genre ids the favourites lean towards, most first
  liked: Mini[]
  saved: Mini[]
  settings: Settings
}

export const IMG = 'https://image.tmdb.org/t/p'
export const poster = (p: string | null | undefined, w: 185 | 342 | 500 = 342) => (p ? `${IMG}/w${w}${p}` : '')
export const backdrop = (p: string | null | undefined, w: 780 | 1280 | 1920 = 1280) => (p ? `${IMG}/w${w}${p}` : '')
export const logo = (p: string | null | undefined) => (p ? `${IMG}/w92${p}` : '')

export const GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy',
  36: 'History', 27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
}

export const REGIONS: [string, string][] = [
  ['US', 'United States'], ['GB', 'United Kingdom'], ['CA', 'Canada'], ['AU', 'Australia'], ['IE', 'Ireland'], ['DE', 'Germany'], ['FR', 'France'], ['ES', 'Spain'],
  ['IT', 'Italy'], ['NL', 'Netherlands'], ['SE', 'Sweden'], ['NO', 'Norway'], ['DK', 'Denmark'], ['FI', 'Finland'], ['PL', 'Poland'], ['PT', 'Portugal'], ['BR', 'Brazil'],
  ['MX', 'Mexico'], ['AR', 'Argentina'], ['JP', 'Japan'], ['KR', 'South Korea'], ['IN', 'India'], ['SG', 'Singapore'], ['NZ', 'New Zealand'], ['ZA', 'South Africa'], ['AE', 'United Arab Emirates'],
]

export const mini = (m: { id: number; title?: string; t?: string; poster?: string | null; p?: string | null; year?: string; y?: string; rating?: number; r?: number }): Mini => ({
  id: m.id,
  t: m.t ?? m.title ?? '',
  p: m.p ?? m.poster ?? null,
  y: m.y ?? m.year ?? '',
  r: Math.round((m.r ?? m.rating ?? 0) * 10) / 10,
})
