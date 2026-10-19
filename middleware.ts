import { NextResponse, type NextRequest } from 'next/server'

/**
 * Two things are told to the root layout in request headers (it cannot see the address itself), always set or cleared here so a visitor can never send them. x-path is the page asked for. x-bare marks the trailers site.
 * The trailers site (/trailers) is a full-screen app of its own: it draws no site menu, footer or shortcuts, and it is open to
 * everyone on the dev address (the rest of the dev site is for the team). The root layout cannot see which page it is rendering,
 * so this tells it, in a request header. Every request gets the header set or cleared here, so a visitor can never send it themselves.
 */
export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers)
  headers.delete('x-bare')
  headers.delete('x-path')
  const p = req.nextUrl.pathname
  headers.set('x-path', p) // the launch page needs to know which page was asked for (the legal pages stay open behind it)
  if (p === '/trailers' || p.startsWith('/trailers/')) headers.set('x-bare', '1')
  return NextResponse.next({ request: { headers } })
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'] }
