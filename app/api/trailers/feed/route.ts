import { limit } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { currentProfile, noCatalogue } from '@/lib/trailers/server'
import { feed, tmdbReady } from '@/lib/trailers/tmdb'

const ids = (s: string | null, max: number) => (s ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, max)

/** The next trailers to scroll through. `cursor` says where the last call stopped, `exclude` is what has been shown already. */
export const GET = route(async (req: Request) => {
  if (!(await tmdbReady())) throw noCatalogue()
  await limit(req, { name: 'trailers-feed', max: 150, windowSec: 600 })
  const q = new URL(req.url).searchParams
  const cursor = Math.max(0, Math.min(2000, Number(q.get('cursor') ?? 0) || 0))
  const { profile } = await currentProfile()
  const favs = profile ? profile.favorites.map((m) => m.id) : ids(q.get('fav'), 8)
  const taste = profile?.taste ?? []
  const { clips, used } = await feed(cursor, favs, taste, new Set(ids(q.get('exclude'), 200)))
  if (!clips.length && cursor === 0) throw new HttpError(502, 'The movie catalogue did not answer. Try again in a moment.')
  return json({ clips, next: cursor + used })
})
