// Each person has 50 MB of storage of their own. It counts everything they have kept: pictures, GIFs, videos, cursors and songs on our own storage, and the
// files they host for their links. (A link to a file kept somewhere else costs nothing.)
import { db } from './db'
import { HttpError } from './http'

export const USER_QUOTA_BYTES = 50 * 1024 * 1024

export type Used = { bytes: number; byKind: Record<string, { n: number; bytes: number }> }

export async function storageUsed(userId: string): Promise<Used> {
  const rows = (await (await db()).prepare('SELECT kind, COUNT(*) AS n, COALESCE(SUM(size), 0) AS bytes FROM uploads WHERE user_id = ?1 GROUP BY kind').bind(userId).all<{ kind: string; n: number; bytes: number }>()).results
  const byKind: Used['byKind'] = {}
  let bytes = 0
  for (const r of rows) {
    byKind[r.kind] = { n: r.n, bytes: r.bytes }
    bytes += r.bytes
  }
  return { bytes, byKind }
}

const left = (used: number) => Math.max(0, USER_QUOTA_BYTES - used)
export const megabytes = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(n >= 10485760 ? 0 : 1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

/**
 * Makes sure `add` more bytes fit in this person's 50 MB. If they do not, their oldest pictures, videos and songs that their page is not using are cleared
 * first (they are only kept so a recent one can be put back), and a hosted file is never touched. If it still does not fit, it says so.
 */
export async function makeRoom(userId: string, add: number, inUse: string[]) {
  const d = await db()
  let used = (await storageUsed(userId)).bytes
  if (used + add <= USER_QUOTA_BYTES) return
  const old = (await d.prepare("SELECT id, size FROM uploads WHERE user_id = ?1 AND kind != 'file' ORDER BY created_at ASC").bind(userId).all<{ id: string; size: number }>()).results
  for (const r of old) {
    if (inUse.includes(r.id)) continue
    await d.prepare('DELETE FROM uploads WHERE id = ?1').bind(r.id).run()
    used -= r.size
    if (used + add <= USER_QUOTA_BYTES) return
  }
  throw new HttpError(413, `That would take you past your ${megabytes(USER_QUOTA_BYTES)} of storage (you have ${megabytes(left(used))} left). Remove a hosted file, or paste a link to it instead.`)
}
