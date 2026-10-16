import { db } from './db'
import { contactPref } from './contact-pref'
import { emailEnabled, sendEmail } from './email'
import { plainMessageEmail } from './email-templates'
import { type NotifyKind, notify } from './notify'

/**
 * Tells someone something that matters, the way they chose: always on the site, and by email and/or a Discord message
 * (Discord goes through `notify`, which checks the same choice). Each message is sent once, however many times this runs.
 */
export async function reach(userId: string, n: { kind: NotifyKind; title: string; body: string; href?: string; dedupe: string }) {
  const fresh = await notify(userId, n)
  if (!fresh) return false
  try {
    const pref = await contactPref(userId)
    if ((pref !== 'both' && pref !== 'email') || !(await emailEnabled())) return true
    const d = await db()
    const u = await d.prepare('SELECT u.email, COALESCE(p.display_name, u.name, \'\') AS name FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?1').bind(userId).first<{ email: string; name: string }>()
    if (!u || u.email.endsWith('@deleted.invalid')) return true
    const mail = plainMessageEmail(u.name, n.title, n.body, n.href)
    await sendEmail({ to: u.email, subject: mail.subject, html: mail.html, text: mail.text, template: 'reach' })
  } catch {
    /* the email is a nice-to-have: the site notification and the Discord message are already sent */
  }
  return true
}
