import { limit } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { currentProfile, noCatalogue, regionOf } from '@/lib/trailers/server'
import { tmdbReady, where } from '@/lib/trailers/tmdb'
import { REGIONS } from '@/lib/trailers/types'

/** Where a movie can be watched in a country. */
export const GET = route(async (req: Request) => {
  if (!(await tmdbReady())) throw noCatalogue()
  await limit(req, { name: 'trailers-where', max: 120, windowSec: 600 })
  const q = new URL(req.url).searchParams
  const id = Number(q.get('id'))
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Not a movie.')
  const asked = (q.get('region') ?? '').toUpperCase()
  const { profile } = await currentProfile()
  const region = REGIONS.some(([c]) => c === asked) ? asked : (profile?.settings.region ?? regionOf(req))
  return json({ where: await where(id, region) })
})
