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

/** Wraps a route handler so thrown errors become clean JSON instead of a bare 500. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status)
      console.error('route error', e instanceof Error ? e.message : e)
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
const RETURN_PATHS = ['/brand/billing', '/dashboard/payouts', '/onboarding']
export const safeReturn = (p: unknown, fallback: string) => (typeof p === 'string' && RETURN_PATHS.includes(p) ? p : fallback)
