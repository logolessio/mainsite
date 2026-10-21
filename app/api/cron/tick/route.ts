import { hmacHex, safeEqual } from '@/lib/crypto'
import { setting } from '@/lib/db'
import { discordTick } from '@/lib/discord/tick'
import { json, route } from '@/lib/http'

/**
 * The 30-second loop (see lib/discord/tick.ts). The scheduled job calls this twice a minute, with the same kind of code as
 * /api/cron/views (made from the site's own secret and the current hour), so nobody else can start a run. Each part checks its own
 * feature switch, so on logoless.io a run does nothing but read a few settings until the parts are pushed.
 */
export const POST = route(async (req: Request) => {
  const secret = (await setting('AUTH_SECRET')) ?? ''
  const given = req.headers.get('x-cron-key') ?? ''
  const hour = Math.floor(Date.now() / 3_600_000)
  const good = secret.length > 0 && given.length > 0 && (safeEqual(given, await hmacHex(secret, `cron:${hour}`)) || safeEqual(given, await hmacHex(secret, `cron:${hour - 1}`)))
  if (!good) return json({ error: 'Not allowed.' }, 403)
  return json({ ok: true, ...(await discordTick()) })
})
