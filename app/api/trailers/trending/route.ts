import { limit } from '@/lib/guard'
import { json, route } from '@/lib/http'
import { noCatalogue } from '@/lib/trailers/server'
import { popular, tmdbReady, toMini, topRated, trending } from '@/lib/trailers/tmdb'

/** Posters to pick favourites from while someone is setting up. */
export const GET = route(async (req: Request) => {
  if (!(await tmdbReady())) throw noCatalogue()
  await limit(req, { name: 'trailers-trending', max: 60, windowSec: 600 })
  const [a, b, c] = await Promise.all([trending(1), popular(1), topRated(1)])
  const seen = new Set<number>()
  const out = []
  // interleaved, so the grid mixes what is new with what is loved
  for (let i = 0; i < 20; i++) for (const l of [a, b, c]) if (l[i] && !seen.has(l[i].id)) { seen.add(l[i].id); out.push(toMini(l[i])) }
  return json({ results: out.slice(0, 36) })
})
