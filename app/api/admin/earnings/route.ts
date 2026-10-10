import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'
import { creditEarning } from '@/lib/ledger'
import { findOrCreateUser, requireAdmin } from '@/lib/user'

/**
 * Admin only. Moves money from a brand's balance to a clipper for verified views.
 * This is the manual stand-in until views are verified automatically.
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  await requireAdmin()
  const b = await body<{ brandEmail?: string; clipperEmail?: string; amount?: number; campaign?: string; note?: string }>(req)
  if (!b.brandEmail || !b.clipperEmail) throw new HttpError(400, 'Enter both emails.')
  const gross = Math.round(Number(b.amount) * 100)
  const [brand, clipper] = await Promise.all([findOrCreateUser(b.brandEmail), findOrCreateUser(b.clipperEmail)])
  if (brand.id === clipper.id) throw new HttpError(400, 'The brand and the clipper must be different accounts.')
  const result = await creditEarning({ brandId: brand.id, clipperId: clipper.id, grossCents: gross, campaign: b.campaign, note: b.note })
  if (!result) throw new HttpError(409, "The brand's balance does not cover that amount.")
  return json({ ok: true, ...result })
})
