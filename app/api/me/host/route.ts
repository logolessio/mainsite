import { db, nowSec, uid } from '@/lib/db'
import { HOST_QUOTA_BYTES, MAX_HOST_BYTES, MAX_HOST_FILES, hostToken, looksExecutable, newFileFolder, putFile, removeFolder, safeName } from '@/lib/buzzheavier'
import { protect } from '@/lib/guard'
import { HttpError, json, route } from '@/lib/http'
import { requireUser } from '@/lib/user'

const usage = async (userId: string) => {
  const row = await (await db()).prepare("SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS bytes FROM uploads WHERE user_id = ?1 AND kind = 'file'").bind(userId).first<{ n: number; bytes: number }>()
  return { files: row?.n ?? 0, bytes: row?.bytes ?? 0 }
}

/** Is file hosting switched on, and how much of it has this person used? */
export const GET = route(async () => {
  const user = await requireUser()
  const used = await usage(user.id)
  return json({ enabled: Boolean(await hostToken()), maxBytes: MAX_HOST_BYTES, quotaBytes: HOST_QUOTA_BYTES, maxFiles: MAX_HOST_FILES, ...used })
})

/**
 * Hosts a file for a link on the page. The file's bytes are sent as the body (not wrapped in anything), and go straight on to Buzzheavier without being
 * held here. Answers with the address of the file's download page.
 */
export const PUT = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'host', max: 8, windowSec: 600, userId: user.id })
  const token = await hostToken()
  if (!token) throw new HttpError(503, 'File hosting is not switched on yet.')

  const name = safeName(new URL(req.url).searchParams.get('name') ?? '')
  const length = Number(req.headers.get('content-length'))
  if (!Number.isFinite(length) || length <= 0) throw new HttpError(400, 'That file is empty.')
  if (length > MAX_HOST_BYTES) throw new HttpError(413, `That file is over ${Math.round(MAX_HOST_BYTES / 1048576)} MB. Split it into a zip in parts, or host it somewhere else and paste the link.`)
  const used = await usage(user.id)
  if (used.files >= MAX_HOST_FILES) throw new HttpError(409, `You are hosting ${MAX_HOST_FILES} files already. Remove one first.`)
  if (used.bytes + length > HOST_QUOTA_BYTES) throw new HttpError(409, `That would take you over ${Math.round(HOST_QUOTA_BYTES / 1048576)} MB of hosted files. Remove one first.`)
  if (!req.body) throw new HttpError(400, 'That file could not be read.')
  const mime = /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/i.test(req.headers.get('content-type') ?? '') ? (req.headers.get('content-type') as string).slice(0, 100) : 'application/octet-stream'

  // look at how the file starts before anything is kept, then pass it on with the rest, counting what goes by
  const reader = req.body.getReader()
  const first = await reader.read()
  const head = first.value
  if (first.done || !head || !head.length) throw new HttpError(400, 'That file is empty.')
  if (looksExecutable(head)) throw new HttpError(400, 'Programs cannot be hosted here. Put it in a zip first.')
  let seen = head.length
  let sentFirst = false
  const body = new ReadableStream<Uint8Array>({
    async pull(c) {
      if (!sentFirst) {
        sentFirst = true
        c.enqueue(head)
        return
      }
      const next = await reader.read()
      if (next.done) return c.close()
      seen += next.value.length
      if (seen > length || seen > MAX_HOST_BYTES) {
        c.error(new HttpError(413, 'That file is larger than it said it was.'))
        await reader.cancel().catch(() => null)
        return
      }
      c.enqueue(next.value)
    },
    async cancel() {
      await reader.cancel().catch(() => null)
    },
  })

  const dir = await newFileFolder(token, uid())
  let fileId: string
  try {
    fileId = await putFile(token, dir, name, mime, length, body)
  } catch (e) {
    await removeFolder(token, dir)
    throw e
  }
  await (await db())
    .prepare("INSERT INTO uploads (id, user_id, kind, mime, size, data, created_at) VALUES (?1, ?2, 'file', ?3, ?4, ?5, ?6)")
    .bind(uid(), user.id, mime, length, `bh:${dir}:${fileId}`, nowSec())
    .run()
  return json({ id: fileId, url: `https://buzzheavier.com/${fileId}`, name, size: length })
})

/** Takes one of this person's hosted files away (by the id in its address). */
export const DELETE = route(async (req: Request) => {
  const user = await requireUser()
  await protect(req, { name: 'host-remove', max: 30, windowSec: 600, userId: user.id })
  const id = new URL(req.url).searchParams.get('id') ?? ''
  if (!/^[a-z0-9]{6,32}$/i.test(id)) throw new HttpError(400, 'Which file?')
  const token = await hostToken()
  if (!token) throw new HttpError(503, 'File hosting is not switched on yet.')
  const d = await db()
  const row = await d.prepare("SELECT id, data FROM uploads WHERE user_id = ?1 AND kind = 'file' AND data LIKE ?2").bind(user.id, `bh:%:${id}`).first<{ id: string; data: string }>()
  if (!row) throw new HttpError(404, 'That is not one of your files.')
  await removeFolder(token, row.data.split(':')[1])
  await d.prepare('DELETE FROM uploads WHERE id = ?1').bind(row.id).run()
  return json({ ok: true })
})
