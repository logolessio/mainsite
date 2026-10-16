import { db, nowSec } from './db'

/** How a person wants to be told about things that matter (a campaign ending, a summary of what they earned). The site's own notification is always sent. */
export type ContactPref = 'both' | 'email' | 'discord' | 'site'
export const CONTACT_PREFS: { id: ContactPref; label: string; hint: string }[] = [
  { id: 'both', label: 'Email and Discord', hint: 'Both, when you have them.' },
  { id: 'email', label: 'Email only', hint: 'To the address on your account.' },
  { id: 'discord', label: 'Discord only', hint: 'A direct message from the bot (connect Discord first).' },
  { id: 'site', label: 'Just the site', hint: 'Only the notification bell.' },
]
const key = (id: string) => `contact:${id}`
const valid = (v: unknown): v is ContactPref => v === 'both' || v === 'email' || v === 'discord' || v === 'site'

export async function contactPref(userId: string): Promise<ContactPref> {
  try {
    const d = await db()
    const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(key(userId)).first<{ value: string }>()
    return valid(r?.value) ? r.value : 'both'
  } catch {
    return 'both'
  }
}

export async function setContactPref(userId: string, pref: ContactPref) {
  const d = await db()
  await d
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(key(userId), pref, nowSec())
    .run()
}
export const isContactPref = valid
