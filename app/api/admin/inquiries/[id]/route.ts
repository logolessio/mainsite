import { z } from 'zod'
import { auditSafe } from '@/lib/chain'
import { protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { closeTicket, postTeamReply } from '@/lib/discord/tickets'
import { clean, getInquiry, saveInquiry } from '@/lib/inquiries'
import { notify } from '@/lib/notify'
import { requireAdmin } from '@/lib/user'

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('reply'), text: z.string().min(2).max(4000), close: z.boolean().optional() }),
  z.object({ action: z.literal('status'), status: z.enum(['open', 'closed']) }),
  z.object({ action: z.literal('seen') }),
])

/** An admin answers a message or report, closes it, or reopens it. The sender is told inside the site. */
export const POST = route(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  await protect(req, { name: 'admin-inquiry', max: 120, windowSec: 600, userId: admin.id })
  const { id } = await params
  const parsed = schema.safeParse(await body(req, 8 * 1024))
  if (!parsed.success) throw new HttpError(400, 'Write a reply first.')
  const inq = await getInquiry(id)
  if (!inq) throw new HttpError(404, 'Conversation not found.')
  const a = parsed.data
  if (a.action === 'seen') {
    if (!inq.adminSeen) {
      inq.adminSeen = true
      if (inq.status === 'new') inq.status = 'open'
      await saveInquiry(inq)
    }
    return json({ ok: true })
  }
  if (a.action === 'status') {
    inq.status = a.status
    await saveInquiry(inq)
    await auditSafe({ id: admin.id, email: admin.email }, 'inquiry.status', inq.id, a.status)
    if (a.status === 'closed' && inq.discord) await closeTicket(inq, 'the team')
    return json({ ok: true })
  }
  inq.replies.push({ by: 'admin', text: clean(a.text, 4000), at: Math.floor(Date.now() / 1000) })
  inq.status = a.close ? 'closed' : 'open'
  inq.adminSeen = true
  await saveInquiry(inq)
  await auditSafe({ id: admin.id, email: admin.email }, 'inquiry.reply', inq.id, a.close ? 'replied and closed' : 'replied')
  if (inq.userId) await notify(inq.userId, { kind: 'account', title: `We replied: ${inq.subject}`.slice(0, 120), body: a.text.slice(0, 200), href: `/inquiry/${inq.id}`, dedupe: `inq-reply-user:${inq.id}:${inq.replies.length}` })
  // a ticket opened in Discord: the answer goes into its channel too, pinging the person
  if (inq.discord) {
    await postTeamReply(inq, clean(a.text, 3800), admin.name ?? 'The team')
    if (a.close) await closeTicket(inq, 'the team')
  }
  return json({ ok: true })
})
