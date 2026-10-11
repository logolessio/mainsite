import { bump, evaluateBadges } from '@/lib/badges'
import { audit } from '@/lib/chain'
import { db, setting } from '@/lib/db'
import { protect } from '@/lib/guard'
import { body, json, route } from '@/lib/http'
import { ensureProfile, saveProfile, toView, type ProfileInput } from '@/lib/profile'
import { requireUser } from '@/lib/user'

export const GET = route(async () => {
  const user = await requireUser()
  const row = await ensureProfile(user)
  const d = await db()
  const unlocked = (await d.prepare('SELECT badge_id FROM badges_unlocked WHERE user_id = ?1').bind(user.id).all<{ badge_id: string }>()).results.map((r) => r.badge_id)
  return json({ profile: toView(row, user.role === 'admin'), unlocked, discordImport: Boolean(await setting('DISCORD_BOT_TOKEN')) })
})

export const PUT = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'profile', max: 40, windowSec: 600, userId: user.id })
  const input = await body<ProfileInput>(req)
  const { profile, changed } = await saveProfile(user, input)
  for (const c of changed) {
    if (c === 'banner') await bump(user.id, 'banner_changed')
    if (c === 'dots') await bump(user.id, 'dots_changed')
    if (c === 'accent') await bump(user.id, 'accent_changed')
    if (c === 'font') await bump(user.id, 'font_changed')
  }
  if (changed.includes('handle')) await audit({ id: user.id, email: user.email }, 'profile.handle', user.id, `@${profile.handle}`)
  const fresh = await evaluateBadges(user.id)
  return json({ profile: toView(profile, user.role === 'admin'), newBadges: fresh })
})
