import { db, setting } from './db'

export type Check = { id: string; label: string; ok: boolean; ms?: number }
export type Health = { ok: boolean; checks: Check[]; at: number }

/** A quick look at whether the site's parts are working. Says yes or no only: no keys, no counts, no names. */
export async function runHealth(): Promise<Health> {
  const checks: Check[] = []
  const t0 = Date.now()
  let dbOk = false
  try {
    const d = await db()
    await d.prepare('SELECT 1 AS x').first()
    dbOk = true
  } catch {
    dbOk = false
  }
  checks.push({ id: 'database', label: 'Database', ok: dbOk, ms: Date.now() - t0 })
  checks.push({ id: 'signin', label: 'Sign-in', ok: Boolean(await setting('AUTH_SECRET')) })
  checks.push({ id: 'payments', label: 'Payments', ok: Boolean((await setting('PAYPAL_CLIENT_ID')) && (await setting('PAYPAL_CLIENT_SECRET')) && (await setting('PAYPAL_WEBHOOK_ID'))) })
  checks.push({ id: 'email', label: 'Email', ok: Boolean(await setting('RESEND_API_KEY')) })
  return { ok: checks.every((c) => c.ok), checks, at: Math.floor(Date.now() / 1000) }
}
