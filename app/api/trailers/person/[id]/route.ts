import { limit } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { noCatalogue } from '@/lib/trailers/server'
import { person, tmdbReady } from '@/lib/trailers/tmdb'

/** A person's page: their details and every film and show they are in. */
export const GET = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  if (!(await tmdbReady())) throw noCatalogue()
  await limit(req, { name: 'trailers-person', max: 120, windowSec: 600 })
  const id = Number((await ctx.params).id)
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Not a person.')
  const p = await person(id)
  if (!p) throw new HttpError(404, 'We could not find that person.')
  return json({ person: p })
})
