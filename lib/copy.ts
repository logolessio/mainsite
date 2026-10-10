import { cache } from 'react'
import { copyKey, norm } from './copy-key'
import { db } from './db'

type Map = Record<string, string>
let memo: { at: number; map: Map } | null = null

/** All text the admin has changed, keyed by the hash of the original wording. Cached for a few seconds per server instance. */
export const getOverrides = cache(async (): Promise<Map> => {
  if (memo && Date.now() - memo.at < 5000) return memo.map
  try {
    const d = await db()
    const rows = (await d.prepare('SELECT key, value FROM content').all<{ key: string; value: string }>()).results
    const map: Map = {}
    for (const r of rows) map[r.key] = r.value
    memo = { at: Date.now(), map }
    return map
  } catch {
    return {}
  }
})

export const bustOverrides = () => {
  memo = null
}

/** For server components: returns the function that swaps a sentence for its edited version, if there is one. */
export async function getCopy() {
  const map = await getOverrides()
  return (original: string) => map[copyKey(original)] ?? original
}

export { copyKey, norm }
