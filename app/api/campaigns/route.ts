import { auditSafe } from '@/lib/chain'
import { campaignRequestSchema, slugify } from '@/lib/campaign-input'
import { db, nowSec } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { notify, notifyAdmins } from '@/lib/notify'
import { requireUser } from '@/lib/user'

/** A brand or artist asks for a campaign. Nothing goes live: an admin has to accept it, the brand pays, then an admin launches it. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'campaign-request', max: 6, windowSec: 3600, userId: user.id })
  const parsed = campaignRequestSchema.safeParse(await body(req))
  if (!parsed.success) throw new HttpError(400, `Please check the form: ${parsed.error.issues[0]?.path.join('.') || 'a field'} is not valid.`)
  const c = parsed.data

  const d = await db()
  const open = await d.prepare("SELECT COUNT(*) AS n FROM campaigns WHERE brand_user_id = ?1 AND status IN ('requested','awaiting_payment')").bind(user.id).first<{ n: number }>()
  if ((open?.n ?? 0) >= 5) throw new HttpError(429, 'You already have several requests waiting. Please wait for us to review them.')

  if (c.cover) {
    const own = await d.prepare("SELECT id FROM uploads WHERE id = ?1 AND user_id = ?2 AND kind = 'cover'").bind(c.cover, user.id).first()
    if (!own) throw new HttpError(400, 'Upload the cover image again.')
  }

  const t = nowSec()
  const id = `${slugify(c.title)}-${crypto.randomUUID().slice(0, 4)}`
  await d
    .prepare(
      `INSERT INTO campaigns (id, brand_user_id, title, creator, type, cover_url, platforms_json, rate_cents, budget_cents, ends_on, summary,
         clip_this_json, off_limits_json, status, created_at, updated_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,'requested',?14,?14)`,
    )
    .bind(
      id,
      user.id,
      c.title,
      c.creator,
      c.subtype ? `${c.type} · ${c.subtype}` : c.type,
      c.cover ? `/api/img/${c.cover}` : '/covers/01.jpg',
      JSON.stringify(c.platforms),
      Math.round(c.rate * 100),
      Math.round(c.budget * 100),
      c.endsOn ?? null,
      c.summary,
      JSON.stringify(c.clipThis),
      JSON.stringify(c.offLimits),
      t,
    )
    .run()

  await auditSafe({ id: user.id, email: user.email }, 'campaign.request', id, `${c.title} · $${c.budget}`)
  await notify(user.id, { kind: 'campaign', title: `Request received: ${c.title}`, body: 'We will review it and let you know the next step.', href: '/brand/campaigns', dedupe: `camp-req:${id}` })
  await notifyAdmins({ title: `New campaign request: ${c.title}`, body: `${c.creator} · $${c.budget.toLocaleString()} budget`, href: '/admin/campaigns', dedupe: `camp-req:${id}` })
  return json({ id })
})
