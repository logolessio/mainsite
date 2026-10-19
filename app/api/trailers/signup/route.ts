import { z } from 'zod'
import { limit } from '@/lib/guard'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'
import { passwordProblem } from '@/lib/password'
import { createCredentials, usernameProblem, usernameTaken } from '@/lib/trailers/store'

const schema = z.object({ username: z.string().trim().toLowerCase().max(40), password: z.string().min(1).max(200) })

/** Is this username free? (Asked while someone is typing it.) */
export const GET = route(async (req: Request) => {
  await limit(req, { name: 'trailers-name', max: 80, windowSec: 600 })
  const u = (new URL(req.url).searchParams.get('u') ?? '').trim().toLowerCase()
  const problem = usernameProblem(u)
  if (problem) return json({ ok: false, problem })
  return json((await usernameTaken(u)) ? { ok: false, problem: 'That name is taken.' } : { ok: true })
})

/** Makes a username and password account. The page signs in with it straight after. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  await limit(req, { name: 'trailers-signup', max: 8, windowSec: 3600 })
  const parsed = schema.safeParse(await body(req, 2048))
  if (!parsed.success) throw new HttpError(400, 'Pick a username and a password.')
  const { username, password } = parsed.data
  const bad = usernameProblem(username)
  if (bad) throw new HttpError(400, bad)
  const weak = await passwordProblem(password, `${username}@trailers`)
  if (weak) throw new HttpError(400, weak)
  if (!(await createCredentials(username, password))) throw new HttpError(409, 'That name is taken.')
  return json({ ok: true })
})
