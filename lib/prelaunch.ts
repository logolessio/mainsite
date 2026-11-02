import { db } from './db'

/**
 * The pre-launch sign-up (members let in before the site opened) is kept in the settings table, `prelaunch:<userId>`. It is only read now:
 * the number a person was given and whether they were a founding member.
 */
export type PreState = {
  /** the number they were given, once let in */
  n?: number
  /** they were let in while the site was still shut: a founding member. Missing on the first sign-ups, which were all founding. */
  founding?: boolean
}

export async function getPre(userId: string): Promise<PreState | null> {
  try {
    const r = await (await db()).prepare('SELECT value FROM settings WHERE key = ?1').bind(`prelaunch:${userId}`).first<{ value: string }>()
    return r ? (JSON.parse(r.value) as PreState) : null
  } catch {
    return null
  }
}

export async function isFoundingMember(userId: string): Promise<boolean> {
  const s = await getPre(userId)
  return Boolean(s?.n && s.founding !== false)
}
