import { db, nowSec } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { limit } from '@/lib/guard'
import { assertSameOrigin, HttpError, json, route } from '@/lib/http'
import { REPORTS, reportMail } from '@/lib/launch-report'

/**
 * Sends one of the fixed reports in lib/launch-report.ts to its fixed address, exactly once. Nothing in the request
 * chooses the text or the recipient, only which saved report, and a second call changes nothing. Safe to leave public.
 */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  await limit(req, { name: 'report-job', max: 6, windowSec: 600 })
  const id = new URL(req.url).searchParams.get('id') ?? ''
  const report = REPORTS[id]
  if (!report) throw new HttpError(404, 'No such report.')
  const d = await db()
  const key = `report_sent:${id}`
  const t = nowSec()
  // Claim it first, so two calls at once cannot both send. A claim that never finished (older than 10 minutes) can be taken over.
  const claim = await d
    .prepare(
      `INSERT INTO settings (key, value, updated_at) VALUES (?1, 'sending', ?2)
       ON CONFLICT(key) DO UPDATE SET value = 'sending', updated_at = ?2 WHERE settings.value = 'sending' AND settings.updated_at < ?2 - 600`,
    )
    .bind(key, t)
    .run()
  if (claim.meta.changes === 0) {
    const row = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(key).first<{ value: string }>()
    return json({ sent: row?.value === 'sent', already: true })
  }
  try {
    await sendEmail({ to: report.to, ...reportMail(report), template: 'overnight report' })
  } catch (e) {
    await d.prepare("DELETE FROM settings WHERE key = ?1 AND value = 'sending'").bind(key).run()
    throw e
  }
  await d.prepare("UPDATE settings SET value = 'sent', updated_at = ?2 WHERE key = ?1").bind(key, nowSec()).run()
  return json({ sent: true, already: false })
})
