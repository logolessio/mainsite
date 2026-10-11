import { setting } from './db'
import { HttpError } from './http'

/** True when emails can be sent: a Resend key is set, or we are running locally (where the code is printed instead). */
export async function emailEnabled() {
  return Boolean(await setting('RESEND_API_KEY')) || process.env.NODE_ENV !== 'production'
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

/** Sends one email through Resend. Locally, with no key, it prints the message to the server log instead. */
export async function sendEmail(o: { to: string; subject: string; html: string; text: string }) {
  const key = await setting('RESEND_API_KEY')
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new HttpError(503, 'Email is not set up yet.')
    console.log(`[email, local only] to ${o.to}: ${o.subject}\n${o.text}`)
    return
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
    throw new HttpError(502, 'We could not send the email. Please try again in a minute.')
  }
}

/** The sign-in code email. The code is digits only, so nothing user-controlled is ever placed in the HTML. */
export function codeEmail(code: string) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`
  return {
    subject: `Your logoless code: ${code}`,
    text: `Your logoless code is ${code}.\n\nIt works for 10 minutes. If you did not ask for it, you can ignore this email: nobody can get into your account without it.\n\nlogoless`,
    html: `<!doctype html><html><body style="margin:0;background:#000;padding:32px 16px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;background:#09090a;border:1px solid #26262a;border-radius:24px">
<tr><td style="padding:36px 32px;text-align:center;color:#f3f2ee">
<p style="margin:0;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#8d8d92">logoless</p>
<p style="margin:22px 0 6px;font-size:22px;font-weight:300">Your sign-in code</p>
<p style="margin:0 0 26px;font-size:14px;color:#9a9a9f">Enter this on the page you came from.</p>
<p style="margin:0;font-size:40px;font-weight:600;letter-spacing:.18em;font-family:ui-monospace,Menlo,monospace;color:#fff">${esc(spaced)}</p>
<p style="margin:26px 0 0;font-size:13px;line-height:1.5;color:#8d8d92">It works for 10 minutes. If you did not ask for it, ignore this email. Nobody can get into your account without it.</p>
</td></tr></table></td></tr></table></body></html>`,
  }
}
