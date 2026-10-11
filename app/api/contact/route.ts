import { z } from 'zod'
import { setting } from '@/lib/db'
import { emailEnabled, sendEmail } from '@/lib/email'
import { limit } from '@/lib/guard'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'
import { SITE } from '@/lib/site'

const TOPICS = { brand: 'Wants to launch a campaign', clipper: 'Clipper needs help', payments: 'Payments or payouts', legal: 'Legal, privacy or copyright', other: 'Something else' } as const

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email().max(254),
  topic: z.enum(['brand', 'clipper', 'payments', 'legal', 'other']),
  message: z.string().trim().min(5).max(4000),
  website: z.string().max(200).optional(), // honeypot: real people never fill this in
})

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

/** Where contact messages go: the first admin address, or the support address if none is set. */
async function inbox() {
  const first = ((await setting('ADMIN_EMAILS')) ?? '').split(',').map((e) => e.trim()).find(Boolean)
  return first ?? SITE.emails.support
}

/** The public contact form. Rate limited, honeypotted, and emailed to the team (reply goes straight to the sender). */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  await limit(req, { name: 'contact', max: 5, windowSec: 3600 })
  const parsed = schema.safeParse(await body(req, 8 * 1024))
  if (!parsed.success) throw new HttpError(400, 'Please fill in your name, a valid email and a message.')
  const m = parsed.data
  if (m.website) return json({ ok: true }) // a bot: pretend it worked
  if (!(await emailEnabled())) throw new HttpError(503, `Our contact form is offline right now. Please email ${SITE.emails.support} instead.`)

  const topic = TOPICS[m.topic]
  await sendEmail({
    to: await inbox(),
    replyTo: m.email,
    subject: `[contact] ${topic}: ${m.name}`,
    template: 'contact form',
    text: `${m.name} <${m.email}>\nTopic: ${topic}\n\n${m.message}\n`,
    html: `<div style="font:15px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111"><p><b>${esc(m.name)}</b> &lt;${esc(m.email)}&gt;<br>Topic: ${esc(topic)}</p><p style="white-space:pre-wrap">${esc(m.message)}</p><p style="color:#777;font-size:13px">Sent from the contact form on logoless.io. Hit reply to answer them.</p></div>`,
  })
  return json({ ok: true })
})
