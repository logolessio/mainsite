import { setting } from './db'
import { HttpError } from './http'
import { logEvent } from './log'

/** True when emails can be sent: a Resend key is set, or we are running locally (where the code is printed instead). */
export async function emailEnabled() {
  return Boolean(await setting('RESEND_API_KEY')) || process.env.NODE_ENV !== 'production'
}

/** Sends one email through Resend. Locally, with no key, it prints the message to the server log instead. */
export async function sendEmail(o: { to: string; subject: string; html: string; text: string; template?: string }): Promise<{ id: string | null }> {
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
    body: JSON.stringify({ from, to: [o.to], subject: o.subject, html: o.html, text: o.text }),
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

export { alreadyMemberEmail, codeEmail, plainTestEmail } from './email-templates'
