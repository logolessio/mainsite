import { featureOn } from '@/lib/features'
import { limit } from '@/lib/guard'
import { assertSameOrigin, HttpError, route } from '@/lib/http'
import { authenticationOptions } from '@/lib/passkeys'

/**
 * Asked by the log in page when someone chooses "Log in with a passkey": hands back the challenge their device has to sign. No email is needed (the device
 * picks the passkey), so nothing here reveals whether an address has an account. The signing in itself happens in auth.ts.
 */
export const POST = route(async (req: Request) => {
  if (!(await featureOn('passkeys'))) throw new HttpError(404, 'Not found.')
  assertSameOrigin(req)
  await limit(req, { name: 'passkey-options', max: 30, windowSec: 900 })
  const { options, cookie } = await authenticationOptions(req)
  return new Response(JSON.stringify(options), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'set-cookie': cookie } })
})
