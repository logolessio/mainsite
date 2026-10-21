import { campaignRequestSchema } from '@/lib/campaign-input'
import { resubmitCampaign } from '@/lib/campaign-edit'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/** A brand changes its own request while it is still in review (the team asked for changes) and sends it back. */
export const PATCH = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser()
  await protect(req, { name: 'campaign-resubmit', max: 20, windowSec: 3600, userId: user.id })
  const { id } = await params
  const parsed = campaignRequestSchema.safeParse(await body(req))
  if (!parsed.success) throw new HttpError(400, `Please check the form: ${parsed.error.issues[0]?.path.join('.') || 'a field'} is not valid.`)
  await resubmitCampaign(user.id, user.email, id, parsed.data)
  return json({ ok: true })
})
