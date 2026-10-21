import type { AppNavItem } from '@/components/app/nav-types'
import { db } from './db'
import { featureOn } from './features'
import { getSession } from './session'

/**
 * The Developer item in the dashboard sidebar. Shown only to people who have registered an app, or who have the developer
 * role, so everyone else's sidebar stays as it was. Anyone can still open /dashboard/developer from the Developers page.
 */
export async function developerNav(): Promise<AppNavItem[]> {
  try {
    if (!(await featureOn('developers')) || !(await featureOn('developer-tools'))) return []
    const session = await getSession()
    const email = session?.user?.email?.toLowerCase()
    if (!email) return []
    let show = Boolean(session?.user?.roles?.includes('dev'))
    if (!show) {
      const d = await db()
      const r = await d
        .prepare("SELECT 1 AS x FROM settings s JOIN users u ON u.id = json_extract(s.value, '$.ownerId') WHERE s.key LIKE 'oauth:app:%' AND u.email = ?1 LIMIT 1")
        .bind(email)
        .first<{ x: number }>()
      show = Boolean(r)
    }
    return show ? [{ key: 'v', label: 'Developer', href: '/dashboard/developer', icon: 'Code2' }] : []
  } catch {
    return [] // the sidebar must never fail because of this
  }
}
