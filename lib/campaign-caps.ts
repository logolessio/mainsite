import { db, nowSec } from './db'

/**
 * Optional limits on what one campaign pays: the most a single clip can earn, and the most one clipper can earn across the whole
 * campaign. Zero means no limit. They live in the settings table ("campaign-caps:<id>"), so no database change is needed.
 */
export type Caps = { perPostCents: number; perUserCents: number }
export const NO_CAPS: Caps = { perPostCents: 0, perUserCents: 0 }
const key = (id: string) => `campaign-caps:${id}`

const clamp = (n: unknown) => Math.max(0, Math.min(100_000_000, Math.round(Number(n) || 0)))

export async function getCaps(id: string): Promise<Caps> {
  const d = await db()
  const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(key(id)).first<{ value: string }>()
  try {
    const j = r ? (JSON.parse(r.value) as Partial<Caps>) : {}
    return { perPostCents: clamp(j.perPostCents), perUserCents: clamp(j.perUserCents) }
  } catch {
    return NO_CAPS
  }
}

export async function allCaps(): Promise<Record<string, Caps>> {
  const d = await db()
  const rows = (await d.prepare("SELECT key, value FROM settings WHERE key LIKE 'campaign-caps:%'").all<{ key: string; value: string }>()).results
  const out: Record<string, Caps> = {}
  for (const r of rows) {
    try {
      const j = JSON.parse(r.value) as Partial<Caps>
      out[r.key.slice('campaign-caps:'.length)] = { perPostCents: clamp(j.perPostCents), perUserCents: clamp(j.perUserCents) }
    } catch {
      /* skip */
    }
  }
  return out
}

export async function setCaps(id: string, caps: Partial<Caps>, budgetCents: number): Promise<Caps> {
  const prev = await getCaps(id)
  let next: Caps = { perPostCents: caps.perPostCents === undefined ? prev.perPostCents : clamp(caps.perPostCents), perUserCents: caps.perUserCents === undefined ? prev.perUserCents : clamp(caps.perUserCents) }
  // a clip cannot be allowed more than a clipper, and neither more than the whole budget
  if (next.perUserCents > 0 && budgetCents > 0) next.perUserCents = Math.min(next.perUserCents, budgetCents)
  if (next.perPostCents > 0 && next.perUserCents > 0) next.perPostCents = Math.min(next.perPostCents, next.perUserCents)
  if (next.perPostCents > 0 && budgetCents > 0) next.perPostCents = Math.min(next.perPostCents, budgetCents)
  next = { perPostCents: next.perPostCents, perUserCents: next.perUserCents }
  const d = await db()
  if (!next.perPostCents && !next.perUserCents) await d.prepare('DELETE FROM settings WHERE key = ?1').bind(key(id)).run()
  else
    await d
      .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
      .bind(key(id), JSON.stringify(next), nowSec())
      .run()
  return next
}

/** How much of a payout a cap lets through. `earnedOnClip` and `earnedByClipper` are what has already been paid (net, in cents). */
export function allowedPayout(wanted: number, caps: Caps, earnedOnClip: number, earnedByClipper: number) {
  let allowed = wanted
  let by: 'post' | 'user' | null = null
  if (caps.perPostCents > 0) {
    const room = Math.max(0, caps.perPostCents - earnedOnClip)
    if (room < allowed) (allowed = room), (by = 'post')
  }
  if (caps.perUserCents > 0) {
    const room = Math.max(0, caps.perUserCents - earnedByClipper)
    if (room < allowed) (allowed = room), (by = 'user')
  }
  return { allowed, by }
}
