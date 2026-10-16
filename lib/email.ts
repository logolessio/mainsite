import { setting } from './db'
import { HttpError } from './http'
import { logEvent } from './log'
import { applyWording } from './wording'

/** True when emails can be sent: a Resend key is set, or we are running locally (where the code is printed instead). */
export async function emailEnabled() {
  return Boolean(await setting('RESEND_API_KEY')) || process.env.NODE_ENV !== 'production'
}

/** The site's wording in an email: the words between tags only, never the tags themselves. */
const wordHtml = (html: string) => html.split(/(<[^>]*>)/).map((part) => (part.startsWith('<') ? part : applyWording(part))).join('')

/** Sends one email through Resend. Locally, with no key, it prints the message to the server log instead. */
export async function sendEmail(input: { to: string; subject: string; html: string; text: string; template?: string; replyTo?: string }): Promise<{ id: string | null }> {
  const o = { ...input, subject: applyWording(input.subject), text: applyWording(input.text), html: wordHtml(input.html) }
  const key = await setting('RESEND_API_KEY')
  const label = o.template ?? 'email'
  const who = o.to.replace(/^(.).*(@.*)$/, '$1***$2') // addresses are masked in the log
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new HttpError(503, 'Email is not set up yet.')
    console.log(`[email, local only] to ${o.to}: ${o.subject}\n${o.text}`)
    logEvent({ kind: 'api', name: 'email sent', detail: `${label}|${who}|local` })
    return { id: 'local' }
  }
  const from = (await setting('RESEND_FROM')) ?? 'logoless <login@verify.logoless.io>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [o.to], subject: o.subject, html: o.html, text: o.text, ...(o.replyTo ? { reply_to: o.replyTo } : {}) }),
  })
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300)
    console.error('resend failed', res.status, detail)
    logEvent({ kind: 'error', name: 'email failed', status: res.status, detail: `${label}|${who}|${detail.slice(0, 200)}` })
    throw new HttpError(502, 'We could not send the email. Please try again in a minute.')
  }
  const id = ((await res.json().catch(() => ({}))) as { id?: string }).id ?? null
  logEvent({ kind: 'api', name: 'email sent', detail: `${label}|${who}|${id ?? ''}` })
  return { id }
}

export { accountDeletedEmail, alreadyMemberEmail, codeEmail, inviteEmail, plainMessageEmail, plainTestEmail, roleChangedEmail } from './email-templates'
