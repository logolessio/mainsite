import { limit } from '@/lib/guard'
import { assertSameOrigin, body, json, route } from '@/lib/http'
import { logEvent } from '@/lib/log'
import { getSession } from '@/lib/session'

/** Page views and browser errors, sent by the page itself. Nobody has to be signed in. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  await limit(req, { name: 'track', max: 240, windowSec: 60 })
  const b = await body<{ t?: string; path?: string; msg?: string; w?: number; lang?: string; tz?: string; ms?: number }>(req, 4 * 1024).catch(() => null)
  if (!b || typeof b.path !== 'string' || !b.path.startsWith('/')) return json({ ok: true })
  const session = await getSession().catch(() => null)
  const actor = session?.user?.email?.toLowerCase() ?? null
  const detail = [b.w ? `${b.w}px` : '', b.lang ?? '', b.tz ?? '', b.ms ? `loaded in ${Math.round(b.ms)}ms` : ''].filter(Boolean).join(' · ')
  if (b.t === 'error') logEvent({ kind: 'clienterror', name: 'browser error', path: b.path.slice(0, 200), actor, detail: String(b.msg ?? '').slice(0, 400), req })
  else logEvent({ kind: 'pageview', name: 'pageview', path: b.path.slice(0, 200), actor, detail, req })
  // if the scheduled view check has not run for a while, the next visit starts one (see lib/views-rescan.ts)
  const { lazyRescan } = await import('@/lib/views-rescan')
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    getCloudflareContext().ctx.waitUntil(lazyRescan())
  } catch {
    void lazyRescan()
  }
  return json({ ok: true })
})
