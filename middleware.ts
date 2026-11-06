import { NextResponse, type NextRequest } from 'next/server'

const MAIN = 'https://logoless.io'

/**
 * logoless.io is the only address. The other addresses attached to this worker (the older sites, the dev and owner addresses, a client's own link)
 * send whoever opens them to the same path on logoless.io.
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0]
  if (host.endsWith('.logoless.io') && host !== 'logoless.io') return NextResponse.redirect(`${MAIN}${req.nextUrl.pathname === '/' ? '' : req.nextUrl.pathname}${req.nextUrl.search}`, 307)
  return NextResponse.next()
}

// Paths with a dot are files and are skipped, except a person's page, whose name may contain dots (logoless.io/luna.ray: any one-segment path is let through).
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|api/me/host|.*\\..*).*)', '/:handle'] }
