import { z } from 'zod'

// The parts of a campaign that are not columns of their own: the music links, the official sound, an audio preview, a background
// picture and a short bio. Safe for the browser: no database code here (the storage is in campaign-extras.ts).

export type CampaignExtras = {
  /** open.spotify.com links to the track, album or artist */
  spotify: string[]
  /** links to the official sound creators should use (a TikTok sound, an Instagram audio page, a YouTube short sound) */
  sounds: string[]
  /** which part of the audio to use, in the brand's words ("the chorus from 0:42") */
  audioNote: string
  /** an uploaded audio preview (an upload id), played on the campaign page */
  audio: string
  /** an uploaded wide picture shown behind the campaign (an upload id) */
  background: string
  /** a few lines about the artist or brand */
  bio: string
  /** a link to footage creators can use */
  assets: string
}

export const EMPTY_EXTRAS: CampaignExtras = { spotify: [], sounds: [], audioNote: '', audio: '', background: '', bio: '', assets: '' }

const uploadId = z.string().regex(/^[0-9a-f-]{36}$/).or(z.literal(''))
const url = z.string().trim().max(300)

export const extrasSchema = z.object({
  spotify: z.array(url).max(6).default([]),
  sounds: z.array(url).max(4).default([]),
  audioNote: z.string().trim().max(200).default(''),
  audio: uploadId.default(''),
  background: uploadId.default(''),
  bio: z.string().trim().max(600).default(''),
  assets: url.default(''),
})

/** A Spotify link we can trust: only open.spotify.com, and only a track, album, artist, playlist or episode. Returns the clean link or an error. */
export function spotifyLink(raw: string): { url: string; kind: string } | { error: string } {
  const v = raw.trim()
  if (!v) return { error: 'Paste a Spotify link.' }
  let u: URL
  try {
    u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
  } catch {
    return { error: 'That is not a link.' }
  }
  if (u.hostname !== 'open.spotify.com' && u.hostname !== 'spotify.link') return { error: 'Use a link from open.spotify.com (Share, then Copy link).' }
  if (u.hostname === 'spotify.link') return { url: `https://spotify.link${u.pathname}`, kind: 'Link' }
  const seg = u.pathname.split('/').filter(Boolean).filter((s) => !/^intl-/.test(s))
  const kinds: Record<string, string> = { track: 'Track', album: 'Album', artist: 'Artist', playlist: 'Playlist', episode: 'Episode', show: 'Show' }
  if (!kinds[seg[0]] || !/^[A-Za-z0-9]{10,40}$/.test(seg[1] ?? '')) return { error: 'Use a link to a track, album, artist or playlist.' }
  return { url: `https://open.spotify.com/${seg[0]}/${seg[1]}`, kind: kinds[seg[0]] }
}

const SOUND_HOSTS: [RegExp, string][] = [
  [/(^|\.)tiktok\.com$/, 'TikTok sound'],
  [/(^|\.)instagram\.com$/, 'Instagram audio'],
  [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, 'YouTube'],
  [/(^|\.)soundcloud\.com$/, 'SoundCloud'],
  [/(^|\.)music\.apple\.com$/, 'Apple Music'],
]

/** A link to the official sound. Any https link on a known music or video site. */
export function soundLink(raw: string): { url: string; kind: string } | { error: string } {
  const v = raw.trim()
  let u: URL
  try {
    u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`)
  } catch {
    return { error: 'That is not a link.' }
  }
  const hit = SOUND_HOSTS.find(([re]) => re.test(u.hostname))
  if (!hit) return { error: 'Use a TikTok, Instagram, YouTube, SoundCloud or Apple Music link.' }
  u.protocol = 'https:'
  return { url: u.toString().slice(0, 300), kind: hit[1] }
}

/** Keeps only good links, cleaned, without repeats. */
export function cleanLinks(list: string[], check: typeof spotifyLink): string[] {
  const out: string[] = []
  for (const l of list) {
    const r = check(l)
    if ('url' in r && !out.includes(r.url)) out.push(r.url)
  }
  return out
}

// ---------- the budget, two ways ----------

/** The lowest and highest creators can be paid per 1,000 views (the same limits the server checks). */
export const RATE_MIN = 0.5
export const RATE_MAX = 50

export type BudgetMode = 'views' | 'rate'

/** Views a budget buys at a rate per 1,000. */
export const viewsFor = (budget: number, rate: number) => (rate > 0 ? Math.floor((budget / rate) * 1000) : 0)
/** The rate per 1,000 views that makes a budget buy a number of views, to the cent. */
export const rateFor = (budget: number, views: number) => (views > 0 ? Math.round((budget / views) * 1000 * 100) / 100 : 0)

/** What the two ways of setting a budget work out to, and whether that is a rate creators can be paid. */
export function budgetPlan(mode: BudgetMode, budget: number, rate: number, views: number) {
  const r = mode === 'views' ? rateFor(budget, views) : rate
  const v = mode === 'views' ? views : viewsFor(budget, rate)
  const problem =
    budget <= 0
      ? 'Set a budget.'
      : mode === 'views' && views <= 0
        ? 'How many views do you want?'
        : r < RATE_MIN
          ? mode === 'views'
            ? `That works out to $${r.toFixed(2)} per 1,000 views. Creators need at least $${RATE_MIN.toFixed(2)}, so ask for fewer views or raise the budget.`
            : `The lowest rate is $${RATE_MIN.toFixed(2)} per 1,000 views.`
          : r > RATE_MAX
            ? mode === 'views'
              ? `That works out to $${r.toFixed(2)} per 1,000 views, above our $${RATE_MAX} limit. Ask for more views.`
              : `The highest rate is $${RATE_MAX} per 1,000 views.`
            : null
  return { rate: r, views: v, problem }
}

export const compactViews = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M` : n >= 1000 ? `${Math.round(n / 1000)}K` : String(n))
