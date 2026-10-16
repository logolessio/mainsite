import { getSession } from '@/lib/session'
import { json, route } from '@/lib/http'
import { navCounts } from '@/lib/nav-counts'
import { requireUser } from '@/lib/user'

/** The little numbers in the sidebar: what is waiting on this person. Owner counts are for admins only. */
export const GET = route(async (req: Request) => {
  const user = await requireUser()
  const area = new URL(req.url).searchParams.get('area')
  if (area === 'owner') {
    const session = await getSession()
    if (session?.user?.role !== 'admin') return json({ counts: {} })
    return json({ counts: await navCounts('owner', user.id) }, 200)
  }
  return json({ counts: await navCounts(area === 'brand' ? 'brand' : 'creator', user.id) })
})
