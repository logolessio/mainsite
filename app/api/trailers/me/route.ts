import { z } from 'zod'
import { limit } from '@/lib/guard'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'
import { getSession } from '@/lib/session'
import { currentProfile, regionOf, requireEmail } from '@/lib/trailers/server'
import { claimUsername, freeUsername, loadProfile, mergeSettings, releaseUsername, saveProfile, SYNTHETIC, toggle, usernameProblem } from '@/lib/trailers/store'
import { tasteOf } from '@/lib/trailers/tmdb'
import { DEFAULT_SETTINGS, type Profile } from '@/lib/trailers/types'

const miniS = z.object({ id: z.number().int().positive(), t: z.string().max(200), p: z.string().max(80).nullable(), y: z.string().max(4), r: z.number().min(0).max(10) })
const op = z.discriminatedUnion('op', [
  z.object({ op: z.literal('onboard'), name: z.string().trim().min(1).max(40), favorites: z.array(miniS).max(8) }),
  z.object({ op: z.literal('like'), movie: miniS }),
  z.object({ op: z.literal('save'), movie: miniS }),
  z.object({ op: z.literal('favorites'), favorites: z.array(miniS).max(8) }),
  z.object({ op: z.literal('name'), name: z.string().trim().min(1).max(40) }),
  z.object({ op: z.literal('username'), username: z.string().trim().toLowerCase().max(40) }),
  z.object({ op: z.literal('settings'), patch: z.object({ region: z.string().max(2).optional(), sound: z.boolean().optional(), autoNext: z.boolean().optional(), ambient: z.boolean().optional(), glass: z.number().optional(), perf: z.enum(['auto', 'light', 'full']).optional() }) }),
  z.object({ op: z.literal('reset') }),
])

/** Who is here, and what the site knows about them. */
export const GET = route(async (req: Request) => {
  const { email, profile } = await currentProfile()
  const session = await getSession()
  return json({ signedIn: Boolean(email), name: session?.user?.name ?? null, profile, region: profile?.settings.region ?? regionOf(req), synthetic: Boolean(email?.endsWith(SYNTHETIC)) })
})

export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  const email = await requireEmail()
  await limit(req, { name: 'trailers-me', max: 240, windowSec: 600 })
  const parsed = op.safeParse(await body(req, 24 * 1024))
  if (!parsed.success) throw new HttpError(400, 'That did not look right.')
  const o = parsed.data
  let p = await loadProfile(email)

  if (o.op === 'onboard') {
    const taste = await tasteOf(o.favorites.map((m) => m.id))
    if (p) {
      p = { ...p, name: o.name, favorites: o.favorites, taste }
    } else {
      const username = email.endsWith(SYNTHETIC) ? email.slice(0, -SYNTHETIC.length) : await freeUsername(o.name, email)
      const now = Math.floor(Date.now() / 1000)
      p = { v: 1, username, name: o.name, createdAt: now, favorites: o.favorites, taste, liked: [], saved: [], settings: { ...DEFAULT_SETTINGS, region: regionOf(req) } } satisfies Profile
    }
    await saveProfile(email, p)
    return json({ profile: p })
  }

  if (!p) throw new HttpError(409, 'Finish setting up first.')

  if (o.op === 'like' || o.op === 'save') {
    const key = o.op === 'like' ? 'liked' : 'saved'
    const r = toggle(p[key], o.movie)
    p = { ...p, [key]: r.list }
    await saveProfile(email, p)
    return json({ on: r.on })
  }
  if (o.op === 'favorites') {
    p = { ...p, favorites: o.favorites, taste: await tasteOf(o.favorites.map((m) => m.id)) }
  } else if (o.op === 'name') {
    p = { ...p, name: o.name }
  } else if (o.op === 'username') {
    if (email.endsWith(SYNTHETIC)) throw new HttpError(400, 'Your username is how you sign in, so it cannot change.')
    const bad = usernameProblem(o.username)
    if (bad) throw new HttpError(400, bad)
    if (o.username !== p.username) {
      if (!(await claimUsername(o.username, email))) throw new HttpError(409, 'That name is taken.')
      await releaseUsername(p.username, email)
      p = { ...p, username: o.username }
    }
  } else if (o.op === 'settings') {
    p = { ...p, settings: mergeSettings(p.settings, o.patch) }
  } else if (o.op === 'reset') {
    p = { ...p, favorites: [], taste: [], liked: [], saved: [] }
  }
  await saveProfile(email, p)
  return json({ profile: p })
})
