import { z } from 'zod'
import { audit } from '@/lib/chain'
import { db, setting } from '@/lib/db'
import { alreadyMemberEmail, codeEmail, emailEnabled, sendEmail } from '@/lib/email'
import { checkCode, issueCode } from '@/lib/email-code'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { requireAdmin } from '@/lib/user'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('send'), template: z.enum(['signup', 'reset', 'already', 'plain']), to: z.string().trim().toLowerCase().email().max(254).optional() }),
  z.object({ action: z.literal('code-start') }),
  z.object({ action: z.literal('code-check'), code: z.string().regex(/^\d{6}$/) }),
  z.object({ action: z.literal('status'), id: z.string().regex(/^[0-9a-f-]{20,40}$/i) }),
])

const plain = () => ({
  subject: '[TEST] logoless email delivery',
  text: 'This is a test from the logoless admin panel. If you can read this, sending works.\n\nlogoless',
  html: '<p style="font-family:sans-serif">This is a <strong>test</strong> from the logoless admin panel. If you can read this, sending works.</p>',
})

/** Admin email tools. Test messages are labelled [TEST], carry no usable code, and go to the admin's own address unless another is typed. */
export const POST = route(async (req: Request) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-email', max: 20, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 2048))
  if (!parsed.success) throw new HttpError(400, 'That request is not valid.')
  const a = parsed.data
  const actor = { id: admin.id, email: admin.email }

  if (a.action === 'status') {
    const key = await setting('RESEND_API_KEY')
    if (!key) throw new HttpError(503, 'RESEND_API_KEY is not set.')
    const res = await fetch(`https://api.resend.com/emails/${a.id}`, { headers: { authorization: `Bearer ${key}` } })
    if (res.status === 401 || res.status === 403) return json({ status: null, note: 'This key is limited to sending, so it cannot look up delivery. Check the Emails page in Resend.' })
    if (!res.ok) return json({ status: null, note: `Resend answered ${res.status}.` })
    const j = (await res.json()) as { last_event?: string }
    return json({ status: j.last_event ?? 'unknown' })
  }

  if (!(await emailEnabled())) throw new HttpError(503, 'RESEND_API_KEY is not set, so email is switched off.')

  if (a.action === 'send') {
    const to = a.to ?? admin.email
    const mail =
      a.template === 'signup' ? { ...codeEmail('123456', 'signup', true), template: 'TEST sign-up code' }
      : a.template === 'reset' ? { ...codeEmail('123456', 'reset', true), template: 'TEST password reset code' }
      : a.template === 'already' ? { ...alreadyMemberEmail(), subject: '[TEST] You already have a logoless account', template: 'TEST already a member' }
      : { ...plain(), template: 'TEST delivery' }
    const { id } = await sendEmail({ to, ...mail })
    await audit(actor, 'email.test', a.template, `to ${to.replace(/^(.).*(@.*)$/, '$1***$2')}`, await ipHash(req))
    return json({ ok: true, id, to })
  }

  if (a.action === 'code-start') {
    // The full round trip: a real code is stored (hashed), emailed, then checked, without creating any account.
    const code = await issueCode(admin.email, 'test')
    const { id } = await sendEmail({ to: admin.email, ...codeEmail(code, 'signup', true), template: 'TEST code round-trip' })
    return json({ ok: true, id, to: admin.email })
  }

  const ok = await checkCode(admin.email, 'test', a.code)
  await audit(actor, 'email.code_test', ok ? 'pass' : 'fail', null, await ipHash(req))
  return json({ ok: Boolean(ok) })
})

/** Config and recent sends for the Email page. */
export const GET = route(async () => {
  await requireAdmin()
  const d = await db()
  const recent = (await d.prepare("SELECT ts, name, status, detail FROM event_log WHERE name IN ('email sent','email failed') ORDER BY id DESC LIMIT 25").all<{ ts: number; name: string; status: number | null; detail: string | null }>()).results
  return json({ recent })
})
