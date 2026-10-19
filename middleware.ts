import { NextResponse, type NextRequest } from 'next/server'

/**
 * The trailers site (/trailers) is a full-screen app of its own: it draws no site menu, footer or shortcuts, and it is open to
 * everyone on the dev address (the rest of the dev site is for the team). The root layout cannot see which page it is rendering,
 * so this tells it, in a request header. Every request gets the header set or cleared here, so a visitor can never send it themselves.
 */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers)
  headers.delete('x-bare')
  const p = req.nextUrl.pathname
  if (p === '/trailers' || p.startsWith('/trailers/')) headers.set('x-bare', '1')
  return NextResponse.next({ request: { headers } })
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'] }
