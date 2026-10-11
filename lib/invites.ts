import { z } from 'zod'
import { db, nowSec, uid } from './db'
import { HttpError } from './http'
import { SLUG_RE, slugProblem, type InviteData } from './invite-shared'
import type { UserRow } from './user'

export type InviteRow = {
  id: string
  slug: string
  artist_name: string
  channel: 'email' | 'instagram' | 'other'
  contact_email: string | null
  email_lock: number
  contact_handle: string | null
  note: string | null
  status: 'sent' | 'claimed' | 'revoked'
  user_id: string | null
  step: number
  data_json: string
  campaign_id: string | null
  opens: number
  created_by: string | null
  created_at: number
  opened_at: number | null
  claimed_at: number | null
  completed_at: number | null
  last_active_at: number | null
  emailed_at: number | null
}

export async function inviteBySlug(slug: string) {
  if (!SLUG_RE.test(slug.toLowerCase())) return null
  const d = await db()
  return d.prepare('SELECT * FROM artist_invites WHERE slug = ?1').bind(slug.toLowerCase()).first<InviteRow>()
}

export async function inviteById(id: string) {
  const d = await db()
  return d.prepare('SELECT * FROM artist_invites WHERE id = ?1').bind(id).first<InviteRow>()
}

export const parseData = (json: string | null | undefined): InviteData => {
  try {
    const v = JSON.parse(json ?? '{}')
    return v && typeof v === 'object' ? (v as InviteData) : {}
  } catch {
    return {}
  }
}

const short = z.string().trim().max(120)
const long = z.string().trim().max(1500)

/** What the browser may save while someone works through the steps. Anything else is thrown away. */
export const dataSchema = z
  .object({
    stageName: short,
    handle: z.string().trim().max(24),
    country: z.string().trim().max(10),
    genres: z.array(short).max(5),
    pitch: z.string().trim().max(400),
    links: z.record(z.string().max(30), z.string().trim().max(200)),
    avatar: z.string().regex(/^[0-9a-f-]{36}$/).or(z.literal('')),
    cover: z.string().regex(/^[0-9a-f-]{36}$/).or(z.literal('')),
    projectTitle: short,
    projectKind: short,
    projectUrl: z.string().trim().max(300),
    releaseDate: z.string().trim().max(20),
    platforms: z.array(z.enum(['tiktok', 'youtube', 'instagram'])).max(3),
    summary: long,
    clipThis: z.string().trim().max(1200),
    offLimits: z.string().trim().max(1200),
    assetsUrl: z.string().trim().max(300),
    budget: z.string().trim().max(10),
    rate: z.string().trim().max(8),
    endsOn: z.string().trim().max(12),
    agreed: z.boolean(),
  })
  .partial()

export const progressSchema = z.object({ step: z.number().int().min(0).max(11), data: dataSchema })

export function maskEmail(e: string) {
  const [u, host] = e.split('@')
  if (!host) return '•••'
  return `${u.slice(0, 1)}${'•'.repeat(Math.max(2, Math.min(6, u.length - 1)))}@${host}`
}

/** Makes sure nobody else is using the slug, and that it is allowed. */
export async function assertFreeSlug(slug: string) {
  const bad = slugProblem(slug)
  if (bad) throw new HttpError(400, bad)
  const d = await db()
  const taken = await d.prepare('SELECT 1 AS x FROM artist_invites WHERE slug = ?1').bind(slug).first()
  if (taken) throw new HttpError(409, 'That link is already taken.')
}

export async function createInvite(o: { slug: string; artistName: string; channel: InviteRow['channel']; email?: string | null; lock?: boolean; handle?: string | null; note?: string | null; createdBy: string }) {
  await assertFreeSlug(o.slug)
  const d = await db()
  const id = uid()
  await d
    .prepare(
      `INSERT INTO artist_invites (id, slug, artist_name, channel, contact_email, email_lock, contact_handle, note, created_by, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
    )
    .bind(id, o.slug, o.artistName, o.channel, o.email?.toLowerCase() || null, o.lock && o.email ? 1 : 0, o.handle || null, o.note || null, o.createdBy, nowSec())
    .run()
  return id
}

/** The first account to sign in to a link (and match its email lock, if any) becomes its owner. Safe against two people at once. */
export async function claimInvite(inv: InviteRow, user: UserRow) {
  if (inv.email_lock && inv.contact_email && inv.contact_email.toLowerCase() !== user.email.toLowerCase()) throw new HttpError(403, 'This link was made for a different email address.')
  const d = await db()
  const t = nowSec()
  const res = await d
    .prepare("UPDATE artist_invites SET user_id = ?2, status = 'claimed', claimed_at = ?3, last_active_at = ?3 WHERE id = ?1 AND user_id IS NULL AND status = 'sent'")
    .bind(inv.id, user.id, t)
    .run()
  return res.meta.changes === 1
}

/** The invite for this link, only if the signed-in person owns it. Anyone else gets the same 404, so links cannot be probed. */
export async function ownedInvite(slug: string, user: UserRow) {
  const inv = await inviteBySlug(slug)
  if (!inv || inv.user_id !== user.id || inv.status !== 'claimed') throw new HttpError(404, 'This link is not yours.')
  return inv
}
