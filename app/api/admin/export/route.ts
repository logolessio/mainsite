import { auditSafe } from '@/lib/chain'
import { db } from '@/lib/db'
import { EXPORTS } from '@/lib/export-sets'
import { limit } from '@/lib/guard'
import { HttpError, route } from '@/lib/http'
import { eventWhere, sinceFor, type Range } from '@/lib/log-stats'
import { requireAdmin } from '@/lib/user'

const CHUNK = 2000
const MAX_ROWS = 250_000

/** Spreadsheets run text that starts with = + - or @ as a formula, so those cells get a leading apostrophe. */
const cell = (v: unknown) => {
  if (v === null || v === undefined) return ''
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Download a table as CSV or JSON. Admin only, rate limited, and every export is written to the audit log. */
export const GET = route(async (req: Request) => {
  const admin = await requireAdmin()
  await limit(req, { name: 'export', max: 12, windowSec: 600, userId: admin.id })
  const url = new URL(req.url)
  const id = url.searchParams.get('dataset') ?? ''
  const format = url.searchParams.get('format') === 'json' ? 'json' : 'csv'
  const d = await db()

  if (id === 'all' && format !== 'json') throw new HttpError(400, 'The full download is JSON only.')
  const sets = id === 'all' ? EXPORTS : EXPORTS.filter((e) => e.id === id)
  if (!sets.length) throw new HttpError(404, 'Unknown dataset.')

  // The activity log respects the same range and filters as the page.
  const range = (url.searchParams.get('range') as Range) ?? 'all'
  const filters = { since: sinceFor(range), kind: url.searchParams.get('kind') ?? undefined, q: url.searchParams.get('q') ?? undefined, status: url.searchParams.get('status') ?? undefined, actor: url.searchParams.get('actor') ?? undefined }

  await auditSafe({ id: admin.id, email: admin.email }, 'export', id, `${format}${id === 'events' ? ` · ${range}` : ''}`)

  const enc = new TextEncoder()
  const stamp = new Date().toISOString().slice(0, 10)
  const queryFor = (s: (typeof EXPORTS)[number]) => {
    if (s.id === 'events') {
      const { sql, args } = eventWhere(filters)
      return { where: `WHERE ${sql}`, args }
    }
    return { where: '', args: [] as unknown[] }
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(c) {
      try {
        if (format === 'csv') {
          const s = sets[0]
          const { where, args } = queryFor(s)
          c.enqueue(enc.encode(`${s.cols.split(',').map((x) => x.trim()).join(',')}\n`))
          const cols = s.cols.split(',').map((x) => x.trim())
          for (let off = 0; off < MAX_ROWS; off += CHUNK) {
            const rows = (await d.prepare(`SELECT ${s.cols} FROM ${s.table} ${where} ORDER BY ${s.order} LIMIT ${CHUNK} OFFSET ${off}`).bind(...args).all<Record<string, unknown>>()).results
            if (!rows.length) break
            c.enqueue(enc.encode(rows.map((r) => cols.map((k) => cell(r[k])).join(',')).join('\n') + '\n'))
            if (rows.length < CHUNK) break
          }
        } else {
          c.enqueue(enc.encode(id === 'all' ? '{' : '['))
          for (let i = 0; i < sets.length; i++) {
            const s = sets[i]
            const { where, args } = queryFor(s)
            if (id === 'all') c.enqueue(enc.encode(`${i ? ',' : ''}${JSON.stringify(s.id)}:[`))
            let first = true
            for (let off = 0; off < MAX_ROWS; off += CHUNK) {
              const rows = (await d.prepare(`SELECT ${s.cols} FROM ${s.table} ${where} ORDER BY ${s.order} LIMIT ${CHUNK} OFFSET ${off}`).bind(...args).all<Record<string, unknown>>()).results
              if (!rows.length) break
              let out = ''
              for (const r of rows) {
                out += (first ? '' : ',') + JSON.stringify(r)
                first = false
              }
              c.enqueue(enc.encode(out))
              if (rows.length < CHUNK) break
            }
            if (id === 'all') c.enqueue(enc.encode(']'))
          }
          c.enqueue(enc.encode(id === 'all' ? '}' : ']'))
        }
        c.close()
      } catch (e) {
        c.error(e)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': format === 'csv' ? 'text/csv; charset=utf-8' : 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="logoless-${id}-${stamp}.${format}"`,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  })
})
