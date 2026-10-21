import { z } from 'zod'
import { db, nowSec } from '@/lib/db'
import { isDevHostName, requestHost } from '@/lib/features'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { notify } from '@/lib/notify'
import { requireAdmin } from '@/lib/user'

const schema = z.object({ action: z.enum(['notify', 'campaign-request']) })

/** Makes a little data to test on, for the signed-in admin only, and only on the dev address. Nothing here touches money. */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  if (!isDevHostName(await requestHost()) && process.env.NODE_ENV === 'production') throw new HttpError(403, 'This is only for the dev site.')
  await protect(req, { name: 'dev-lab', max: 30, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 256))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const t = nowSec()

  if (parsed.data.action === 'notify') {
    const items = [
      { kind: 'earning' as const, title: 'You earned $12.40', body: 'Summer Nights: 4,960 verified views.', href: '/dashboard/earnings' },
      { kind: 'campaign' as const, title: 'A campaign you saved has 20% of its budget left', body: 'Red Room by KXNG VALE.', href: '/' },
      { kind: 'submission' as const, title: 'Your clip was approved', body: 'It is counting views now.', href: '/dashboard/submissions' },
    ]
    for (const [n, i] of items.entries()) await notify(admin.id, { ...i, dedupe: `lab:${t}:${n}` })
    return json({ message: 'Three notifications sent. Open the bell, and try swiping one away.' })
  }

  // a made-up request owned by this admin, tagged as a sample so it is easy to find and the public site never lists it
  const d = await db()
  const id = `lab-${crypto.randomUUID().slice(0, 6)}`
  await d
    .prepare(
      `INSERT INTO campaigns (id, brand_user_id, title, creator, type, cover_url, platforms_json, rate_cents, budget_cents, ends_on, summary, clip_this_json, off_limits_json, status, admin_note, created_at, updated_at)
       VALUES (?1, ?2, ?3, 'Test Artist', 'Music · Single', '/covers/01.jpg', '["tiktok","instagram"]', 200, 50000, NULL, ?4, '["The chorus"]', '[]', 'requested', 'sample', ?5, ?5)`,
    )
    .bind(id, admin.id, `Test request ${id.slice(4)}`, 'A made-up request to practise reviewing. It has no off-limits list and no end date, so the checks have something to say.', t)
    .run()
  return json({ message: 'Made a request. Open Campaigns, then Review in full.', href: `/admin/campaigns/${id}` })
})
