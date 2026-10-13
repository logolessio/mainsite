import { auditSafe } from '@/lib/chain'
import { campaignRequestSchema, slugify } from '@/lib/campaign-input'
import { campaignRow } from '@/lib/campaigns-db'
import { db, nowSec } from '@/lib/db'
import { protect } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { lines } from '@/lib/invite-shared'
import { ownedInvite, parseData } from '@/lib/invites'
import { notify, notifyAdmins } from '@/lib/notify'
import { requireUser } from '@/lib/user'

const clip = (v: string) => v.slice(0, 140)

/**
 * Creates the artist's first campaign from the invite answers. Because we invited them, it skips the review step
 * and goes straight to "ready to pay". Nothing goes live until it is paid and an admin launches it.
 */
export const POST = route(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'invite-campaign', max: 8, windowSec: 3600, userId: user.id })
  const { slug } = await params
  const inv = await ownedInvite(slug, user)
  if (inv.campaign_id) {
    const existing = await campaignRow(inv.campaign_id)
    if (existing) return json({ id: existing.id, status: existing.status, again: true })
  }
  const x = parseData(inv.data_json)
  if (!x.agreed) throw new HttpError(400, 'Please agree to how it works first.')

  const summary = [x.summary?.trim(), x.projectUrl?.trim() ? `Listen: ${x.projectUrl.trim()}` : '', x.assetsUrl?.trim() ? `Assets: ${x.assetsUrl.trim()}` : ''].filter(Boolean).join('\n\n').slice(0, 1500)
  const parsed = campaignRequestSchema.safeParse({
    title: x.projectTitle,
    creator: x.stageName,
    type: 'Music',
    subtype: x.projectKind || undefined,
    cover: x.cover || null,
    platforms: x.platforms?.length ? x.platforms : ['tiktok'],
    summary,
    clipThis: lines(x.clipThis).slice(0, 8).map(clip),
    offLimits: lines(x.offLimits).slice(0, 8).map(clip),
    rate: Number(x.rate),
    budget: Number(x.budget),
    endsOn: x.endsOn || null,
  })
  if (!parsed.success) throw new HttpError(400, `Please check "${parsed.error.issues[0]?.path.join('.') || 'the form'}": it is not valid yet.`)
  const c = parsed.data

  const d = await db()
  if (c.cover) {
    const own = await d.prepare("SELECT id FROM uploads WHERE id = ?1 AND user_id = ?2 AND kind = 'cover'").bind(c.cover, user.id).first()
    if (!own) throw new HttpError(400, 'Upload the cover image again.')
  }
  const t = nowSec()
  const id = `${slugify(c.title)}-${crypto.randomUUID().slice(0, 4)}`
  await d
    .prepare(
      `INSERT INTO campaigns (id, brand_user_id, title, creator, type, cover_url, platforms_json, rate_cents, budget_cents, ends_on, summary,
         clip_this_json, off_limits_json, status, invite_id, created_at, updated_at)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,'awaiting_payment',?14,?15,?15)`,
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
      inv.id,
      t,
    )
    .run()
  // claim the link's campaign slot (only the first request wins, a double click cannot make two)
  const won = await d.prepare('UPDATE artist_invites SET campaign_id = ?2, completed_at = ?3, last_active_at = ?3, step = MAX(step, 10) WHERE id = ?1 AND campaign_id IS NULL').bind(inv.id, id, t).run()
  if (won.meta.changes !== 1) {
    await d.prepare('DELETE FROM campaigns WHERE id = ?1').bind(id).run()
    const again = await d.prepare('SELECT campaign_id FROM artist_invites WHERE id = ?1').bind(inv.id).first<{ campaign_id: string }>()
    return json({ id: again?.campaign_id ?? id, status: 'awaiting_payment', again: true })
  }
  await auditSafe({ id: user.id, email: user.email }, 'invite.campaign', id, `${c.title} · $${c.budget} · /${inv.slug}`)
  await notify(user.id, { kind: 'campaign', title: `${c.title} is ready to fund`, body: 'Pay the budget to get it in front of clippers.', href: '/brand/campaigns', dedupe: `camp-invite:${id}` })
  await notifyAdmins({ title: `${inv.artist_name} set up a campaign`, body: `${c.title} · $${c.budget.toLocaleString()} budget. It is waiting for their payment.`, href: '/admin/campaigns', dedupe: `camp-invite:${id}` })
  return json({ id, status: 'awaiting_payment' })
})
