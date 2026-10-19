import { z } from 'zod'
import { requireAdminSecret } from '@/lib/admin-secret'
import { audit } from '@/lib/chain'
import { db } from '@/lib/db'
import { emailEnabled, launchUpdateEmail, sendEmail } from '@/lib/email'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { signupCounts, unsubUrl, type Signup } from '@/lib/launch'
import { requireAdmin } from '@/lib/user'

const schema = z.object({
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(3).max(4000),
  test: z.boolean().optional(),
  after: z.string().max(100).optional(), // where the last batch stopped
  secret: z.string().max(200).optional(),
})
const BATCH = 25

/**
 * An update to everyone on the launch list, sent in batches of 25 (the page keeps calling with `after` until it is done). A test goes only to the
 * person pressing the button. Sending to the whole list needs the admin password. Nobody who unsubscribed is emailed.
 */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-launch-send', max: 400, windowSec: 3600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 8192))
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'That is not valid.')
  const a = parsed.data
  if (!(await emailEnabled())) throw new HttpError(503, 'Email is not set up yet.')

  if (a.test) {
    const m = launchUpdateEmail(a.subject, a.message, await unsubUrl(admin.email), true)
    await sendEmail({ to: admin.email, ...m, template: 'launch update test' })
    return json({ ok: true, test: true })
  }

  await requireAdminSecret(admin.id, a.secret)
  const d = await db()
  const rows = (
    await d
      .prepare("SELECT key, value FROM settings WHERE key LIKE 'launch-signup:%' AND key > ?1 ORDER BY key LIMIT ?2")
      .bind(a.after ? `launch-signup:${a.after}` : 'launch-signup:', BATCH)
      .all<{ key: string; value: string }>()
  ).results
  let sent = 0
  let failed = 0
  for (const r of rows) {
    let s: Signup
    try {
      s = JSON.parse(r.value) as Signup
    } catch {
      continue
    }
    if (s.u) continue
    try {
      await sendEmail({ to: s.e, ...launchUpdateEmail(a.subject, a.message, await unsubUrl(s.e)), template: 'launch update' })
      sent++
    } catch {
      failed++
    }
  }
  const last = rows.length ? rows[rows.length - 1].key.slice('launch-signup:'.length) : null
  const done = rows.length < BATCH
  if (!a.after) await audit({ id: admin.id, email: admin.email }, 'launch.email', 'update', a.subject, await ipHash(req))
  return json({ ok: true, sent, failed, next: done ? null : last, total: (await signupCounts()).total })
})
