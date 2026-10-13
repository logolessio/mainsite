import { z } from 'zod'
import { db } from '@/lib/db'
import { limit } from '@/lib/guard'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'
import { clean, createInquiry } from '@/lib/inquiries'
import { CONTACT_TOPICS, REPORT_TOPICS } from '@/lib/inquiry-topics'
import { notifyAdmins } from '@/lib/notify'
import { getSession } from '@/lib/session'

const schema = z.object({
  kind: z.enum(['contact', 'report']),
  topic: z.string().max(40),
  subject: z.string().max(120).optional(),
  message: z.string().min(10).max(4000),
  name: z.string().max(80).optional(),
  target: z.string().max(300).optional(),
  website: z.string().max(200).optional(), // honeypot: real people never fill this in
})

/** A message or a report, sent through the site to the admins. Open to visitors; rate limited and honeypotted. */
export const POST = route(async (req: Request) => {
  assertSameOrigin(req)
  await limit(req, { name: 'inquiry', max: 6, windowSec: 3600 })
  const parsed = schema.safeParse(await body(req, 12 * 1024))
  if (!parsed.success) throw new HttpError(400, 'Please write a little more, so we know how to help.')
  const m = parsed.data
  if (m.website) return json({ ok: true, id: 'x', token: 'x' }) // a bot: pretend it worked
  const topics = m.kind === 'report' ? REPORT_TOPICS : CONTACT_TOPICS
  const topic = topics.find((t) => t.id === m.topic)
  if (!topic) throw new HttpError(400, 'Pick what this is about.')
  const message = clean(m.message, 4000)
  const subject = clean(m.subject ?? '', 120)
  if (topic.id === 'custom' && subject.length < 3) throw new HttpError(400, 'Add a short subject.')
  if (message.length < 10) throw new HttpError(400, 'Please write a little more, so we know how to help.')

  // signed in? then the conversation is theirs and shows up in their account
  const session = await getSession().catch(() => null)
  let userId: string | null = null
  let handle: string | null = null
  let name = clean(m.name ?? '', 80)
  if (session?.user?.email) {
    const d = await db()
    const u = await d.prepare('SELECT u.id, p.handle, p.display_name FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.email = ?1').bind(session.user.email.toLowerCase()).first<{ id: string; handle: string | null; display_name: string | null }>()
    if (u) {
      userId = u.id
      handle = u.handle
      name = u.display_name ?? name
    }
  }
  const inq = await createInquiry({ kind: m.kind, topic: topic.id, subject: subject || topic.label, message, name: name || 'Someone', userId, handle, target: clean(m.target ?? '', 300) })
  await notifyAdmins({ title: `${m.kind === 'report' ? 'New report' : 'New message'}: ${inq.subject}`.slice(0, 120), body: message.slice(0, 160), href: `/admin/inbox/${inq.id}`, dedupe: `inq:${inq.id}` })
  return json({ ok: true, id: inq.id, token: inq.token, signedIn: Boolean(userId) })
})
