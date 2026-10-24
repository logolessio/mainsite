import { NextResponse, type NextRequest } from 'next/server'
import { isBetaHost } from '@/lib/beta-host'
import { isMethodHost, METHOD_HOST } from '@/lib/method-host'
import { clientSlugOf } from '@/lib/client-host'

const MAIN = 'https://logoless.io'

/**
 * Two things are told to the root layout in request headers (it cannot see the address itself), always set or cleared here so a visitor can never send them.
 * x-path is the page asked for. x-client-host is the client's link name when the page is opened on a client's own address.
 *
 * scroll.logoless.io was the movie-trailers site and is gone. The address is still attached to this worker, so anyone with the old link lands on the main site.
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase().split(':')[0]
  const p = req.nextUrl.pathname
  const search = req.nextUrl.search
  const headers = new Headers(req.headers)
  headers.delete('x-path')
  headers.delete('x-client-host')
  headers.set('x-path', p) // the launch page needs to know which page was asked for (the legal pages stay open behind it)

  // beta.logoless.io is the pre-launch sign-up and nothing else: its one page is /onboarding (the bare address opens it), the site's API answers here too
  // (the sign-in cookie is shared across *.logoless.io), the legal pages are open (/legal and every document), and every other path comes back to the sign-up.
  if (isBetaHost(host)) {
    if (p.startsWith('/api/') || p === '/onboarding') {
      headers.set('x-path', '/onboarding')
      return NextResponse.next({ request: { headers } })
    }
    if (p === '/') {
      headers.set('x-path', '/onboarding')
      return NextResponse.rewrite(new URL(`/onboarding${search}`, req.url), { request: { headers } })
    }
    // the legal pages are public here too (they get their own small frame, see components/prelaunch/legal-frame.tsx)
    if (/^\/legal(\/|$)/.test(p)) return NextResponse.next({ request: { headers } })
    return NextResponse.redirect(new URL('/onboarding', req.url), 307)
  }

  // method.logoless.io is Motion4K Optimizer and nothing else: its one page is app/method, opened at the bare address. Every other path comes back to it.
  // Nothing is sent to the server there (the video is processed in the browser), so the site's API is not open on this address.
  if (isMethodHost(host)) {
    if (p === '/') {
      headers.set('x-path', '/method')
      return NextResponse.rewrite(new URL(`/method${search}`, req.url), { request: { headers } })
    }
    return NextResponse.redirect(new URL('/', req.url), 307)
  }
  // ...and the tool lives only on its own address: /method on the main site goes there
  if (p === '/method') {
    const port = req.nextUrl.port
    return NextResponse.redirect(host.endsWith('localhost') ? `http://method.localhost${port ? `:${port}` : ''}/${search}` : `https://${METHOD_HOST}/${search}`, 307)
  }

  // A client's own address (kxng.logoless.io): its home is that client's private page, which is logoless.io/<name> inside the code.
  // The page itself checks the client-links switch. The site's API answers here too (same worker, and the sign-in cookie is shared
  // across *.logoless.io); every other page, sign-in included, belongs to the main site, because Google and Discord only send
  // people back to the main address.
  const client = clientSlugOf(req.headers.get('host') ?? '')
  if (client) {
    if (p.startsWith('/api/')) return NextResponse.next({ request: { headers } })
    if (p === '/') {
      headers.set('x-path', `/${client.slug}`)
      headers.set('x-client-host', client.slug)
      return NextResponse.rewrite(new URL(`/${client.slug}${search}`, req.url), { request: { headers } })
    }
    return NextResponse.redirect(`${client.main}${p}${search}`, 307)
  }

  if (/^scroll\./.test(host)) return NextResponse.redirect(host.endsWith('.logoless.io') ? `${MAIN}${p === '/' ? '' : p}${search}` : new URL('/', req.url), 307)

  return NextResponse.next({ request: { headers } })
}

// Paths with a dot are files and are skipped, except public profiles, whose usernames may contain dots (logoless.io/@luna.ray).
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)', '/@:handle', '/u/:handle'] }
