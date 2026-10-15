// Browser side of the Cloudflare check: ask each of our three addresses whether it answers, and how fast. Public health answers
// carry no secrets, so each address lets the other two read them (see app/api/health/route.ts).

export type HostResult = { host: string; ok: boolean; status: number; ms: number; note?: string }
export type SiteCheckResult = { ok: boolean; hosts: HostResult[]; database: boolean; label: string; at: number }

const HOSTS = ['logoless.io', 'dev.logoless.io', 'owner.logoless.io']

async function ping(host: string): Promise<HostResult> {
  const t0 = performance.now()
  const local = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  const url = local ? '/api/health' : `https://${host}/api/health`
  if (local && host !== HOSTS[0]) return { host, ok: true, status: 0, ms: 0, note: 'not checked on a local machine' }
  try {
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 8000)
    const res = await fetch(url, { cache: 'no-store', signal: ctl.signal })
    clearTimeout(timer)
    // The address answers if our own health reply comes back. (The reply says 503 when a service such as email is not set up, which is not an outage.)
    const body = (await res.json().catch(() => null)) as { checks?: unknown[] } | null
    return { host, ok: Array.isArray(body?.checks), status: res.status, ms: Math.round(performance.now() - t0), ...(res.status === 503 && body?.checks ? { note: `answers · ${Math.round(performance.now() - t0)}ms (some services not set up)` } : {}) }
  } catch {
    return { host, ok: false, status: 0, ms: Math.round(performance.now() - t0), note: 'no answer' }
  }
}

/** Runs the check. Never throws. */
export async function checkSite(label: string): Promise<SiteCheckResult> {
  const [hosts, db] = await Promise.all([
    Promise.all(HOSTS.map(ping)),
    fetch('/api/health', { cache: 'no-store' }).then((r) => r.json() as Promise<{ checks?: { id: string; ok: boolean }[] }>).catch(() => null),
  ])
  const database = Boolean(db?.checks?.find((c) => c.id === 'database')?.ok)
  return { ok: hosts.every((h) => h.ok) && database, hosts, database, label, at: Date.now() }
}

export const SITE_CHECK_EVENT = 'logoless:site-check'

/** Runs the check after something important was done, and shows the result in the corner. */
export function runSiteCheck(label: string) {
  window.dispatchEvent(new CustomEvent(SITE_CHECK_EVENT, { detail: { label } }))
}
