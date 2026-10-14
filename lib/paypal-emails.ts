import { db, nowSec } from './db'

/**
 * The PayPal emails someone can be paid at. `paypal:<id>` is the one used by default (it is also what older code reads);
 * `paypal-emails:<id>` is the whole list, up to five.
 */
const MAX = 5
const def = (id: string) => `paypal:${id}`
const list = (id: string) => `paypal-emails:${id}`

const put = async (key: string, value: string) => {
  const d = await db()
  await d
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(key, value, nowSec())
    .run()
}

export async function paypalEmails(userId: string): Promise<{ email: string; emails: string[] }> {
  const d = await db()
  const [one, many] = await Promise.all([
    d.prepare('SELECT value FROM settings WHERE key = ?1').bind(def(userId)).first<{ value: string }>(),
    d.prepare('SELECT value FROM settings WHERE key = ?1').bind(list(userId)).first<{ value: string }>(),
  ])
  let emails: string[] = []
  try {
    const parsed = JSON.parse(many?.value ?? '[]')
    emails = Array.isArray(parsed) ? parsed.filter((e): e is string => typeof e === 'string') : []
  } catch {
    /* start again from the default */
  }
  const email = one?.value ?? ''
  if (email && !emails.includes(email)) emails = [email, ...emails]
  return { email, emails: emails.slice(0, MAX) }
}

/** Adds an address to the list. It becomes the default when `makeDefault` is set, or when there is no default yet. */
export async function addPaypalEmail(userId: string, email: string, makeDefault = true) {
  const cur = await paypalEmails(userId)
  const emails = [email, ...cur.emails.filter((e) => e !== email)].slice(0, MAX)
  await put(list(userId), JSON.stringify(emails))
  if (makeDefault || !cur.email) await put(def(userId), email)
  return paypalEmails(userId)
}

export async function removePaypalEmail(userId: string, email: string) {
  const cur = await paypalEmails(userId)
  const emails = cur.emails.filter((e) => e !== email)
  const d = await db()
  await put(list(userId), JSON.stringify(emails))
  if (cur.email === email) {
    if (emails[0]) await put(def(userId), emails[0])
    else await d.prepare('DELETE FROM settings WHERE key = ?1').bind(def(userId)).run()
  }
  return paypalEmails(userId)
}
