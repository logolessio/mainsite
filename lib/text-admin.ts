import { audit, resetContent, saveContent } from './chain'
import { bustOverrides } from './copy'
import { copyKey, HERO_VARIANTS_DEFAULT, HERO_VARIANTS_KEY, norm } from './copy-key'
import { db, nowSec } from './db'
import { HttpError } from './http'
import { applyWording } from './wording'

/**
 * Managing the site's text without the on-page editor: list every sentence the site knows, change or reset one, edit the home
 * headline lines, and (best effort) read the public pages to learn sentences nobody has opened the editor on yet.
 * Used by the owner API (/api/v1/text). A change is stored under the hash of the ORIGINAL sentence, exactly as the editor does.
 */
type Actor = { id: string | null; email: string }
export const PUBLIC_PAGES = ['/', '/welcome', '/how-it-works', '/for-brands', '/for-creators', '/pricing', '/payouts', '/trust', '/faq', '/about', '/contact', '/careers', '/login', '/signup', '/case-studies', '/leaderboard', '/status', '/developers']

const clean = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim()

export type TextItem = { key: string; original: string; shown: string; edited: string | null; page: string; updatedAt: number | null; updatedBy: string | null }

export async function listText(o: { q?: string; page?: string; edited?: boolean; limit: number; offset: number }) {
  const d = await db()
  const where: string[] = []
  const args: unknown[] = []
  if (o.q) {
    args.push(`%${o.q.replace(/[%_]/g, '')}%`)
    where.push(`(r.original LIKE ?${args.length} OR c.value LIKE ?${args.length})`)
  }
  if (o.page) {
    args.push(o.page)
    where.push(`r.page = ?${args.length}`)
  }
  if (o.edited) where.push('c.value IS NOT NULL')
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const [rows, total, pages, edited] = await Promise.all([
    d
      .prepare(`SELECT r.key, r.original, r.page, c.value AS edited, c.updated_at, c.updated_by FROM content_registry r LEFT JOIN content c ON c.key = r.key ${clause} ORDER BY r.page, r.original LIMIT ${o.limit} OFFSET ${o.offset}`)
      .bind(...args)
      .all<{ key: string; original: string; page: string; edited: string | null; updated_at: number | null; updated_by: string | null }>(),
    d.prepare(`SELECT COUNT(*) AS n FROM content_registry r LEFT JOIN content c ON c.key = r.key ${clause}`).bind(...args).first<{ n: number }>(),
    d.prepare('SELECT page, COUNT(*) AS n FROM content_registry GROUP BY page ORDER BY page').all<{ page: string; n: number }>(),
    d.prepare("SELECT COUNT(*) AS n FROM content WHERE key LIKE 'c_%'").first<{ n: number }>(),
  ])
  const items: TextItem[] = rows.results.map((r) => ({ key: r.key, original: r.original, shown: r.edited ?? applyWording(r.original), edited: r.edited, page: r.page, updatedAt: r.updated_at, updatedBy: r.updated_by }))
  return { total: total?.n ?? 0, edited: edited?.n ?? 0, pages: pages.results, items }
}

export async function textHistory(key: string, limit = 20) {
  const d = await db()
  const reg = await d.prepare('SELECT original, page FROM content_registry WHERE key = ?1').bind(key).first<{ original: string; page: string }>()
  const cur = await d.prepare('SELECT value, updated_at, updated_by FROM content WHERE key = ?1').bind(key).first<{ value: string; updated_at: number; updated_by: string }>()
  if (!reg && !cur) throw new HttpError(404, 'No text with that key.')
  const history = (await d.prepare(`SELECT old_value, new_value, editor_email, reason, created_at FROM content_versions WHERE key = ?1 ORDER BY id DESC LIMIT ${Math.max(1, Math.min(100, limit))}`).bind(key).all()).results
  return { key, original: reg?.original ?? null, page: reg?.page ?? null, edited: cur?.value ?? null, updatedAt: cur?.updated_at ?? null, updatedBy: cur?.updated_by ?? null, history }
}

/**
 * Changes one sentence. Give its `key` (from the list), or its `original` wording (the sentence exactly as written in the code),
 * which also adds it to the list if it was not there yet.
 */
export async function saveText(actor: Actor, a: { key?: string; original?: string; value: string; reason?: string }) {
  const value = clean(a.value).replace(/\s+/g, ' ')
  if (!value) throw new HttpError(400, 'The text cannot be empty.')
  if (value.length > 2000) throw new HttpError(400, 'That text is too long (2000 characters at most).')
  const d = await db()
  let key = a.key ?? ''
  if (a.original) {
    const original = norm(a.original)
    if (original.length < 2 || original.length > 2000) throw new HttpError(400, 'The original sentence is not valid.')
    key = copyKey(original)
    await d
      .prepare("INSERT INTO content_registry (key, original, page, seen_at) VALUES (?1, ?2, 'api', ?3) ON CONFLICT(key) DO UPDATE SET seen_at = excluded.seen_at")
      .bind(key, original, nowSec())
      .run()
  } else {
    if (!/^c_[0-9a-f]{16}$/.test(key)) throw new HttpError(400, 'Give the key of a sentence from the list, or its original wording.')
    const known = await d.prepare('SELECT 1 AS x FROM content_registry WHERE key = ?1').bind(key).first()
    if (!known) throw new HttpError(404, 'That text is not in the list yet. Send its original wording instead.')
  }
  await saveContent(actor, key, value, a.reason)
  bustOverrides()
  await audit(actor, 'content.save', key, value.slice(0, 200))
  return { key }
}

export async function resetText(actor: Actor, key: string, reason?: string) {
  if (!/^c_[0-9a-f]{16}$/.test(key)) throw new HttpError(400, 'That is not a text key.')
  const d = await db()
  const reg = await d.prepare('SELECT original FROM content_registry WHERE key = ?1').bind(key).first<{ original: string }>()
  if (!reg) throw new HttpError(404, 'No text with that key.')
  await resetContent(actor, key, reg.original, reason)
  bustOverrides()
  await audit(actor, 'content.reset', key, 'reset')
}

// ---------- the home page headline ----------
export async function getHero() {
  const d = await db()
  const r = await d.prepare('SELECT value FROM content WHERE key = ?1').bind(HERO_VARIANTS_KEY).first<{ value: string }>()
  return { variants: (r?.value ?? HERO_VARIANTS_DEFAULT.join('\n')).split('\n').filter(Boolean), isDefault: !r }
}

export async function setHero(actor: Actor, variants: string[] | null) {
  if (variants === null) {
    await resetContent(actor, HERO_VARIANTS_KEY, HERO_VARIANTS_DEFAULT.join('\n'))
    bustOverrides()
    await audit(actor, 'content.reset', HERO_VARIANTS_KEY, 'reset')
    return
  }
  const lines = variants.map((v) => clean(v).replace(/\s+/g, ' ')).filter(Boolean).slice(0, 60)
  if (lines.length === 0) throw new HttpError(400, 'Give at least one line.')
  await saveContent(actor, HERO_VARIANTS_KEY, lines.join('\n'))
  bustOverrides()
  await audit(actor, 'content.save', HERO_VARIANTS_KEY, lines.join(' | ').slice(0, 200))
}

// ---------- learning the sentences on the public pages ----------
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', ndash: '–', mdash: '—' }
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? Number.parseInt(e.slice(2), 16) : Number.parseInt(e.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })

/** The plain sentences in a page: text that is the only thing inside its element, the same as the on-page editor sees. */
export function sentencesIn(html: string): string[] {
  const body = (/<body[\s>][\s\S]*<\/body>/i.exec(html)?.[0] ?? html)
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|svg|code|pre|textarea|noscript|select|option|canvas)\b[\s\S]*?<\/\1>/gi, '')
  const out = new Set<string>()
  const re = /<([a-zA-Z][a-zA-Z0-9]*)(?:\s[^<>]*)?>([^<>]{3,900})<\/\1>/g
  for (let m = re.exec(body); m; m = re.exec(body)) {
    const text = norm(decode(m[2]))
    if (text.length < 3 || text.length > 600 || !/[A-Za-z]{2}/.test(text)) continue
    if (/[{}]|^\W+$/.test(text)) continue
    out.add(text)
  }
  return [...out]
}

/**
 * Reads the public pages of this site and adds the sentences they show to the list. Best effort: a page that cannot be read is
 * reported and skipped. Sentences that already are an edit are left out, so an edit never shows up as an "original".
 */
export async function scanPublicPages(origin: string, pages = PUBLIC_PAGES) {
  const d = await db()
  const edited = new Set((await d.prepare('SELECT value FROM content').all<{ value: string }>()).results.map((r) => norm(r.value)))
  const before = (await d.prepare('SELECT COUNT(*) AS n FROM content_registry').first<{ n: number }>())?.n ?? 0
  const failed: { page: string; reason: string }[] = []
  let read = 0
  let found = 0
  const t = nowSec()
  for (const page of pages) {
    try {
      const res = await fetch(`${origin}${page}`, { headers: { accept: 'text/html', 'user-agent': 'logoless-text-scan' }, redirect: 'follow', signal: AbortSignal.timeout(9000) })
      if (!res.ok) {
        failed.push({ page, reason: `status ${res.status}` })
        continue
      }
      const html = await res.text()
      if (!/<html/i.test(html)) {
        failed.push({ page, reason: 'not a page' })
        continue
      }
      const items = sentencesIn(html).filter((s) => !edited.has(s))
      read++
      found += items.length
      for (let i = 0; i < items.length; i += 40) {
        await d.batch(
          items
            .slice(i, i + 40)
            .map((s) => d.prepare('INSERT INTO content_registry (key, original, page, seen_at) VALUES (?1,?2,?3,?4) ON CONFLICT(key) DO UPDATE SET seen_at = excluded.seen_at').bind(copyKey(s), s, page, t)),
        )
      }
    } catch (e) {
      failed.push({ page, reason: e instanceof Error ? e.message.slice(0, 80) : 'could not be read' })
    }
  }
  const after = (await d.prepare('SELECT COUNT(*) AS n FROM content_registry').first<{ n: number }>())?.n ?? 0
  return { pagesRead: read, sentencesSeen: found, added: Math.max(0, after - before), total: after, failed }
}
