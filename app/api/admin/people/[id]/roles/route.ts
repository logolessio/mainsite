import { z } from 'zod'
import { requireAdminSecret } from '@/lib/admin-secret'
import { audit } from '@/lib/chain'
import { dmUser } from '@/lib/discord-bot'
import { db } from '@/lib/db'
import { roleChangedEmail, sendEmail } from '@/lib/email'
import { ipHash, protect } from '@/lib/guard'
import { body, HttpError, json, route } from '@/lib/http'
import { notify } from '@/lib/notify'
import { isRole, ownerEmails, ROLES, rolesOf, setRoles } from '@/lib/roles'
import { requireAdmin } from '@/lib/user'

const schema = z.object({ roles: z.array(z.string()).max(4), secret: z.string().max(200).optional() })

/**
 * Gives someone a role, or takes it away. Only the owner can do this, it needs the admin password, and the person is
 * told by a notification, an email and (when the bot is set up) a Discord message.
 */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin()
  if (!(await ownerEmails()).includes(admin.email.toLowerCase())) throw new HttpError(403, 'Only the owner can change roles.')
  await protect(req, { name: 'admin-roles', max: 20, windowSec: 600, userId: admin.id })
  const parsed = schema.safeParse(await body(req, 2048))
  if (!parsed.success || !parsed.data.roles.every(isRole)) throw new HttpError(400, 'That request is not valid.')
  await requireAdminSecret(admin.id, parsed.data.secret)

  const { id } = await ctx.params
  const d = await db()
  const target = await d.prepare("SELECT u.id, u.email, u.name, p.display_name FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?1").bind(id).first<{ id: string; email: string; name: string | null; display_name: string | null }>()
  if (!target) throw new HttpError(404, 'That account does not exist.')
  if ((await ownerEmails()).includes(target.email.toLowerCase())) throw new HttpError(400, 'The owner always has every role.')

  const before = await rolesOf(id)
  const after = await setRoles(id, parsed.data.roles.filter(isRole))
  const changed = before.join() !== after.join()
  await audit({ id: admin.id, email: admin.email }, 'role.set', target.email, `${before.join(',') || 'none'} -> ${after.join(',') || 'none'}`, await ipHash(req))

  if (changed) {
    const labels = after.map((r) => ROLES.find((x) => x.id === r)?.label ?? r)
    const name = target.display_name ?? target.name ?? ''
    const stamp = Date.now().toString(36)
    await notify(id, {
      kind: 'account',
      title: after.length ? `You are now ${labels.join(' and ')}` : 'Your team access was removed',
      body: after.length ? 'The owner gave you a new role. Sign out and back in if you do not see it yet.' : 'The owner removed your team access.',
      href: after.includes('admin') ? 'https://admin.logoless.io' : after.includes('dev') ? 'https://dev.logoless.io' : undefined,
      dedupe: `role:${id}:${stamp}`,
    })
    // email and Discord are best effort: the role is already saved, so a failure here must not undo it
    let emailed = false
    try {
      const mail = roleChangedEmail(name, labels)
      await sendEmail({ to: target.email, subject: mail.subject, html: mail.html, text: mail.text, template: 'role-changed' })
      emailed = true
    } catch {
      /* email not set up yet */
    }
    const dm = await dmUser(id, after.length ? `You were given the ${labels.join(' and ')} role on logoless.` : 'Your team access on logoless was removed.')
    return json({ ok: true, roles: after, emailed, discord: dm })
  }
  return json({ ok: true, roles: after, emailed: false, discord: false })
})
