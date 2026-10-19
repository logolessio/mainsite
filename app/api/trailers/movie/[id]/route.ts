import { limit } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { noCatalogue } from '@/lib/trailers/server'
import { clip, tmdbReady } from '@/lib/trailers/tmdb'

export const GET = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  if (!(await tmdbReady())) throw noCatalogue()
  await limit(req, { name: 'trailers-movie', max: 200, windowSec: 600 })
  const id = Number((await ctx.params).id)
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Not a movie.')
  const c = await clip(id)
  if (!c) throw new HttpError(404, 'No trailer for that one.')
  return json({ clip: c })
})
