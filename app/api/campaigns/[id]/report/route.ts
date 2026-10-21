import { auditSafe } from '@/lib/chain'
import { campaignRow } from '@/lib/campaigns-db'
import { db, nowSec } from '@/lib/db'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

const ofCampaign = (id: string) => `report-of:${id}`

async function mine(req: Request, params: Promise<{ id: string }>) {
  if (!(await featureOn('share-report'))) throw new HttpError(404, 'Not found.')
  const user = await requireUser()
  await protect(req, { name: 'campaign-report', max: 30, windowSec: 3600, userId: user.id })
  const { id } = await params
  const c = await campaignRow(id)
  if (!c || c.brand_user_id !== user.id) throw new HttpError(404, 'Campaign not found.')
  return { user, id, d: await db() }
}

/** The report link for a campaign (made if there is not one yet). Anyone with the link can read the results, nothing else. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { user, id, d } = await mine(req, params)
  const have = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(ofCampaign(id)).first<{ value: string }>()
  let token = have?.value
  if (!token) {
    token = [...crypto.getRandomValues(new Uint8Array(18))].map((b) => b.toString(36).padStart(2, '0')).join('').slice(0, 26)
    const t = nowSec()
    await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3), (?4, ?5, ?3)').bind(ofCampaign(id), token, t, `report:${token}`, JSON.stringify({ campaignId: id, userId: user.id })).run()
    await auditSafe({ id: user.id, email: user.email }, 'campaign.report_shared', id)
  }
  return json({ url: `${new URL(req.url).origin}/report/${token}` })
})

/** Stops sharing: the link stops working at once. */
export const DELETE = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { user, id, d } = await mine(req, params)
  const have = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(ofCampaign(id)).first<{ value: string }>()
  if (have) await d.prepare('DELETE FROM settings WHERE key IN (?1, ?2)').bind(ofCampaign(id), `report:${have.value}`).run()
  await auditSafe({ id: user.id, email: user.email }, 'campaign.report_unshared', id)
  return json({ ok: true })
})
