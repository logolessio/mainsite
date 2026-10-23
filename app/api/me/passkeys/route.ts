import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { featureOn } from '@/lib/features'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { clearCookie, finishRegistration, passkeysOf, registrationOptions, relyingParty, removePasskey, viewOf } from '@/lib/passkeys'
import { requireUser } from '@/lib/user'

const noStore = { 'content-type': 'application/json', 'cache-control': 'no-store' }

/** The signed-in person's passkeys (no keys, only names and dates), and whether this address can use passkeys at all. */
export const GET = route(async (req: Request) => {
  if (!(await featureOn('passkeys'))) throw new HttpError(404, 'Not found.')
  const user = await requireUser()
  return json({ supported: relyingParty(req) !== null, passkeys: viewOf(await passkeysOf(user.email)) })
})

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('options') }),
  z.object({ action: z.literal('verify'), response: z.record(z.string(), z.unknown()), name: z.string().max(60).optional() }),
  z.object({ action: z.literal('remove'), id: z.string().min(1).max(1400) }),
])

export const POST = route(async (req: Request) => {
  if (!(await featureOn('passkeys'))) throw new HttpError(404, 'Not found.')
  const user = await requireUser()
  await protect(req, { name: 'passkey', max: 30, windowSec: 900, userId: user.id })
  const parsed = schema.safeParse(await body(req, 24_000))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const a = parsed.data
  if (a.action === 'options') {
    const { options, cookie } = await registrationOptions(req, user)
    return new Response(JSON.stringify(options), { headers: { ...noStore, 'set-cookie': cookie } })
  }
  if (a.action === 'verify') {
    const list = await finishRegistration(req, user, a.response as never, a.name ?? '')
    await auditSafe({ id: user.id, email: user.email }, 'security.passkey_added', user.id)
    return new Response(JSON.stringify({ passkeys: list }), { headers: { ...noStore, 'set-cookie': clearCookie(req) } })
  }
  if (!(await removePasskey(user.email, a.id))) throw new HttpError(404, 'That passkey is already gone.')
  await auditSafe({ id: user.id, email: user.email }, 'security.passkey_removed', user.id)
  return json({ passkeys: viewOf(await passkeysOf(user.email)) })
})
