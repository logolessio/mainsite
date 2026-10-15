import { publicJwks, requireDevelopers } from '@/lib/oauth'
import { route } from '@/lib/http'

/** The public key that signs id tokens, so an app can check a token really came from logoless. */
export const GET = route(async () => {
  await requireDevelopers()
  return Response.json(await publicJwks(), { headers: { 'cache-control': 'public, max-age=3600', 'access-control-allow-origin': '*' } })
})
