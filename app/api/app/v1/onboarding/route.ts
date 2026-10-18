import { db, nowSec } from '@/lib/db'
import { json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/**
 * Whether this person has already been through onboarding, so the apps do not run it again on a second device. Done means they finished the flow
 * (see /api/me/onboarding), or their account is more than ten minutes old (accounts made before the apps existed never saw the flow in an app).
 */
export const GET = route(async () => {
  const user = await requireUser()
  const d = await db()
  const flag = await d.prepare('SELECT 1 AS x FROM settings WHERE key = ?1').bind(`onboarded:${user.id}`).first()
  const old = nowSec() - user.created_at > 600
  return json({ done: Boolean(flag) || old })
})
