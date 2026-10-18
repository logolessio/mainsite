import { applyWording } from './wording'

/** An error that carries the HTTP status and a message safe to show the person. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

/** Plumbing that fires on every page and would drown the log, so it is left out. Everything else is recorded. */
const QUIET = new Set(['/api/me/nav', '/api/security/config', '/api/nav-counts'])

async function record(args: unknown[], status: number, ms: number, detail?: string) {
  const req = args[0] instanceof Request ? args[0] : null
  if (!req) return
  const path = new URL(req.url).pathname
  if ((QUIET.has(path) && status < 400) || status === 429) return // rate limits are logged where they happen
  try {
    const [{ logEvent }, { getSession }] = await Promise.all([import('./log'), import('./session')])
    const session = await getSession().catch(() => null)
    const kind = status >= 500 ? 'error' : status === 401 || status === 403 || status === 429 ? 'security' : 'api'
    logEvent({ kind, name: `${req.method} ${path}`, path, status, ms, actor: session?.user?.email?.toLowerCase() ?? null, detail, req })
  } catch {
    /* logging must never break a request */
  }
}

/** Wraps a route handler so thrown errors become clean JSON instead of a bare 500, and every call is logged. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    const t0 = Date.now()
    try {
      const res = await fn(...args)
      void record(args, res.status, Date.now() - t0)
      return res
    } catch (e) {
      if (e instanceof HttpError) {
        void record(args, e.status, Date.now() - t0, e.message)
        return json({ error: applyWording(e.message) }, e.status)
      }
      console.error('route error', e instanceof Error ? e.message : e)
      void record(args, 500, Date.now() - t0, e instanceof Error ? `${e.name}: ${e.message}` : 'unknown error')
      return json({ error: 'Something went wrong. Please try again.' }, 500)
    }
  }
}

/**
 * CSRF defence for anything that changes state. Browsers always tell us where a request came from:
 * Origin on POSTs, Sec-Fetch-Site on every request. Anything that is not clearly from this site is refused.
 * (Session cookies are also SameSite=Lax, which is the second layer.)
 */
export function assertSameOrigin(req: Request) {
  // The Mac app signs in with a token it sends itself. A browser cannot be made to attach one to a request from another site, so there is nothing to forge.
  if (/^Bearer lgl_[0-9a-f]{48}$/.test(req.headers.get('authorization') ?? '')) return
  const origin = req.headers.get('origin')
  if (origin) {
    let host = ''
    try {
      host = new URL(origin).host
    } catch {
      /* falls through to the refusal below */
    }
    if (host !== new URL(req.url).host) throw new HttpError(403, 'Cross-site request blocked.')
    return
  }
  const site = req.headers.get('sec-fetch-site')
  if (site === 'same-origin' || site === 'none') return
  throw new HttpError(403, 'Cross-site request blocked.')
}

const MAX_BODY = 64 * 1024

/** Reads a JSON body, refusing anything larger than `max` bytes (default 64 KB) before parsing it. */
export async function body<T>(req: Request, max = MAX_BODY): Promise<T> {
  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > max) throw new HttpError(413, 'That request is too large.')
  try {
    const text = await req.text()
    if (text.length > max) throw new HttpError(413, 'That request is too large.')
    return JSON.parse(text) as T
  } catch (e) {
    if (e instanceof HttpError) throw e
    throw new HttpError(400, 'Invalid request.')
  }
}

/** Only paths on this site are allowed as post-payment return targets. */
const RETURN_PATHS = ['/brand/billing', '/brand/balance', '/dashboard/payouts', '/dashboard/earnings', '/onboarding']
export const safeReturn = (p: unknown, fallback: string) => (typeof p === 'string' && RETURN_PATHS.includes(p) ? p : fallback)
