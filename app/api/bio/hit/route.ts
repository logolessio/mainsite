import { countClick, countView } from '@/lib/bio-store'
import { db } from '@/lib/db'
import { limit } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { classifyUa } from '@/lib/log'

/** A page was opened or a link was pressed. Counted once per request, bots left out, and a person can only add so many in a minute. */
export const POST = route(async (req: Request) => {
  if (classifyUa(req.headers.get('user-agent')) === 'bot') return json({ ok: true })
  await limit(req, { name: 'bio-hit', max: 120, windowSec: 60 })
  const b = (await req.json().catch(() => null)) as { h?: unknown; k?: unknown; b?: unknown } | null
  const h = typeof b?.h === 'string' ? b.h.toLowerCase().slice(0, 40) : ''
  if (!h || (b?.k !== 'view' && b?.k !== 'click')) throw new HttpError(400, 'Not a count.')
  const row = await (await db()).prepare('SELECT user_id FROM profiles WHERE handle = ?1').bind(h).first<{ user_id: string }>()
  if (!row) return json({ ok: true })
  if (b.k === 'view') await countView(row.user_id)
  else if (typeof b.b === 'string' && /^[a-z0-9]{4,16}$/.test(b.b)) await countClick(row.user_id, b.b)
  return json({ ok: true })
})
