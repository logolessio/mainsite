import { abortBig, beginBig, CHUNK, finishBig, putPiece, type BigType } from '@/lib/chunks'
import { protect } from '@/lib/guard'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

/**
 * Songs, videos and GIFs of any size up to the person's 50 MB. The browser sends the file a piece at a time:
 *   POST ?step=begin   { type, kind?, size }  ->  { id, chunk, pieces }
 *   PUT  ?step=piece&id=&n=   (raw bytes)     ->  { ok }
 *   POST ?step=finish  { id }                 ->  { id }
 *   DELETE ?id=                               ->  stops an upload that was started
 */
const TYPES: BigType[] = ['audio', 'video', 'gif']

export const POST = route(async (req: Request) => {
  const user = await requireUser()
  const step = new URL(req.url).searchParams.get('step')
  if (step === 'begin') {
    await protect(req, { name: 'upload-big', max: 24, windowSec: 600, userId: user.id })
    const { type, kind, size } = await body<{ type?: string; kind?: string; size?: number }>(req, 2000)
    if (!TYPES.includes(type as BigType)) throw new HttpError(400, 'Unknown upload type.')
    return json(await beginBig(user.id, type as BigType, kind, Number(size)))
  }
  if (step === 'finish') {
    assertSameOrigin(req)
    const { id } = await body<{ id?: string }>(req, 500)
    return json({ id: await finishBig(user.id, String(id ?? '')) })
  }
  throw new HttpError(400, 'Unknown step.')
})

export const PUT = route(async (req: Request) => {
  const user = await requireUser()
  assertSameOrigin(req)
  const u = new URL(req.url)
  const declared = Number(req.headers.get('content-length') ?? 0)
  if (declared > CHUNK) throw new HttpError(413, 'That piece is too large.')
  const bytes = new Uint8Array(await req.arrayBuffer())
  if (bytes.length === 0 || bytes.length > CHUNK) throw new HttpError(400, 'That piece could not be read.')
  await putPiece(user.id, u.searchParams.get('id') ?? '', Number(u.searchParams.get('n')), bytes)
  return json({ ok: true })
})

export const DELETE = route(async (req: Request) => {
  const user = await requireUser()
  assertSameOrigin(req)
  await abortBig(user.id, new URL(req.url).searchParams.get('id') ?? '')
  return json({ ok: true })
})
