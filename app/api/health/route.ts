import { runHealth } from '@/lib/health'

/** For uptime monitors: 200 when everything is fine, 503 when a part is down. */
export async function GET() {
  const h = await runHealth()
  return Response.json(h, { status: h.ok ? 200 : 503, headers: { 'cache-control': 'no-store' } })
}
