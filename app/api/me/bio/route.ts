import { bioOrStarter, bioStats, saveBio } from '@/lib/bio-store'
import { protect } from '@/lib/guard'
import { body, json, route } from '@/lib/http'
import { avatarSrc } from '@/lib/looks'
import { ensureProfile, saveProfile } from '@/lib/profile'
import { requireUser } from '@/lib/user'

/** The editor's whole state in one go: the page, the profile words that sit on it, and the numbers. */
export const GET = route(async () => {
  const user = await requireUser()
  const [{ config, saved }, profile, stats] = await Promise.all([bioOrStarter(user.id), ensureProfile(user), bioStats(user.id)])
  return json({
    config,
    saved,
    profile: { handle: profile.handle, name: profile.display_name, bio: profile.bio, avatar: avatarSrc(profile.avatar_key, profile.display_name, profile.handle), hasAvatar: Boolean(profile.avatar_key) },
    stats,
  })
})

/** Saves the page, and (when sent) the name, words, picture and username that go with it. */
export const PUT = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'bio-save', max: 60, windowSec: 600, userId: user.id })
  const input = await body<{ config?: unknown; profile?: { displayName?: string; bio?: string; avatar?: string | null; handle?: string } }>(req, 80 * 1024)
  let handleChanged = false
  if (input.profile && typeof input.profile === 'object') {
    const p = input.profile
    const { changed } = await saveProfile(user, { displayName: p.displayName, bio: p.bio, avatar: p.avatar, handle: p.handle })
    handleChanged = changed.includes('handle')
  }
  const config = input.config === undefined ? (await bioOrStarter(user.id)).config : await saveBio(user.id, input.config)
  const profile = await ensureProfile(user)
  return json({ config, saved: true, handleChanged, profile: { handle: profile.handle, name: profile.display_name, bio: profile.bio, avatar: avatarSrc(profile.avatar_key, profile.display_name, profile.handle), hasAvatar: Boolean(profile.avatar_key) } })
})
