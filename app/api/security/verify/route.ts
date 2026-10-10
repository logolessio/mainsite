import { auditSafe } from '@/lib/chain'
import { humanCookie, verifyTurnstile } from '@/lib/human'
import { limit } from '@/lib/guard'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'

/** Checks a Turnstile result and, if it passes, sets the short-lived "human" cookie. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  await limit(req, { name: 'human', max: 20, windowSec: 600 })
  const { token } = await body<{ token?: string }>(req, 8 * 1024)
  if (typeof token !== 'string' || !token || token.length > 4096) throw new HttpError(400, 'Missing check result.')
  try {
    await verifyTurnstile(token, req)
  } catch (e) {
    await auditSafe({ id: null, email: 'system' }, 'captcha.failed', null, e instanceof Error ? e.message : 'failed')
    throw e
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'set-cookie': await humanCookie(req) },
  })
})
