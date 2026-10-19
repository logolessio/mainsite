import { limit } from '@/lib/guard'
import { json, route } from '@/lib/http'
import { noCatalogue } from '@/lib/trailers/server'
import { search, tmdbReady } from '@/lib/trailers/tmdb'

export const GET = route(async (req: Request) => {
  if (!(await tmdbReady())) throw noCatalogue()
  await limit(req, { name: 'trailers-search', max: 120, windowSec: 600 })
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 80)
  return json({ results: q.length < 2 ? [] : await search(q) })
})
