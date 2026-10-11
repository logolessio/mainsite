import { audit } from '@/lib/chain'
import { nowSec, db } from '@/lib/db'
import { protect } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { ownedInvite, parseData } from '@/lib/invites'
import { saveProfile } from '@/lib/profile'
import { buildLink } from '@/lib/profile-style'
import { requireUser } from '@/lib/user'

/** Turns what the artist typed in the first steps into their real profile page (/@handle). Safe to run again. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'invite-profile', max: 30, windowSec: 600, userId: user.id })
  const { slug } = await params
  const inv = await ownedInvite(slug, user)
  const data = parseData(inv.data_json)
  if (!data.stageName?.trim()) throw new HttpError(400, 'Add your artist name first.')
  if (!data.handle?.trim()) throw new HttpError(400, 'Pick a username first.')

  const links: { platform: string; url: string }[] = []
  for (const [platform, raw] of Object.entries(data.links ?? {})) {
    if (!raw?.trim()) continue
    const built = buildLink(platform, raw)
    if ('error' in built) throw new HttpError(400, `${platform}: ${built.error}`)
    links.push({ platform, url: built.url })
  }

  const { profile } = await saveProfile(user, {
    handle: data.handle,
    displayName: data.stageName,
    bio: data.pitch ?? '',
    country: data.country && data.country.length === 2 ? data.country : null,
    links,
    ...(data.avatar ? { avatar: data.avatar } : {}),
  })
  const d = await db()
  await d.prepare('UPDATE artist_invites SET last_active_at = ?2 WHERE id = ?1').bind(inv.id, nowSec()).run()
  await audit({ id: user.id, email: user.email }, 'invite.profile', inv.slug, `@${profile.handle}`)
  return json({ handle: profile.handle })
})
