import { bearerOf, revokeAppToken } from '@/lib/app-auth'
import { json, route } from '@/lib/http'

/** Ends this app's sign-in at once (the token stops working everywhere). */
export const POST = route(async (req: Request) => {
  const token = bearerOf(req)
  if (token) await revokeAppToken(token)
  return json({ ok: true })
})
