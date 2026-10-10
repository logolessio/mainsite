import { hmacHex, safeEqual } from './crypto'
import { setting } from './db'
import { ipHash } from './guard'
import { HttpError } from './http'

/**
 * "Prove you are human" before an account can be created or signed in to. Cloudflare Turnstile does the check in the
 * browser. When it passes we hand back a short-lived signed cookie, and the sign-in route refuses to start without it.
 * Until the two Turnstile keys are added the check is skipped, and the admin dashboard says so.
 */
const COOKIE = 'll_human'
const TTL = 15 * 60

export async function captchaConfigured() {
  return Boolean((await setting('TURNSTILE_SECRET_KEY')) && (await setting('TURNSTILE_SITE_KEY')))
}

async function secret() {
  return (await setting('AUTH_SECRET')) ?? 'logoless'
}

export async function verifyTurnstile(token: string, req: Request) {
  const key = await setting('TURNSTILE_SECRET_KEY')
  if (!key) throw new HttpError(503, 'The human check is not set up yet.')
  const form = new URLSearchParams({ secret: key, response: token })
  const ip = req.headers.get('cf-connecting-ip')
  if (ip) form.set('remoteip', ip)
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form })
  const j = (await res.json().catch(() => null)) as { success?: boolean; hostname?: string } | null
  if (!j?.success) throw new HttpError(400, 'We could not confirm you are human. Please try again.')
  if (j.hostname && j.hostname !== new URL(req.url).hostname && j.hostname !== 'localhost') throw new HttpError(400, 'That check was for another site.')
}

/** Builds the Set-Cookie value that proves a recent successful check from this network. */
export async function humanCookie(req: Request) {
  const exp = Math.floor(Date.now() / 1000) + TTL
  const sig = await hmacHex(await secret(), `human|${exp}|${await ipHash(req)}`)
  const secure = new URL(req.url).protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https'
  return `${COOKIE}=${exp}.${sig}; Max-Age=${TTL}; Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
}

export async function hasHuman(req: Request) {
  if (!(await captchaConfigured())) return true
  const raw = req.headers.get('cookie')?.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1)
  if (!raw) return false
  const [exp, sig] = raw.split('.')
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false
  return safeEqual(sig, await hmacHex(await secret(), `human|${exp}|${await ipHash(req)}`))
}
