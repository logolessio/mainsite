import { encode } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import { redeemWebCode } from '@/lib/app-auth'
import { limit } from '@/lib/guard'
import { db, setting } from '@/lib/db'

/**
 * Lands the Mac/iPhone app's web view on a page of the website, signed in. The code comes from /api/app/web-link, works once and only for
 * a minute. It sets the same session cookie that signing in on the website sets (shared across logoless.io on the real site).
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  try {
    await limit(req, { name: 'app-web-open', max: 60, windowSec: 600 })
  } catch {
    return new NextResponse('Too many tries. Please wait a moment.', { status: 429 })
  }
  const r = await redeemWebCode(url.searchParams.get('code') ?? '')
  if (!r) return NextResponse.redirect(new URL('/login', url.origin), 303)

  const secret = (await setting('AUTH_SECRET')) ?? ''
  if (!secret) return new NextResponse('Sign-in is not set up.', { status: 503 })
  const secure = process.env.NODE_ENV === 'production'
  const name = secure ? '__Secure-authjs.session-token' : 'authjs.session-token'
  const admins = ((await setting('ADMIN_EMAILS')) ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  const maxAge = 14 * 24 * 60 * 60
  const u = await (await db()).prepare('SELECT name, image FROM users WHERE email = ?1').bind(r.email).first<{ name: string | null; image: string | null }>().catch(() => null)
  const token = await encode({ token: { email: r.email, name: u?.name ?? r.email.split('@')[0], picture: u?.image ?? undefined, sub: r.email, role: admins.includes(r.email) ? 'admin' : 'user' }, secret, salt: name, maxAge })

  const host = url.hostname
  const shared = host === 'logoless.io' || host.endsWith('.logoless.io')
  const res = NextResponse.redirect(new URL(r.next, url.origin), 303)
  res.cookies.set(name, token, { httpOnly: true, sameSite: 'lax', path: '/', secure, maxAge, ...(shared ? { domain: '.logoless.io' } : {}) })
  res.headers.set('cache-control', 'no-store')
  return res
}
