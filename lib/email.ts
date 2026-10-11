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

const shell = (title: string, intro: string, big: string, foot: string) => `<!doctype html><html><body style="margin:0;background:#000;padding:32px 16px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="440" cellpadding="0" cellspacing="0" style="max-width:440px;background:#09090a;border:1px solid #26262a;border-radius:24px">
<tr><td style="padding:36px 32px;text-align:center;color:#f3f2ee">
<p style="margin:0;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#8d8d92">logoless</p>
<p style="margin:22px 0 6px;font-size:22px;font-weight:300">${esc(title)}</p>
<p style="margin:0 0 26px;font-size:14px;color:#9a9a9f">${esc(intro)}</p>
${big}
<p style="margin:26px 0 0;font-size:13px;line-height:1.5;color:#8d8d92">${esc(foot)}</p>
</td></tr></table></td></tr></table></body></html>`

const codeBlock = (code: string) =>
  `<p style="margin:0;font-size:40px;font-weight:600;letter-spacing:.18em;font-family:ui-monospace,Menlo,monospace;color:#fff">${esc(`${code.slice(0, 3)} ${code.slice(3)}`)}</p>`

/** The "confirm your email" code, or the "reset your password" code. The code is digits only, so nothing a person typed ever reaches the HTML. */
export function codeEmail(code: string, kind: 'signup' | 'reset') {
  const title = kind === 'signup' ? 'Confirm your email' : 'Reset your password'
  const intro = kind === 'signup' ? 'Enter this code on the page you came from to finish creating your account.' : 'Enter this code, then choose a new password.'
  const foot = kind === 'signup' ? 'It works for 10 minutes. If you did not sign up, ignore this email and nothing will be created.' : 'It works for 10 minutes. If you did not ask to reset your password, ignore this email: your password has not changed.'
  return {
    subject: kind === 'signup' ? `Confirm your logoless email: ${code}` : `Reset your logoless password: ${code}`,
    text: `${title}\n\nYour code is ${code}.\n\n${foot}\n\nlogoless`,
    html: shell(title, intro, codeBlock(code), foot),
  }
}

/** Sent instead of a code when someone signs up with an address that already has an account. */
export function alreadyMemberEmail() {
  const foot = 'If this was not you, you can ignore this email. Your account is safe.'
  return {
    subject: 'You already have a logoless account',
    text: `Someone (probably you) tried to create a logoless account with this email address, but it already has one.\n\nLog in at https://logoless.io/login. If you forgot your password, use "Forgot your password?" on that page.\n\n${foot}\n\nlogoless`,
    html: shell('You already have an account', 'Someone tried to sign up with this address. It is already registered.', `<p style="margin:0"><a href="https://logoless.io/login" style="display:inline-block;background:#f3f2ee;color:#000;text-decoration:none;font-size:14px;font-weight:600;padding:13px 26px;border-radius:999px">Log in</a></p>`, `Forgot your password? Use the link on the login page. ${foot}`),
  }
}
