import { BADGES } from '@/lib/badges-defs'
import { evaluateBadges, unlockedBadges } from '@/lib/badges'
import { json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/** Every achievement with whether (and when) the signed-in person unlocked it, for the Mac app. */
export const GET = route(async () => {
  const user = await requireUser()
  await evaluateBadges(user.id)
  const unlocked = new Map((await unlockedBadges(user.id)).map((r) => [r.badge_id, r.unlocked_at]))
  const badges = BADGES.map((b) => ({ id: b.id, name: b.name, how: b.how, points: b.points, rarity: b.rarity, unlockedAt: unlocked.get(b.id) ?? null }))
  return json({ badges, points: badges.reduce((s, b) => s + (b.unlockedAt ? b.points : 0), 0) })
})
