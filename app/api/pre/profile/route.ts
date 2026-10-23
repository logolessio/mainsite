import { z } from 'zod'
import { db, nowSec } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { discordIdFor } from '@/lib/discord/link'
import { getPre, putPre, startPre } from '@/lib/prelaunch'
import { ensureProfile, saveProfile } from '@/lib/profile'
import { buildLink } from '@/lib/profile-style'
import { requireUser } from '@/lib/user'

const schema = z.object({
  name: z.string().trim().min(1).max(40),
  handle: z.string().trim().min(1).max(24),
  tiktok: z.string().trim().max(120).optional(),
  youtube: z.string().trim().max(120).optional(),
  instagram: z.string().trim().max(120).optional(),
  /** a field that is hidden from people: only a script fills it in */
  website: z.string().max(200).optional(),
})

/** The profile step of the pre-launch sign-up: a name, a username and, if they like, where they post. Saved straight to their real profile. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'pre-profile', max: 30, windowSec: 600, userId: user.id })
  const parsed = schema.safeParse(await body(req, 4 * 1024))
  if (!parsed.success) throw new HttpError(400, 'Please check your name and username.')
  const a = parsed.data
  await ensureProfile(user)
  const links: { platform: string; url: string }[] = []
  for (const platform of ['tiktok', 'youtube', 'instagram'] as const) {
    const raw = a[platform]
    if (!raw) continue
    const built = buildLink(platform, raw)
    if ('error' in built) throw new HttpError(400, `${platform === 'tiktok' ? 'TikTok' : platform === 'youtube' ? 'YouTube' : 'Instagram'}: ${built.error}`)
    links.push({ platform, url: built.url })
  }
  await saveProfile(user, { displayName: a.name, handle: a.handle, links }, { firstHandle: true })
  await (await db()).prepare('UPDATE users SET name = ?2 WHERE id = ?1').bind(user.id, a.name).run()
  const pre = (await getPre(user.id)) ?? (await startPre(req, user.id, await discordIdFor(user.id)))
  const flags = a.website && !pre.flags.includes('form was filled by a script') ? [...pre.flags, 'form was filled by a script'] : pre.flags
  await putPre(user.id, { ...pre, flags, profile: pre.profile ?? nowSec() })
  return json({ ok: true })
})
