import { db, nowSec } from './db'
import { cleanLinks, DEFAULT_LINKS, type LinkItem } from './socials'

const KEY = 'site:links'

/** The links and socials the site shows: what the owner saved, or the built-in list if nothing was saved (or it cannot be read). */
export async function getLinks(): Promise<LinkItem[]> {
  try {
    const d = await db()
    const row = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(KEY).first<{ value: string }>()
    if (!row) return DEFAULT_LINKS
    const c = cleanLinks(JSON.parse(row.value))
    return c.ok ? c.links : DEFAULT_LINKS
  } catch {
    return DEFAULT_LINKS
  }
}

export async function saveLinks(links: LinkItem[]) {
  const d = await db()
  await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(KEY, JSON.stringify(links), nowSec()).run()
}

export async function resetLinks() {
  const d = await db()
  await d.prepare('DELETE FROM settings WHERE key = ?1').bind(KEY).run()
}
