import { db, nowSec } from './db'

export type Announcement = { text: string; href: string }

export async function getAnnouncement(): Promise<Announcement | null> {
  try {
    const d = await db()
    const rows = (await d.prepare("SELECT key, value FROM settings WHERE key IN ('announcement_text','announcement_href')").all<{ key: string; value: string }>()).results
    const text = rows.find((r) => r.key === 'announcement_text')?.value?.trim() ?? ''
    if (!text) return null
    return { text, href: rows.find((r) => r.key === 'announcement_href')?.value?.trim() ?? '' }
  } catch {
    return null
  }
}

export async function setAnnouncement(a: Announcement) {
  const d = await db()
  const t = nowSec()
  for (const [k, v] of [['announcement_text', a.text], ['announcement_href', a.href]] as const)
    await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(k, v, t).run()
}
