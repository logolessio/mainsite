import { z } from 'zod'
import { audit } from '@/lib/chain'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { inviteUrl, slugFromName } from '@/lib/invite-shared'
import { createInvite } from '@/lib/invites'
import { requireAdmin } from '@/lib/user'

const schema = z.object({
  artistName: z.string().trim().min(2).max(60),
  slug: z.string().trim().toLowerCase().max(40).optional(),
  channel: z.enum(['email', 'instagram', 'other']),
  email: z.string().trim().toLowerCase().email().max(120).optional().or(z.literal('')),
  lock: z.boolean().optional(),
  handle: z.string().trim().max(60).optional(),
  note: z.string().trim().max(500).optional(),
})

/** An admin makes a private link for an artist we are working with. */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-invite', max: 60, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 4096))
  if (!parsed.success) throw new HttpError(400, 'Please check the name, link and email.')
  const a = parsed.data
  const slug = (a.slug || slugFromName(a.artistName)).replace(/^\/+/, '')
  const id = await createInvite({ slug, artistName: a.artistName, channel: a.channel, email: a.email || null, lock: a.lock === true, handle: a.handle?.replace(/^@/, '') || null, note: a.note || null, createdBy: admin.email })
  await audit({ id: admin.id, email: admin.email }, 'invite.create', slug, `${a.artistName} · ${a.channel}${a.email && a.lock ? ' · locked to email' : ''}`, await ipHash(req))
  return json({ id, slug, url: inviteUrl(slug) })
})
