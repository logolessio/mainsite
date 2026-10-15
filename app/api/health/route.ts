import { runHealth } from '@/lib/health'

/** Our own addresses may read the answer from each other (the admin Cloudflare check does). It holds no secrets. */
const OWN = /^https:\/\/(www\.|dev\.|admin\.|owner\.)?logoless\.io$/

/** For uptime monitors: 200 when everything is fine, 503 when a part is down. */
export async function GET(req: Request) {
  const h = await runHealth()
  const origin = req.headers.get('origin') ?? ''
  return Response.json(h, {
    status: h.ok ? 200 : 503,
    headers: { 'cache-control': 'no-store', ...(OWN.test(origin) ? { 'access-control-allow-origin': origin, vary: 'origin' } : {}) },
  })
}
