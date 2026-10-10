import { z } from 'zod'
import { audit, resetContent, saveContent } from '@/lib/chain'
import { bustOverrides } from '@/lib/copy'
import { HERO_VARIANTS_DEFAULT, HERO_VARIANTS_KEY } from '@/lib/copy-key'
import { db } from '@/lib/db'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

const KEY = z.string().regex(/^(c_[0-9a-f]{16}|hero\.variants)$/)
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim()

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('save'), key: KEY, value: z.string().min(1).max(2000), reason: z.string().max(300).optional() }),
  z.object({ action: z.literal('reset'), key: KEY, reason: z.string().max(300).optional() }),
])

/** Change or reset one piece of site text. Every change keeps who, when, the old and the new wording. */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'content-edit', max: 60, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 16 * 1024))
  if (!parsed.success) throw new HttpError(400, 'That text is not valid.')
  const a = parsed.data
  const actor = { id: admin.id, email: admin.email }
  const d = await db()

  let original: string
  if (a.key === HERO_VARIANTS_KEY) original = HERO_VARIANTS_DEFAULT.join('\n')
  else {
    const reg = await d.prepare('SELECT original FROM content_registry WHERE key = ?1').bind(a.key).first<{ original: string }>()
    if (!reg) throw new HttpError(404, 'Open the page with text editing on first, so this text is known.')
    original = reg.original
  }

  if (a.action === 'save') {
    const value = a.key === HERO_VARIANTS_KEY ? a.value.split('\n').map(clean).filter(Boolean).slice(0, 60).join('\n') : clean(a.value).replace(/\s+/g, ' ')
    if (!value) throw new HttpError(400, 'The text cannot be empty.')
    await saveContent(actor, a.key, value, a.reason)
  } else {
    await resetContent(actor, a.key, original, a.reason)
  }
  bustOverrides()
  await audit(actor, `content.${a.action}`, a.key, a.action === 'save' ? clean(a.value).slice(0, 200) : 'reset', await ipHash(req))
  return json({ ok: true })
})
