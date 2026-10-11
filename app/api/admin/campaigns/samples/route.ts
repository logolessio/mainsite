import { audit } from '@/lib/chain'
import { db } from '@/lib/db'
import { ipHash, protect } from '@/lib/guard'
import { json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

/**
 * One click to clear out the made-up launch campaigns (the ones tagged "sample"). Like deleting a single campaign,
 * it only removes ones that never held money or clips, so the books always balance. Anything else is left alone and counted.
 */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-samples', max: 10, windowSec: 600, userId: admin.id })
  const d = await db()
  const rows = (await d.prepare("SELECT id FROM campaigns WHERE admin_note = 'sample'").all<{ id: string }>()).results
  let removed = 0
  let kept = 0
  for (const { id } of rows) {
    const touched = await d.prepare('SELECT (SELECT COUNT(*) FROM ledger WHERE campaign_id = ?1) + (SELECT COUNT(*) FROM submissions WHERE campaign_id = ?1) AS n').bind(id).first<{ n: number }>()
    if ((touched?.n ?? 0) > 0) {
      kept++
      continue
    }
    await d.prepare('DELETE FROM favorites WHERE campaign_id = ?1').bind(id).run()
    await d.prepare('DELETE FROM campaigns WHERE id = ?1').bind(id).run()
    removed++
  }
  await audit({ id: admin.id, email: admin.email }, 'campaign.samples_removed', null, `removed ${removed}, kept ${kept}`, await ipHash(req))
  return json({ removed, kept })
})
