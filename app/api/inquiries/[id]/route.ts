import { z } from 'zod'
import { limit } from '@/lib/guard'
import { assertSameOrigin, body, HttpError, json, route } from '@/lib/http'
import { clean, getInquiry, publicView, requireView, saveInquiry } from '@/lib/inquiries'
import { notifyAdmins } from '@/lib/notify'
import { getSession } from '@/lib/session'
import { db } from '@/lib/db'

async function who() {
  const session = await getSession().catch(() => null)
  const email = session?.user?.email?.toLowerCase()
  if (!email) return { userId: null as string | null, admin: false }
  const d = await db()
  const u = await d.prepare('SELECT id FROM users WHERE email = ?1').bind(email).first<{ id: string }>()
  return { userId: u?.id ?? null, admin: session?.user?.role === 'admin' }
}

/** The conversation, for the person who sent it (signed in, or with the private token) and for admins. */
export const GET = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const t = new URL(req.url).searchParams.get('t')
  const inq = requireView(await getInquiry(id), await who(), t)
  return json(publicView(inq))
})

const schema = z.object({ text: z.string().min(2).max(4000), t: z.string().max(40).optional() })

/** The sender adds to their own conversation. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  assertSameOrigin(req)
  await limit(req, { name: 'inquiry-reply', max: 20, windowSec: 3600 })
  const { id } = await params
  const parsed = schema.safeParse(await body(req, 8 * 1024))
  if (!parsed.success) throw new HttpError(400, 'Write a reply first.')
  const inq = requireView(await getInquiry(id), await who(), parsed.data.t)
  if (inq.status === 'closed') throw new HttpError(409, 'This conversation is closed. Start a new message if you need to.')
  inq.replies.push({ by: 'you', text: clean(parsed.data.text, 4000), at: Math.floor(Date.now() / 1000) })
  inq.status = 'open'
  inq.adminSeen = false
  await saveInquiry(inq)
  await notifyAdmins({ title: `A reply from ${inq.name}: ${inq.subject}`.slice(0, 120), body: inq.replies[inq.replies.length - 1].text.slice(0, 160), href: `/admin/inbox/${inq.id}`, dedupe: `inq-reply:${inq.id}:${inq.replies.length}` })
  return json(publicView(inq))
})
