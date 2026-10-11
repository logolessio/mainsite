import { protect } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { stripe } from '@/lib/stripe'
import { requireUser } from '@/lib/user'

const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' }
const MAX = 9 * 1024 * 1024

/** Hands a photo of the clipper's ID to Stripe and returns Stripe's file id. The picture is not saved here. */
export const POST = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'connect-doc', max: 12, windowSec: 3600, userId: user.id })
  if (!user.stripe_account_id) throw new HttpError(400, 'Pick your country first.')
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) throw new HttpError(400, 'Choose a photo of your ID.')
  if (!TYPES[file.type]) throw new HttpError(400, 'Use a JPG, PNG or PDF.')
  if (file.size > MAX) throw new HttpError(400, 'That file is too large. Use one under 9 MB.')
  const s = await stripe()
  const bytes = new Uint8Array(await file.arrayBuffer())
  const up = await s.files.create({ purpose: 'identity_document', file: { data: bytes, name: `id.${TYPES[file.type]}`, type: 'application/octet-stream' } }, { stripeAccount: user.stripe_account_id })
  return json({ id: up.id })
})
