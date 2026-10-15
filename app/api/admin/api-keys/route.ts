import { z } from 'zod'
import { requireAdminSecret } from '@/lib/admin-secret'
import { API_SCOPES, createApiKey, isScope, listApiKeys, revokeApiKey } from '@/lib/adminapi'
import { audit } from '@/lib/chain'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

export const GET = route(async () => {
  await requireAdmin()
  return json({ keys: await listApiKeys(), scopes: API_SCOPES })
})

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('create'), name: z.string().trim().min(2).max(40), scopes: z.array(z.string()).min(1).max(4), secret: z.string().max(200).optional() }),
  z.object({ action: z.literal('revoke'), id: z.string().regex(/^[0-9a-f]{10}$/), secret: z.string().max(200).optional() }),
])

/** Make or revoke a key for the owner API. Both ask for the admin password. A new key is shown once and never again. */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-api-keys', max: 20, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 2048))
  if (!parsed.success) throw new HttpError(400, 'Give the key a name and at least one scope.')
  const a = parsed.data
  await requireAdminSecret(admin.id, a.secret)
  const actor = { id: admin.id, email: admin.email }
  if (a.action === 'create') {
    const scopes = a.scopes.filter(isScope)
    if (!scopes.length) throw new HttpError(400, 'Pick at least one scope.')
    const made = await createApiKey(a.name, scopes, admin.email)
    await audit(actor, 'apikey.create', made.record.id, `${a.name}: ${scopes.join(', ')}`, await ipHash(req))
    return json({ ok: true, key: made.key, record: made.record })
  }
  const ok = await revokeApiKey(a.id)
  if (!ok) throw new HttpError(404, 'That key does not exist.')
  await audit(actor, 'apikey.revoke', a.id, null, await ipHash(req))
  return json({ ok: true })
})
