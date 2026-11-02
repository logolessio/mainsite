import { sha256Hex } from './crypto'
import { db } from './db'

/**
 * The names people reserved on the waitlist before the site opened (kept in settings: `launch-signup:<hash of the address>` and `launch-handle:<name>`).
 * A reserved name belongs to the address that reserved it.
 */
export type Signup = { e: string; h: string | null; t: number; u?: number }

export const emailKey = (email: string) => sha256Hex(email.trim().toLowerCase())

/** One person on the list, by the hash of their address. */
async function signupFor(key: string): Promise<Signup | null> {
  const row = await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(`launch-signup:${key}`).first<{ value: string }>()
  try {
    return row ? (JSON.parse(row.value) as Signup) : null
  } catch {
    return null
  }
}

/** The username this address reserved on the waitlist, if it still holds one. */
export async function reservedHandleFor(email: string): Promise<string | null> {
  try {
    const s = await signupFor(await emailKey(email))
    return s && !s.u && s.h ? s.h : null
  } catch {
    return null
  }
}

/** True when the username was reserved on the waitlist by a different address, so nobody else can take it. */
export async function reservedByAnother(handle: string, email: string): Promise<boolean> {
  try {
    const row = await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(`launch-handle:${handle.trim().toLowerCase().replace(/^@/, '')}`).first<{ value: string }>()
    return Boolean(row) && row?.value !== (await emailKey(email))
  } catch {
    return false
  }
}
