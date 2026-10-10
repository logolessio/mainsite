import { sha256Hex } from './crypto'
import { db, nowSec } from './db'
import { HttpError } from './http'

/**
 * Tamper-evident logs. Every row stores the hash of the row before it, so editing or deleting an old row breaks
 * the chain, and the admin audit page shows it. A UNIQUE index on prev_hash stops two rows claiming the same parent.
 */
const GENESIS = '0'.repeat(64)
const SEP = '\u001f'
const isConflict = (e: unknown) => /UNIQUE|constraint/i.test(e instanceof Error ? e.message : String(e))

export type Actor = { id: string | null; email: string }

export async function audit(actor: Actor, action: string, target?: string | null, detail?: string | null, ipHash?: string | null) {
  const d = await db()
  for (let i = 0; i < 6; i++) {
    const last = await d.prepare('SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1').first<{ hash: string }>()
    const prev = last?.hash ?? GENESIS
    const t = nowSec()
    const hash = await sha256Hex([prev, actor.email, action, target ?? '', detail ?? '', t].join(SEP))
    try {
      await d
        .prepare(
          'INSERT INTO audit_log (actor_id, actor_email, action, target, detail, ip_hash, created_at, prev_hash, hash) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)',
        )
        .bind(actor.id, actor.email, action, target ?? null, detail ? detail.slice(0, 1000) : null, ipHash ?? null, t, prev, hash)
        .run()
      return
    } catch (e) {
      if (!isConflict(e)) throw e
    }
  }
  throw new HttpError(503, 'The system is busy. Please try again.')
}

/** Best effort: a failed audit write must never hide the thing that happened. */
export async function auditSafe(actor: Actor, action: string, target?: string | null, detail?: string | null) {
  try {
    await audit(actor, action, target, detail)
  } catch (e) {
    console.error('audit failed', action, e instanceof Error ? e.message : e)
  }
}

/** Saves a text change and its history entry in one transaction. */
export async function saveContent(editor: Actor, key: string, value: string, reason?: string | null) {
  const d = await db()
  for (let i = 0; i < 6; i++) {
    const [last, current] = await Promise.all([
      d.prepare('SELECT hash FROM content_versions ORDER BY id DESC LIMIT 1').first<{ hash: string }>(),
      d.prepare('SELECT value FROM content WHERE key = ?1').bind(key).first<{ value: string }>(),
    ])
    const prev = last?.hash ?? GENESIS
    const t = nowSec()
    const old = current?.value ?? null
    const hash = await sha256Hex([prev, key, old ?? '', value, editor.email, t].join(SEP))
    try {
      await d.batch([
        d
          .prepare(
            'INSERT INTO content_versions (key, old_value, new_value, editor_id, editor_email, reason, created_at, prev_hash, hash) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)',
          )
          .bind(key, old, value, editor.id ?? '', editor.email, reason ? reason.slice(0, 300) : null, t, prev, hash),
        d
          .prepare(
            'INSERT INTO content (key, value, updated_at, updated_by) VALUES (?1,?2,?3,?4) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at, updated_by = excluded.updated_by',
          )
          .bind(key, value, t, editor.email),
      ])
      return
    } catch (e) {
      if (!isConflict(e)) throw e
    }
  }
  throw new HttpError(503, 'The system is busy. Please try again.')
}

/** Removes an override so the original text shows again. Recorded as a change like any other. */
export async function resetContent(editor: Actor, key: string, original: string, reason?: string | null) {
  await saveContent(editor, key, original, reason ?? 'Reset to original')
  const d = await db()
  await d.prepare('DELETE FROM content WHERE key = ?1').bind(key).run()
}

export type ChainReport = { ok: boolean; rows: number; brokenAt?: number }

export async function verifyAudit(): Promise<ChainReport> {
  const d = await db()
  const rows = (await d.prepare('SELECT * FROM audit_log ORDER BY id ASC').all<Record<string, string | number | null>>()).results
  let prev = GENESIS
  for (const r of rows) {
    const expect = await sha256Hex([prev, r.actor_email, r.action, r.target ?? '', r.detail ?? '', r.created_at].join(SEP))
    if (r.prev_hash !== prev || r.hash !== expect) return { ok: false, rows: rows.length, brokenAt: Number(r.id) }
    prev = String(r.hash)
  }
  return { ok: true, rows: rows.length }
}

export async function verifyContent(): Promise<ChainReport> {
  const d = await db()
  const rows = (await d.prepare('SELECT * FROM content_versions ORDER BY id ASC').all<Record<string, string | number | null>>()).results
  let prev = GENESIS
  for (const r of rows) {
    const expect = await sha256Hex([prev, r.key, r.old_value ?? '', r.new_value, r.editor_email, r.created_at].join(SEP))
    if (r.prev_hash !== prev || r.hash !== expect) return { ok: false, rows: rows.length, brokenAt: Number(r.id) }
    prev = String(r.hash)
  }
  return { ok: true, rows: rows.length }
}
