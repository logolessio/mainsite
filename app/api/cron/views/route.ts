import { hmacHex, safeEqual } from '@/lib/crypto'
import { setting } from '@/lib/db'
import { json, route } from '@/lib/http'
import { flushOutbox } from '@/lib/notify-center'
import { rescanViews } from '@/lib/views-rescan'

/**
 * The scheduled job calls this (see the cron in wrangler.jsonc and scripts/patch-open-next.mjs). The call carries a code made from
 * the site's own secret and the current hour, so nobody else can start a run. The job decides what is due, so calling it more often
 * than needed is harmless.
 */
export const POST = route(async (req: Request) => {
  const secret = (await setting('AUTH_SECRET')) ?? ''
  const given = req.headers.get('x-cron-key') ?? ''
  const hour = Math.floor(Date.now() / 3_600_000)
  const good = secret.length > 0 && given.length > 0 && (safeEqual(given, await hmacHex(secret, `cron:${hour}`)) || safeEqual(given, await hmacHex(secret, `cron:${hour - 1}`)))
  if (!good) return json({ error: 'Not allowed.' }, 403)
  const views = await rescanViews()
  // notification digests and messages held for quiet hours (the notification centre); a failure here never fails the view scan
  const digests = await flushOutbox().catch(() => ({ digestsSent: 0 }))
  return json({ ok: true, ...views, ...digests })
})
