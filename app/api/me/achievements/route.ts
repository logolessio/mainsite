import { evaluateBadges, unlockedBadges } from '@/lib/badges'
import { json, route } from '@/lib/http'
import { ensureProfile } from '@/lib/profile'
import { requireUser } from '@/lib/user'

export const GET = route(async () => {
  const user = await requireUser()
  const profile = await ensureProfile(user)
  await evaluateBadges(user.id)
  const unlocked = Object.fromEntries((await unlockedBadges(user.id)).map((r) => [r.badge_id, r.unlocked_at]))
  let equipped: string[] = []
  try {
    equipped = (JSON.parse(profile.badges_json) as string[]).filter((id) => id in unlocked)
  } catch {
    /* ignore */
  }
  return json({ unlocked, equipped })
})
