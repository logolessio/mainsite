import { db } from './db'

/**
 * A Google address that was added to a Discord account on the pre-launch sign-up signs in to that account (`alias:<google email>` in settings, written then;
 * nothing writes new ones any more).
 */
export async function aliasTarget(googleEmail: string): Promise<string | null> {
  try {
    const r = await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(`alias:${googleEmail.trim().toLowerCase()}`).first<{ value: string }>()
    return r ? (JSON.parse(r.value) as string) : null
  } catch {
    return null
  }
}
