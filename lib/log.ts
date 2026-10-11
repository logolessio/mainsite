import { getCloudflareContext } from '@opennextjs/cloudflare'
import { db, nowSec } from './db'
import { ipHash } from './guard'

/**
 * Activity log. Every request to our API, every page view, every sign-in, every security event and every money
 * movement writes one row. Writing never slows or breaks the thing being logged: it runs in the background and a
 * failure is swallowed.
 */
export type EventKind = 'pageview' | 'api' | 'auth' | 'security' | 'error' | 'money' | 'admin' | 'clienterror'

export type LogInput = {
  kind: EventKind
  name: string
  path?: string | null
  method?: string | null
  status?: number | null
  ms?: number | null
  actor?: string | null
  detail?: string | null
  req?: Request | null
}

/** "Chrome · macOS · desktop" from a user-agent string. Bots are recognised and labelled. */
export function classifyUa(ua: string | null | undefined) {
  if (!ua) return 'unknown'
  if (/bot|crawl|spider|slurp|curl|wget|python|axios|node-fetch|go-http|headless|monitor/i.test(ua)) return 'bot'
  const browser = /edg\//i.test(ua) ? 'Edge' : /opr\/|opera/i.test(ua) ? 'Opera' : /firefox|fxios/i.test(ua) ? 'Firefox' : /chrome|crios/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : 'Other'
  const os = /windows/i.test(ua) ? 'Windows' : /iphone|ipad|ios/i.test(ua) ? 'iOS' : /android/i.test(ua) ? 'Android' : /mac os/i.test(ua) ? 'macOS' : /linux|cros/i.test(ua) ? 'Linux' : 'Other'
  const device = /mobile|iphone|android.+mobile/i.test(ua) ? 'mobile' : /ipad|tablet/i.test(ua) ? 'tablet' : 'desktop'
  return `${browser} · ${os} · ${device}`
}

const host = (u: string | null) => {
  if (!u) return null
  try {
    return new URL(u).host.slice(0, 80)
  } catch {
    return null
  }
}

const trim = (s: string | null | undefined, n: number) => (s ? s.slice(0, n) : null)

async function write(e: LogInput) {
  const req = e.req ?? null
  let country: string | null = null
  try {
    const cf = (await getCloudflareContext({ async: true })).cf as Record<string, unknown> | undefined
    country = typeof cf?.country === 'string' ? cf.country : (req?.headers.get('cf-ipcountry') ?? null)
  } catch {
    country = req?.headers.get('cf-ipcountry') ?? null
  }
  const d = await db()
  await d
    .prepare(
      `INSERT INTO event_log (ts, kind, name, path, method, status, ms, actor, ip_hash, country, ua, ref, detail)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13)`,
    )
    .bind(
      nowSec(),
      e.kind,
      e.name.slice(0, 120),
      trim(e.path, 200),
      e.method ?? req?.method ?? null,
      e.status ?? null,
      e.ms ?? null,
      e.actor ?? null,
      req ? await ipHash(req) : null,
      country,
      req ? classifyUa(req.headers.get('user-agent')) : null,
      host(req?.headers.get('referer') ?? null),
      trim(e.detail, 500),
    )
    .run()
}

/** Fire and forget. Safe to call anywhere on the server. */
export function logEvent(e: LogInput) {
  const p = write(e).catch((err) => console.error('log failed', err instanceof Error ? err.message : err))
  try {
    getCloudflareContext().ctx.waitUntil(p)
  } catch {
    /* local dev: the promise simply runs on its own */
  }
}
