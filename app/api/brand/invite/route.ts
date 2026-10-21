import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { db } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { notify } from '@/lib/notify'
import { publicCreator } from '@/lib/showcase'
import { requireUser } from '@/lib/user'

const schema = z.object({ handle: z.string().min(3).max(20), campaignId: z.string().regex(/^[\w-]{1,80}$/) })

/** A brand invites a creator to look at one of its own live campaigns. Once per pair per day at most; only to public creators; never more than 15 a day in all. */
export const POST = route(async (req: Request) => {
  if (!(await featureOn('creator-invites'))) throw new HttpError(404, 'Not found.')
  const user = await requireUser()
  await protect(req, { name: 'creator-invite', max: 15, windowSec: 86400, userId: user.id })
  const parsed = schema.safeParse(await body(req, 512))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const { handle, campaignId } = parsed.data
  const d = await db()
  const camp = await d.prepare("SELECT id, title, creator FROM campaigns WHERE id = ?1 AND brand_user_id = ?2 AND status = 'live'").bind(campaignId, user.id).first<{ id: string; title: string; creator: string }>()
  if (!camp) throw new HttpError(404, 'Choose one of your live campaigns.')
  const creator = await publicCreator(handle)
  if (!creator || creator.userId === user.id) throw new HttpError(404, 'That creator is not open to invites.')
  const day = Math.floor(Date.now() / 86400000)
  const ok = await notify(creator.userId, { kind: 'campaign', title: `You were invited to ${camp.title}`, body: `${camp.creator} thinks your clips would suit it. Take a look and clip it if you like it.`, href: `/campaign/${camp.id}`, dedupe: `invite:${camp.id}:${user.id}:${day}` })
  if (!ok) throw new HttpError(409, 'They were already invited today.')
  await auditSafe({ id: user.id, email: user.email }, 'creator.invite', camp.id, `@${creator.handle}`)
  return json({ ok: true })
})
