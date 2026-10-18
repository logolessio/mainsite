import { db } from './db'
import { RETIRED_EDITS } from './retired-edits'

export type PendingEdit = { key: string; original: string; value: string; page: string; updatedAt: number }

/**
 * Sentences edited in the text editor that are not written into the code yet. An edit stays live (shown from the database) until
 * the automatic job (.github/workflows/hardcode-text.yml, scripts/hardcode-edits.mjs) writes it into the source and lists it in
 * lib/retired-edits.ts; from then on it is skipped here and the code is what the site shows.
 */
export async function pendingEdits(): Promise<PendingEdit[]> {
  try {
    const d = await db()
    const rows = (
      await d
        .prepare(
          `SELECT c.key, c.value, c.updated_at, r.original, r.page FROM content c JOIN content_registry r ON r.key = c.key
           WHERE c.key LIKE 'c_%' ORDER BY c.updated_at`,
        )
        .all<{ key: string; value: string; updated_at: number; original: string; page: string }>()
    ).results
    return rows.filter((r) => RETIRED_EDITS[r.key] !== r.value).map((r) => ({ key: r.key, original: r.original, value: r.value, page: r.page, updatedAt: r.updated_at }))
  } catch {
    return []
  }
}
