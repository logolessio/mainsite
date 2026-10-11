import { audit } from '@/lib/chain'
import { protect } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { claimInvite, inviteBySlug } from '@/lib/invites'
import { notifyAdmins } from '@/lib/notify'
import { requireUser } from '@/lib/user'

/** "Yes, this is me": the signed-in account takes ownership of the link. Only one account ever can. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'invite-claim', max: 10, windowSec: 3600, userId: user.id })
  const { slug } = await params
  const inv = await inviteBySlug(slug)
  if (!inv || inv.status === 'revoked') throw new HttpError(404, 'This link is not active.')
  if (inv.user_id === user.id) return json({ ok: true, already: true })
  if (inv.user_id) throw new HttpError(409, 'This link already belongs to another account.')
  if (user.role === 'admin') throw new HttpError(403, 'Admins can preview a link but not claim it.')
  const won = await claimInvite(inv, user)
  if (!won) throw new HttpError(409, 'This link was just claimed by someone else.')
  await audit({ id: user.id, email: user.email }, 'invite.claim', inv.slug, inv.artist_name)
  await notifyAdmins({ title: `${inv.artist_name} opened their link`, body: `${user.email} signed in and started setting up.`, href: '/admin/invites', dedupe: `invite-claim:${inv.id}` })
  return json({ ok: true })
})
