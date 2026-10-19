import { z } from 'zod'
import { limit } from '@/lib/guard'
import { addSignup, handleProblem, normEmail, validEmail } from '@/lib/launch'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'
import { rolesForEmail } from '@/lib/roles'

const schema = z.object({ email: z.string().max(254), handle: z.string().max(40).optional() })

/**
 * Joins the launch list, and optionally reserves a username.
 * An address that belongs to an owner is not put on the list: the answer says so, and the page sends them to Google to sign in (only an
 * owner's account gets past the launch page). This does reveal to anyone who tries an address whether it is an owner's, so it is limited to a
 * handful of tries per network.
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  await limit(req, { name: 'launch-signup', max: 12, windowSec: 600 })
  const parsed = schema.safeParse(await body(req, 1024))
  if (!parsed.success) throw new HttpError(400, 'Enter a valid email address.')
  const email = normEmail(parsed.data.email)
  if (!validEmail(email)) throw new HttpError(400, 'Enter a valid email address.')
  if ((await rolesForEmail(email)).includes('admin')) return json({ owner: true })
  try {
    const r = await addSignup(email, parsed.data.handle)
    return json({ ok: true, handle: r.handle, already: r.already })
  } catch (e) {
    if (e instanceof Error && e.message === 'taken') throw new HttpError(409, 'Somebody has already reserved that name.')
    throw e
  }
})

/** Is a username free to reserve? */
export const GET = route(async (req: Request) => {
  await limit(req, { name: 'launch-handle', max: 90, windowSec: 600 })
  const h = (new URL(req.url).searchParams.get('h') ?? '').trim().toLowerCase().replace(/^@/, '')
  const problem = await handleProblem(h)
  return json(problem ? { ok: false, problem } : { ok: true })
})
