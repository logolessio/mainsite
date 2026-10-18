// The emails logoless sends. Pure functions (no secrets, no database) so the admin page can preview them too.
// Email clients are fussy, so everything is tables with inline styles, and it still looks right with images off.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

export const SITE_URL = 'https://logoless.io'
const LOGO = `${SITE_URL}/logo-sm.png`
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace"
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

export type Meta = { place?: string | null; device?: string | null }
export type Mail = { subject: string; text: string; html: string }

type Layout = {
  preheader: string
  tag: string // small label above the title
  title: string
  intro: string
  body: string // already-escaped HTML
  note?: string // small print under the body
  test?: boolean
}

const SERIF = "Georgia,'Times New Roman',Times,serif"

function layout(l: Layout) {
  const banner = l.test
    ? `<tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="left" style="background:#2a1d05;border:1px solid #5a4210;border-radius:12px;padding:10px 14px;font:600 12px/1.4 ${SANS};color:#ffcf70">Test email from the admin panel. Nothing was created.</td></tr></table></td></tr>`
    : ''
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(l.title)}</title>
<style>
  body{margin:0!important;padding:0!important;background:#050506}
  a{color:#f3f2ee}
  @media (max-width:560px){
    .wrap{padding:20px 12px!important}
    .card{padding:32px 22px!important}
    .digit{width:42px!important;height:56px!important;font-size:26px!important;line-height:56px!important}
    .h1{font-size:31px!important}
  }
</style></head>
<body style="margin:0;background:#050506">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#050506;font-size:1px;line-height:1px">${esc(l.preheader)}&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#050506" style="background:#050506"><tr><td align="center" class="wrap" style="padding:40px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px">
${banner}
<tr><td align="left" style="padding:0 4px 24px"><a href="${SITE_URL}" style="text-decoration:none"><img src="${LOGO}" width="52" height="39" alt="logoless" style="display:block;border:0;width:52px;height:39px;font:600 18px/39px ${SANS};color:#f3f2ee"></a></td></tr>
<tr><td class="card" bgcolor="#0b0b0d" style="background:#0b0b0d;border:1px solid #232328;border-radius:24px;padding:46px 42px;text-align:left">
  <h1 class="h1" style="margin:0 0 14px;font:400 38px/1.08 ${SERIF};letter-spacing:-.015em;color:#f3f2ee">${esc(l.title)}</h1>
  <p style="margin:0 0 32px;max-width:410px;font:400 16px/1.6 ${SANS};color:#a2a2a9">${esc(l.intro)}</p>
  ${l.body}
  ${l.note ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:34px 0 0"><tr><td style="border-top:1px solid #222227;padding:18px 0 0;font:400 13px/1.6 ${SANS};color:#80808a">${esc(l.note)}</td></tr></table>` : ''}
</td></tr>
<tr><td align="left" style="padding:24px 6px 0;font:400 12px/1.7 ${SANS};color:#6c6c75">
  Sent by logoless because someone used this address on <a href="${SITE_URL}" style="color:#9a9aa3">logoless.io</a>.<br>
  <a href="${SITE_URL}/legal/terms" style="color:#9a9aa3">Terms</a> &nbsp;·&nbsp; <a href="${SITE_URL}/legal/privacy" style="color:#9a9aa3">Privacy</a> &nbsp;·&nbsp; <a href="${SITE_URL}/contact" style="color:#9a9aa3">Help</a>
</td></tr>
</table></td></tr></table></body></html>`
}

/** Six separate boxes, one per digit, so the code is easy to read and to type. Under them the same code as plain text, which is easy to select and copy. */
function codeBoxes(code: string) {
  const digits = code.replace(/\D/g, '').slice(0, 6)
  const cells = [...digits]
    .map(
      (d) =>
        `<td class="digit" align="center" width="52" height="66" style="width:52px;height:66px;background:#111114;border:1px solid #303036;border-radius:14px;font:500 30px/66px ${MONO};color:#ffffff">${esc(d)}</td>`,
    )
    .join('<td width="8" style="width:8px"></td>')
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0"><tr>${cells}</tr></table>
<p style="clear:both;margin:20px 0 0;font:400 13px/1.5 ${SANS};color:#80808a">Cannot select the boxes? Copy it from here: <span style="font:600 14px/1.5 ${MONO};letter-spacing:.12em;color:#f3f2ee;-webkit-user-select:all;user-select:all">${esc(digits)}</span></p>`
}

function expiry() {
  return `<p style="margin:22px 0 0;font:500 13px/1.5 ${SANS};color:#b4b4bb">Works for 10 minutes. It can be used once.</p>`
}

function details(meta?: Meta) {
  const rows = [meta?.place ? ['Where', meta.place] : null, meta?.device ? ['Device', meta.device] : null].filter(Boolean) as string[][]
  if (!rows.length) return ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 0">${rows
    .map(([k, v]) => `<tr><td align="left" style="padding:12px 0;border-top:1px solid #222227;font:400 13px/1 ${SANS};color:#6c6c75">${esc(k)}</td><td align="right" style="padding:12px 0;border-top:1px solid #222227;font:500 13px/1 ${SANS};color:#c3c3ca">${esc(v)}</td></tr>`)
    .join('')}</table>`
}

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0"><tr><td bgcolor="#f3f2ee" style="background:#f3f2ee;border-radius:999px"><a href="${esc(href)}" style="display:inline-block;padding:16px 34px;font:600 15px/1 ${SANS};color:#050506;text-decoration:none;border-radius:999px">${esc(label)}</a></td></tr></table>`
}

const metaText = (m?: Meta) => [m?.place ? `Where: ${m.place}` : '', m?.device ? `Device: ${m.device}` : ''].filter(Boolean).join('\n')

/** The "confirm your email" code, or the "reset your password" code. The code is digits only, so nothing a person typed ever reaches the HTML. */
export function codeEmail(code: string, kind: 'signup' | 'reset' | 'verify', test = false, meta?: Meta): Mail {
  const signup = kind === 'signup' || kind === 'verify'
  const title = kind === 'verify' ? 'Confirm it is you' : signup ? 'Confirm your email' : 'Reset your password'
  const intro = kind === 'verify' ? 'Enter this code on the page you came from to finish setting up your logoless account.' : signup ? 'Enter this code on the page you came from to finish creating your logoless account.' : 'Enter this code, then choose a new password.'
  const note = kind === 'verify' ? 'If you did not just sign in to logoless, ignore this email. Nothing has changed.' : signup ? 'If you did not sign up, ignore this email and nothing will be created.' : 'If you did not ask to reset your password, ignore this email. Your password has not changed.'
  const tag = test ? 'Test' : signup ? 'Welcome' : 'Security'
  const body = `${codeBoxes(code)}${expiry()}${details(meta)}${signup ? '' : `<div style="margin-top:26px">${button(`${SITE_URL}/forgot-password`, 'Open the reset page')}</div>`}`
  const t = test ? '[TEST] ' : ''
  return {
    subject: `${t}${signup ? `${code} is your logoless confirmation code` : `${code} is your logoless reset code`}`,
    text: [test ? 'THIS IS A TEST from the admin panel.\n' : '', title, '', `Your code is ${code}`, 'It works for 10 minutes and can be used once.', '', metaText(meta), metaText(meta) ? '' : null, note, '', 'logoless · https://logoless.io'].filter((x) => x !== null).join('\n'),
    html: layout({ preheader: `${code} is your code. It works for 10 minutes.`, tag, title: test ? `${title} (test)` : title, intro, body, note, test }),
  }
}

/** Sent instead of a code when someone signs up with an address that already has an account. */
export function alreadyMemberEmail(test = false, meta?: Meta): Mail {
  const note = 'If this was not you, you can ignore this email. Your account is safe and nothing has changed.'
  return {
    subject: `${test ? '[TEST] ' : ''}You already have a logoless account`,
    text: `${test ? 'THIS IS A TEST from the admin panel.\n\n' : ''}Someone (probably you) tried to create a logoless account with this address, but it already has one.\n\nLog in: ${SITE_URL}/login\nForgot your password? Use the link on that page.\n\n${metaText(meta)}\n${note}\n\nlogoless`,
    html: layout({
      preheader: 'This address already has an account. Log in instead.',
      tag: test ? 'Test' : 'Account',
      title: 'You already have an account',
      intro: 'Someone tried to sign up with this address, but it is already registered. Log in instead.',
      body: `${button(`${SITE_URL}/login`, 'Log in')}<p style="margin:18px 0 0;font:400 13px/1.5 ${SANS};color:#80808a">Forgot your password? Choose <a href="${SITE_URL}/forgot-password" style="color:#bdbdc4">Forgot your password</a> on the login page.</p>${details(meta)}`,
      note,
      test,
    }),
  }
}

/** The private link sent to an artist we have spoken to. The name and link are escaped, so nothing typed by an admin can inject HTML. */
export function inviteEmail(artistName: string, url: string, test = false): Mail {
  const first = artistName.trim().slice(0, 60)
  const note = 'This link is only for you. If you were not expecting it, you can ignore this email.'
  return {
    subject: `${test ? '[TEST] ' : ''}${first}, your logoless page is ready`,
    text: `${test ? 'THIS IS A TEST from the admin panel.\n\n' : ''}Hey ${first},\n\nYour private logoless page is ready. It takes a few minutes: set up your artist page, launch your first campaign and start getting clips made.\n\n${url}\n\n${note}\n\nlogoless`,
    html: layout({
      preheader: 'Set up your page and launch your first campaign in a few minutes.',
      tag: test ? 'Test' : 'Invitation',
      title: `Hey ${first}`,
      intro: 'Your private logoless page is ready. Set up your artist page, launch your first campaign and get clippers posting your music.',
      body: `${button(url, 'Open my page')}<p style="margin:18px 0 0;font:400 13px/1.5 ${SANS};color:#80808a">Or paste this into your browser:<br><span style="color:#bdbdc4">${esc(url)}</span></p>`,
      note,
      test,
    }),
  }
}

/** Sent to the owner when a logoless admin deletes their account. The reason is what the admin typed, escaped, so it cannot inject HTML. */
export function accountDeletedEmail(name: string, reason: string, money: string, test = false): Mail {
  const first = name.trim().slice(0, 60) || 'there'
  const why = reason.trim().slice(0, 280)
  const note = 'This was done by a person on the logoless team. If you think it is a mistake, write to us through the contact page and we will look again.'
  const reasonBlock = why ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 22px"><tr><td align="left" style="background:#111114;border:1px solid #26262b;border-radius:16px;padding:14px 18px"><p style="margin:0 0 6px;font:600 11px/1 ${SANS};letter-spacing:.12em;text-transform:uppercase;color:#80808a">Reason given</p><p style="margin:0;font:400 15px/1.5 ${SANS};color:#e4e4e8">${esc(why)}</p></td></tr></table>` : ''
  const moneyBlock = money ? `<p style="margin:0 0 24px;max-width:400px;font:400 14px/1.55 ${SANS};color:#a2a2a9">${esc(money)}</p>` : ''
  return {
    subject: `${test ? '[TEST] ' : ''}Your logoless account has been deleted`,
    text: `${test ? 'THIS IS A TEST from the admin panel.\n\n' : ''}Hi ${first},\n\nA member of the logoless team has deleted your account.${why ? `\n\nReason given: ${why}` : ''}${money ? `\n\n${money}` : ''}\n\nYour profile, linked accounts and saved details have been removed. Records we are required to keep, like payment history, stay without your name.\n\nIf you think this is a mistake, write to us: ${SITE_URL}/contact\n\nlogoless`,
    html: layout({
      preheader: 'A member of the logoless team deleted your account.',
      tag: test ? 'Test' : 'Account',
      title: 'Your account was deleted',
      intro: `Hi ${first}. A member of the logoless team has deleted your account. Your profile, linked accounts and saved details are gone.`,
      body: `${reasonBlock}${moneyBlock}${button(`${SITE_URL}/contact`, 'Contact us')}`,
      note,
      test,
    }),
  }
}

/** Sent when the owner gives or changes someone's role. `roles` are the labels now held ("Admin", "Developer"); empty means all were removed. */
export function roleChangedEmail(name: string, roles: string[], test = false): Mail {
  const first = name.trim().slice(0, 60) || 'there'
  const has = roles.length > 0
  const list = roles.join(' and ')
  const links = [
    roles.includes('Admin') ? `<tr><td style="padding:0 0 8px">${button('https://owner.logoless.io', 'Open the admin dashboard')}</td></tr>` : '',
    roles.includes('Developer') ? `<tr><td>${button('https://dev.logoless.io', 'Open the developer dashboard')}</td></tr>` : '',
  ].join('')
  return {
    subject: `${test ? '[TEST] ' : ''}${has ? `You are now ${roles.length > 1 ? 'an' : /^[AEIOU]/.test(list) ? 'an' : 'a'} ${list} on logoless` : 'Your logoless team access was removed'}`,
    text: `${test ? 'THIS IS A TEST from the admin panel.\n\n' : ''}Hi ${first},\n\n${has ? `The owner of logoless gave you the ${list} role.${roles.includes('Admin') ? '\nAdmin dashboard: https://owner.logoless.io' : ''}${roles.includes('Developer') ? '\nDeveloper dashboard: https://dev.logoless.io' : ''}\n\nSign in with the same account you already use.` : 'The owner of logoless removed your team access. Your normal account is unchanged.'}\n\nlogoless`,
    html: layout({
      preheader: has ? `You now have the ${list} role.` : 'Your team access was removed.',
      tag: test ? 'Test' : 'Team',
      title: has ? `You are now ${list}` : 'Team access removed',
      intro: has ? `Hi ${first}. The owner of logoless gave you the ${list} role. Sign in with the account you already use.` : `Hi ${first}. The owner of logoless removed your team access. Your normal account is unchanged.`,
      body: has ? `<table role="presentation" cellpadding="0" cellspacing="0">${links}</table>` : '',
      note: 'Only the owner can give or take away these roles. If this surprises you, reply through the contact page.',
      test,
    }),
  }
}

/** A plain message to prove sending works. */
export function plainTestEmail(): Mail {
  return {
    subject: '[TEST] logoless email delivery',
    text: 'This is a test from the logoless admin panel. If you can read this, sending works.\n\nlogoless',
    html: layout({
      preheader: 'Sending works.',
      tag: 'Test',
      title: 'Email is working',
      intro: 'If you can read this, logoless can send email from this address.',
      body: button(`${SITE_URL}/admin/email`, 'Back to the admin panel'),
      test: true,
    }),
  }
}

export const PREVIEWS = [
  { id: 'signup', label: 'Sign-up code', make: () => codeEmail('482 913'.replace(' ', ''), 'signup', false, { place: 'London, United Kingdom', device: 'Chrome on macOS' }) },
  { id: 'reset', label: 'Password reset', make: () => codeEmail('730256', 'reset', false, { place: 'Singapore', device: 'Safari on iPhone' }) },
  { id: 'already', label: 'Already a member', make: () => alreadyMemberEmail(false, { place: 'Berlin, Germany', device: 'Firefox on Windows' }) },
  { id: 'deleted', label: 'Account deleted', make: () => accountDeletedEmail('Sam', 'Selling views against the campaign rules.', 'Your remaining balance was returned to the campaigns it came from.') },
  { id: 'role', label: 'Role given', make: () => roleChangedEmail('Sam', ['Admin', 'Developer']) },
  { id: 'plain', label: 'Delivery test', make: () => plainTestEmail() },
] as const

/** A short message from the team to one person. */
export function plainMessageEmail(name: string, title: string, text: string, href?: string, test = false): Mail {
  const first = name.trim().slice(0, 60) || 'there'
  const link = href ? (href.startsWith('/') ? `${SITE_URL}${href}` : href) : ''
  return {
    subject: `${test ? '[TEST] ' : ''}${title}`,
    text: `${test ? 'THIS IS A TEST from the admin panel.\n\n' : ''}Hi ${first},\n\n${title}\n${text ? `\n${text}\n` : ''}${link ? `\n${link}\n` : ''}\nlogoless`,
    html: layout({
      preheader: text || title,
      tag: test ? 'Test' : 'From the team',
      title,
      intro: `Hi ${first}. ${text}`.trim(),
      body: link ? button(link, 'Open it') : '',
      note: 'This message came from a person on the logoless team.',
      test,
    }),
  }
}
