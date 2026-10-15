import { z } from 'zod'
import { audit } from '@/lib/chain'
import { db, nowSec } from '@/lib/db'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { MOCK_PREFIX } from '@/lib/mock-campaigns'
import { setSetting } from '@/lib/settings'
import { requireAdmin } from '@/lib/user'

const TYPES = ['Music', 'Streamer', 'Podcast', 'Brand', 'Sport', 'Other'] as const
const SUBTYPES: Record<string, string[]> = {
  Music: ['Single', 'Album', 'Music video'],
  Streamer: ['Highlights', 'Just chatting'],
  Podcast: ['Episodes', 'Interviews'],
  Brand: ['Launch', 'Product drop'],
  Sport: ['Highlights', 'Training'],
  Other: ['Mixed'],
}
const TITLES = ['Neon Static', 'Glass Hours', 'Low Tide', 'Afterglow', 'Paper Moon', 'Velvet Noise', 'Static Bloom', 'Night Shift', 'Soft Machine', 'Golden Hour', 'Slow Burn', 'Hollow Light', 'Cold Open', 'Last Call', 'Midnight Run', 'Blue Hour', 'Dust Season']
const ARTISTS = ['Nova Reyes', 'Lila Moon', 'DJ Harbor', 'The Quiet Hours', 'Mara Quinn', 'Dex Marlow', 'Ivy and the Static', 'Juno Park', 'Rook', 'Sable']
const BRIEFS = [
  'A test campaign made by an admin. Cut the best moments and keep them short, loud and easy to watch on a phone.',
  'A mock campaign for trying the site. Use the hook in the first two seconds, add captions, and credit the artist.',
  'Made up to test the flow. Look for the moments people would quote, the reactions, the big drops.',
]
const CLIP_THIS = ['The hook or the chorus', 'Behind the scenes and reactions', 'Fan edits with the artist tagged', 'Anything with a strong first two seconds']
const OFF_LIMITS = ['Sponsor segments', 'Clips older than 30 days', 'Anything private or unreleased']

const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
const num = (n: number) => String(n).padStart(2, '0')
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'campaign'

const one = z.object({
  title: z.string().trim().min(2).max(60),
  creator: z.string().trim().min(2).max(60),
  type: z.enum(TYPES),
  cover: z.number().int().min(1).max(10),
  rate: z.number().min(0.5).max(50),
  budget: z.number().int().min(50).max(1_000_000),
  platforms: z.array(z.enum(['tiktok', 'youtube', 'instagram'])).min(1).max(3),
  summary: z.string().trim().max(1500).optional(),
})
type One = z.infer<typeof one>

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), campaign: one }),
  z.object({ action: z.literal('generate'), count: z.number().int().min(1).max(12) }),
  z.object({ action: z.literal('delete'), id: z.string().max(80) }),
  z.object({ action: z.literal('clear') }),
  z.object({ action: z.literal('public'), on: z.boolean() }),
])

async function insert(c: One) {
  const d = await db()
  const t = nowSec()
  const id = `${MOCK_PREFIX}${slug(c.title)}-${crypto.randomUUID().slice(0, 4)}`
  const sub = pick(SUBTYPES[c.type] ?? ['Mixed'])
  await d
    .prepare(
      `INSERT INTO campaigns (id, brand_user_id, title, creator, type, cover_url, preview_url, platforms_json, rate_cents, budget_cents, ends_on, summary,
         clip_this_json, off_limits_json, status, admin_note, launched_at, paid_at, created_at, updated_at)
       VALUES (?1, NULL, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NULL, ?10, ?11, ?12, 'live', 'mock', ?13, ?13, ?13, ?13)`,
    )
    .bind(
      id,
      c.title,
      c.creator,
      `${c.type} · ${sub}`,
      `/covers/${num(c.cover)}.jpg`,
      `/previews/${num(c.cover)}.mp3`,
      JSON.stringify(c.platforms),
      Math.round(c.rate * 100),
      Math.round(c.budget * 100),
      c.summary || pick(BRIEFS),
      JSON.stringify(CLIP_THIS.slice(0, 3)),
      JSON.stringify(OFF_LIMITS.slice(0, 2)),
      t,
    )
    .run()
  return id
}

/** Remove one mock campaign with everything attached to it. A mock never holds money, and this refuses if one somehow does. */
async function remove(id: string) {
  const d = await db()
  if (!id.startsWith(MOCK_PREFIX)) throw new HttpError(400, 'That is not a mock campaign.')
  const money = await d.prepare('SELECT COUNT(*) AS n FROM ledger WHERE campaign_id = ?1').bind(id).first<{ n: number }>()
  if ((money?.n ?? 0) > 0) throw new HttpError(409, 'This one has money attached, so it is not a real mock. End it instead.')
  await d.batch([
    d.prepare('DELETE FROM submissions WHERE campaign_id = ?1').bind(id),
    d.prepare('DELETE FROM favorites WHERE campaign_id = ?1').bind(id),
    d.prepare('DELETE FROM campaigns WHERE id = ?1').bind(id),
  ])
}

/** An admin makes made-up campaigns to try the site with. See lib/mock-campaigns.ts for what makes them safe. */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-mock', max: 40, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 8 * 1024))
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'That request is not valid.')
  const a = parsed.data
  const actor = { id: admin.id, email: admin.email }
  const ip = await ipHash(req)

  if (a.action === 'create') {
    const id = await insert(a.campaign)
    await audit(actor, 'mock.create', id, a.campaign.title, ip)
    return json({ ok: true, id })
  }
  if (a.action === 'generate') {
    const ids: string[] = []
    const used = new Set<string>()
    for (let i = 0; i < a.count; i++) {
      let title = pick(TITLES)
      for (let k = 0; k < 8 && used.has(title); k++) title = pick(TITLES)
      used.add(title)
      const type = pick(['Music', 'Music', 'Music', 'Streamer', 'Podcast', 'Brand', 'Sport'] as const)
      ids.push(await insert({ title, creator: pick(ARTISTS), type, cover: 1 + Math.floor(Math.random() * 10), rate: Math.round((1.5 + Math.random() * 3.5) * 20) / 20, budget: pick([500, 1000, 1500, 2500, 5000]), platforms: pick([['tiktok'], ['tiktok', 'youtube'], ['tiktok', 'youtube', 'instagram']] as const).slice() as One['platforms'] }))
    }
    await audit(actor, 'mock.generate', null, `${ids.length} campaigns`, ip)
    return json({ ok: true, made: ids.length })
  }
  if (a.action === 'delete') {
    await remove(a.id)
    await audit(actor, 'mock.delete', a.id, null, ip)
    return json({ ok: true })
  }
  if (a.action === 'clear') {
    const d = await db()
    const rows = (await d.prepare(`SELECT id FROM campaigns WHERE id LIKE '${MOCK_PREFIX}%'`).all<{ id: string }>()).results
    let removed = 0
    for (const r of rows) {
      try {
        await remove(r.id)
        removed++
      } catch {
        /* one that holds money is left alone */
      }
    }
    await audit(actor, 'mock.clear', null, `removed ${removed} of ${rows.length}`, ip)
    return json({ ok: true, removed, kept: rows.length - removed })
  }
  await setSetting('mock_public', a.on ? '1' : '0')
  await audit(actor, 'mock.public', null, a.on ? 'shown to everyone' : 'team only', ip)
  return json({ ok: true })
})
