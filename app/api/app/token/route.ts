import { redeemAppCode } from '@/lib/app-auth'
import { limit } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'

/** The Mac app swaps the code it was handed (and the secret it kept) for a token. No cookie, so there is nothing for a website to forge. */
export const POST = route(async (req: Request) => {
  await limit(req, { name: 'app-token', max: 20, windowSec: 600 })
  const { code, verifier, device } = await body<{ code?: string; verifier?: string; device?: string }>(req, 2048)
  if (typeof code !== 'string' || typeof verifier !== 'string') throw new HttpError(400, 'That sign-in request is not valid.')
  const r = await redeemAppCode(code, verifier, typeof device === 'string' ? device : 'Mac')
  if (!r) throw new HttpError(401, 'That sign-in has expired. Please try again.')
  return json({ token: r.token, email: r.email })
})
