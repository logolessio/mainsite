import { NextResponse, type NextRequest } from 'next/server'

const MAIN = 'https://logoless.io'
const SCROLL = 'https://scroll.logoless.io'
const onLogoless = (host: string) => host === 'logoless.io' || host.endsWith('.logoless.io')

/** The only parts of the main site's backend that scroll.logoless.io uses: signing in, the movie data, and the human check. */
const SCROLL_API = /^\/api\/(auth|trailers|security)(\/|$)/

/**
 * Two things are told to the root layout in request headers (it cannot see the address itself), always set or cleared here so a visitor can never send them. x-path is the page asked for. x-bare marks a full-screen app of its own: scroll.
 *
 * scroll (scroll.logoless.io) is a site of its own that happens to run in the same worker. It has no site menu, footer or shortcuts, it is never behind
 * the launch page or the dev gate, and it serves only its own page (the movie trailers, kept at /trailers inside the code) and the few things it needs
 * to sign people in. Anything else asked of it goes to the main site, and the old address of the trailers (/trailers on the main site) goes to scroll.
 * On a computer's own address (localhost) /trailers still works directly, and scroll.localhost behaves like scroll.logoless.io, so both can be tried.
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0]
  const p = req.nextUrl.pathname
  const search = req.nextUrl.search
  const headers = new Headers(req.headers)
  headers.delete('x-bare')
  headers.delete('x-path')
  headers.set('x-path', p) // the launch page needs to know which page was asked for (the legal pages stay open behind it)

  if (/^scroll\./.test(host)) {
    if (SCROLL_API.test(p)) return NextResponse.next({ request: { headers } })
    if (p === '/') {
      headers.set('x-bare', '1')
      headers.set('x-path', '/trailers')
      return NextResponse.rewrite(new URL(`/trailers${search}`, req.url), { request: { headers } })
    }
    if (p === '/trailers' || p.startsWith('/trailers/')) return NextResponse.redirect(new URL(`/${search}`, req.url), 307)
    // everything else is the main site's
    return onLogoless(host) ? NextResponse.redirect(`${MAIN}${p}${search}`, 307) : NextResponse.redirect(new URL('/', req.url), 307)
  }

  const trailers = p === '/trailers' || p.startsWith('/trailers/')
  if (trailers && onLogoless(host)) return NextResponse.redirect(`${SCROLL}/${search}`, 307)
  // the sign-in hand-off page for scroll is also a bare, full-screen page
  if (trailers || p === '/scroll-signin') headers.set('x-bare', '1')
  return NextResponse.next({ request: { headers } })
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'] }
