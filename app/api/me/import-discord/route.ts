import { auditSafe } from '@/lib/chain'
import { setting } from '@/lib/db'
import { protect } from '@/lib/guard'
import { discordIdFor } from '@/lib/discord/link'
import { HttpError, json, route } from '@/lib/http'
import { storeImage } from '@/lib/upload'
import { requireUser } from '@/lib/user'

type DiscordUser = { id: string; username: string; global_name: string | null; avatar: string | null; banner: string | null; accent_color: number | null; banner_color?: string | null }

async function image(url: string) {
  const res = await fetch(url, { headers: { accept: 'image/webp,image/png,image/jpeg' } })
  if (!res.ok) return null
  const ab = await res.arrayBuffer()
  return new Uint8Array(ab)
}

/**
 * Pulls the picture, banner, colour and name of the person's OWN connected Discord account (connect it in Settings first).
 * Discord only shares these through its bot API. The "About me" text and connections are not available to apps, so those are
 * added by hand.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'discord-import', max: 6, windowSec: 600, userId: user.id })
  const id = await discordIdFor(user.id)
  if (!id) throw new HttpError(409, 'Connect Discord first, in Settings.')
  const token = await setting('DISCORD_BOT_TOKEN')
  if (!token) throw new HttpError(503, 'Importing from Discord is not switched on yet.')

  const res = await fetch(`https://discord.com/api/v10/users/${id}`, { headers: { authorization: `Bot ${token}`, 'user-agent': 'logoless (https://logoless.io, 1.0)' } })
  if (res.status === 404) throw new HttpError(404, 'Discord could not find that user ID.')
  if (!res.ok) throw new HttpError(502, 'Discord did not answer. Please try again in a minute.')
  const u = (await res.json()) as DiscordUser

  let avatar: string | null = null
  let banner: string | null = null
  if (u.avatar) {
    const bytes = await image(`https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.webp?size=512`)
    if (bytes) avatar = await storeImage(user.id, 'avatar', bytes).catch(() => null)
  }
  if (u.banner) {
    const bytes = await image(`https://cdn.discordapp.com/banners/${u.id}/${u.banner}.webp?size=1024`)
    if (bytes) banner = await storeImage(user.id, 'banner', bytes).catch(() => null)
  }
  const colour = typeof u.accent_color === 'number' ? `#${u.accent_color.toString(16).padStart(6, '0')}` : (u.banner_color ?? null)
  await auditSafe({ id: user.id, email: user.email }, 'profile.discord_import', u.id, `avatar ${avatar ? 'yes' : 'no'}, banner ${banner ? 'yes' : 'no'}`)
  return json({ displayName: u.global_name ?? u.username, avatar, banner, color: colour })
})
