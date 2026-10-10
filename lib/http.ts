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

/** Blocks cross-site form posts. Browsers send Origin on POSTs, and it must match this site. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin')
  if (origin && new URL(origin).host !== new URL(req.url).host) throw new HttpError(403, 'Cross-site request blocked.')
}

export async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw new HttpError(400, 'Invalid request.')
  }
}

/** Only paths on this site are allowed as post-payment return targets. */
const RETURN_PATHS = ['/brand/billing', '/dashboard/payouts', '/onboarding']
export const safeReturn = (p: unknown, fallback: string) => (typeof p === 'string' && RETURN_PATHS.includes(p) ? p : fallback)
