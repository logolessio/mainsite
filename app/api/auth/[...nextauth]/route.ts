import { handlers } from '@/auth'
import { hasHuman } from '@/lib/human'
import { limit } from '@/lib/guard'

/**
 * Auth.js does the sign-in. We wrap it so that starting a sign-in needs a passed human check (Turnstile), and so that
 * sign-in attempts are rate limited per network. Everything else (callbacks, session, sign-out) goes straight through.
 */
const STARTS_SIGN_IN = /\/signin\/[a-z]+$/i
const CHECKS_CODE = /\/callback\/email-code$/i

async function gate(req: Request) {
  const { pathname } = new URL(req.url)
  if (CHECKS_CODE.test(pathname)) {
    // Guessing a code: a few tries per network, and each code also dies after 5 wrong tries.
    await limit(req, { name: 'code-check', max: 15, windowSec: 600 }).catch(() => {
      throw new Response('Too many attempts. Please wait a few minutes.', { status: 429 })
    })
    return null
  }
  if (!STARTS_SIGN_IN.test(pathname)) return null
  await limit(req, { name: 'signin', max: 20, windowSec: 600 }).catch(() => {
    throw new Response('Too many attempts. Please wait a few minutes.', { status: 429 })
  })
  if (!(await hasHuman(req))) return new Response('Human check required.', { status: 403 })
  return null
}

export async function GET(req: Request) {
  try {
    return (await gate(req)) ?? handlers.GET(req as never)
  } catch (r) {
    if (r instanceof Response) return r
    throw r
  }
}

export async function POST(req: Request) {
  try {
    return (await gate(req)) ?? handlers.POST(req as never)
  } catch (r) {
    if (r instanceof Response) return r
    throw r
  }
}
