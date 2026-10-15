import { protect } from '@/lib/guard'
import { body, json, route } from '@/lib/http'
import { submitClip } from '@/lib/submit-clip'
import { requireUser } from '@/lib/user'

/** A clipper submits the link to a clip they posted. It waits for an admin to approve it. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'submit', max: 20, windowSec: 600, userId: user.id })
  const { id } = await params
  const { platform, url } = await body<{ platform?: string; url?: string }>(req, 4 * 1024)
  const r = await submitClip(user, id, platform, url)
  return json({ ok: true, id: r.id, status: r.status, checks: r.checks, reason: r.reason })
})
