import { addTrail } from './campaign-review'
import { getCaps, setCaps } from './campaign-caps'
import { saveExtras } from './campaign-extras'
import { type CampaignRequest } from './campaign-input'
import { db, nowSec } from './db'
import { HttpError } from './http'
import { notifyAdmins } from './notify'
import { campaignRow, type CampaignRow } from './campaigns-db'
import { getExtras } from './campaign-extras'

/** A brand fixes a request that is still waiting for review (usually after the team asked for changes) and sends it back. Only the owner, only while it is in review. */
export async function resubmitCampaign(userId: string, userEmail: string, id: string, c: CampaignRequest) {
  const row = await campaignRow(id)
  if (!row || row.brand_user_id !== userId) throw new HttpError(404, 'Campaign not found.')
  if (row.status !== 'requested') throw new HttpError(409, 'Only a request that is still in review can be changed this way.')
  const d = await db()
  if (c.cover) {
    const own = await d.prepare("SELECT id FROM uploads WHERE id = ?1 AND user_id = ?2 AND kind = 'cover'").bind(c.cover, userId).first()
    if (!own) throw new HttpError(400, 'Upload the cover image again.')
  }
  const t = nowSec()
  await d
    .prepare(
      `UPDATE campaigns SET title = ?2, creator = ?3, type = ?4, cover_url = ?5, platforms_json = ?6, rate_cents = ?7, budget_cents = ?8, ends_on = ?9, summary = ?10,
         clip_this_json = ?11, off_limits_json = ?12, updated_at = ?13 WHERE id = ?1 AND status = 'requested'`,
    )
    .bind(
      id,
      c.title,
      c.creator,
      c.subtype ? `${c.type} · ${c.subtype}` : c.type,
      c.cover ? `/api/img/${c.cover}` : row.cover_url,
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
  if (c.extras) {
    const { previewUrl } = await saveExtras(id, userId, c.extras)
    await d.prepare('UPDATE campaigns SET preview_url = ?2 WHERE id = ?1').bind(id, previewUrl).run()
  }
  await setCaps(id, { perPostCents: Math.round((c.capPerPost ?? 0) * 100), perUserCents: Math.round((c.capPerUser ?? 0) * 100) }, Math.round(c.budget * 100))
  await addTrail(id, { at: t, by: userEmail, kind: 'resubmit', text: 'Changed the request and sent it back for review.' })
  await notifyAdmins({ title: `Updated request: ${c.title}`, body: 'The artist changed it after the team asked for changes.', href: `/admin/campaigns/${id}`, dedupe: `camp-resub:${id}:${t}` })
}

/** The builder's starting values for a request being fixed: what was asked for, as the builder's own text fields. */
export async function draftFor(row: CampaignRow) {
  const extras = await getExtras(row.id)
  const caps = await getCaps(row.id)
  const [type, subtype] = row.type.split(' · ')
  const cover = /^\/api\/img\/([0-9a-f-]{36})$/.exec(row.cover_url)?.[1] ?? ''
  const list = (s: string) => {
    try {
      const v = JSON.parse(s)
      return Array.isArray(v) ? v.map(String).join('\n') : ''
    } catch {
      return ''
    }
  }
  let platforms: string[] = []
  try {
    platforms = (JSON.parse(row.platforms_json) as string[]).filter((p) => ['tiktok', 'youtube', 'instagram'].includes(p))
  } catch {
    platforms = []
  }
  const endsIso = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(row.ends_on ?? '')
  return {
    title: row.title,
    creator: row.creator,
    type: type || 'Music',
    subtype: subtype ?? '',
    platforms,
    spotify: extras.spotify,
    sounds: extras.sounds,
    audioNote: extras.audioNote,
    audio: extras.audio,
    cover,
    background: extras.background,
    bio: extras.bio,
    summary: row.summary,
    clipThis: list(row.clip_this_json),
    offLimits: list(row.off_limits_json),
    assets: extras.assets,
    example: extras.example,
    budget: String(row.budget_cents / 100),
    mode: 'rate' as const,
    rate: String(row.rate_cents / 100),
    views: '250000',
    endsOn: endsIso ? `${endsIso[3]}-${endsIso[2]}-${endsIso[1]}` : /^\d{4}-\d{2}-\d{2}$/.test(row.ends_on ?? '') ? (row.ends_on as string) : '',
    capPerPost: caps.perPostCents ? String(caps.perPostCents / 100) : '',
    capPerUser: caps.perUserCents ? String(caps.perUserCents / 100) : '',
  }
}
