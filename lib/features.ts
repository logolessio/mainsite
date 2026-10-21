import { headers } from 'next/headers'
import { cache } from 'react'
import { db, nowSec } from './db'
import { FEATURE_IDS, SHIPPED_IDS } from './feature-defs'

/**
 * The dev site and the live site run the same code. A feature on the dev site is always on (so you can try it);
 * on the live site it is on only after someone pressed "push" for it. A push is just a row in the settings table,
 * so it takes effect instantly and can be undone instantly.
 */
export const isDevHostName = (host: string) => /^dev\./i.test(host) || process.env.SITE_ENV === 'dev'

export const requestHost = cache(async () => {
  try {
    return ((await headers()).get('host') ?? '').toLowerCase()
  } catch {
    return ''
  }
})

export type FeatureState = { dev: boolean; live: Record<string, boolean>; on: Record<string, boolean> }

/** The pushed state straight from the database (not cached). */
export async function readLive() {
  const live: Record<string, boolean> = {}
  try {
    const d = await db()
    const rows = (await d.prepare("SELECT key, value FROM settings WHERE key LIKE 'feature:%'").all<{ key: string; value: string }>()).results
    for (const r of rows) live[r.key.slice('feature:'.length)] = r.value === '1'
  } catch {
    /* no database yet: everything is off */
  }
  for (const id of SHIPPED_IDS) if (live[id] === undefined) live[id] = true // shipped features are live until someone undoes them
  return live
}

export const featureState = cache(async (): Promise<FeatureState> => {
  const dev = isDevHostName(await requestHost())
  const live = await readLive()
  const on: Record<string, boolean> = {}
  for (const id of FEATURE_IDS) on[id] = dev || live[id] === true
  return { dev, live, on }
})

export async function featureOn(id: string) {
  return (await featureState()).on[id] === true
}

export type PushLogEntry = { at: number; by: string; action: 'push' | 'undo'; ids: string[] }

export async function pushLog(): Promise<PushLogEntry[]> {
  try {
    const d = await db()
    const r = await d.prepare("SELECT value FROM settings WHERE key = 'feature_log'").first<{ value: string }>()
    const list = JSON.parse(r?.value ?? '[]')
    return Array.isArray(list) ? (list as PushLogEntry[]) : []
  } catch {
    return []
  }
}

/** Turns features on or off for the live site and writes it to the history. */
export async function setLive(ids: string[], on: boolean, by: string) {
  const d = await db()
  const t = nowSec()
  for (const id of ids) {
    await d
      .prepare("INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
      .bind(`feature:${id}`, on ? '1' : '0', t)
      .run()
  }
  const log = [{ at: t, by, action: on ? 'push' : 'undo', ids } as PushLogEntry, ...(await pushLog())].slice(0, 60)
  await d
    .prepare("INSERT INTO settings (key, value, updated_at) VALUES ('feature_log', ?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(JSON.stringify(log), t)
    .run()
}
