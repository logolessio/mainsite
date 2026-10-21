// The emails logoless sends. Pure functions (no secrets, no database) so the admin page can preview them too.
// Email clients are fussy, so everything is tables with inline styles, and it still looks right with images off.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

export const SITE_URL = 'https://logoless.io'
const LOGO = `${SITE_URL}/logo-sm.png`
const MONO = "'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace"
const SANS = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

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

const SERIF = "Gloock,Georgia,'Times New Roman',Times,serif"

function layout(l: Layout) {
  const banner = l.test
    ? `<tr><td style="padding:0 0 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="left" style="background:#111114;border:1px solid #2a2a30;border-radius:12px;padding:10px 14px;font:500 12px/1.4 ${SANS};color:#a2a2a9">Test email from the admin panel. Nothing was created.</td></tr></table></td></tr>`
    : ''
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(l.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Gloock&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
  body{margin:0!important;padding:0!important;background:#050506;-webkit-text-size-adjust:100%}
  a{color:#f3f2ee}
  a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;font:inherit!important}
  @media (max-width:560px){
    .wrap{padding:24px 14px 32px!important}
    .card{padding:34px 24px 30px!important}
    .code{font-size:32px!important}
    .h1{font-size:32px!important}
  }
</style></head>
<body style="margin:0;background:#050506">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#050506;font-size:1px;line-height:1px">${esc(l.preheader)}&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;&#8199;&zwnj;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#050506" style="background:#050506"><tr><td align="center" class="wrap" style="padding:48px 16px 56px">
<table role="presentation" width="540" cellpadding="0" cellspacing="0" style="width:100%;max-width:540px">
${banner}
<tr><td align="left" style="padding:0 6px 28px"><a href="${SITE_URL}" style="text-decoration:none"><img src="${LOGO}" width="46" height="34" alt="logoless" style="display:block;border:0;width:46px;height:34px;font:600 18px/34px ${SANS};color:#f3f2ee"></a></td></tr>
<tr><td class="card" bgcolor="#0b0b0d" style="background:#0b0b0d;background-image:linear-gradient(180deg,#151518 0,#0b0b0d 300px);border:1px solid #26262b;border-radius:28px;padding:48px 44px 40px;text-align:left">
  <h1 class="h1" style="margin:0 0 16px;font:400 38px/1.1 ${SERIF};letter-spacing:-.01em;color:#f3f2ee">${esc(l.title)}</h1>
  <p style="margin:0 0 34px;max-width:420px;font:400 16px/1.65 ${SANS};color:#a2a2a9">${esc(l.intro)}</p>
  ${l.body}
  ${l.note ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:38px 0 0"><tr><td style="border-top:1px solid #222227;padding:20px 0 0;font:400 13px/1.65 ${SANS};color:#80808a">${esc(l.note)}</td></tr></table>` : ''}
</td></tr>
<tr><td align="left" style="padding:26px 8px 0;font:400 12px/1.8 ${SANS};color:#6c6c75">
  Sent by logoless because someone used this address on <a href="${SITE_URL}" style="color:#9a9aa3">logoless.io</a>.<br>
  <a href="${SITE_URL}/legal/terms" style="color:#9a9aa3">Terms</a> &nbsp;·&nbsp; <a href="${SITE_URL}/legal/privacy" style="color:#9a9aa3">Privacy</a> &nbsp;·&nbsp; <a href="${SITE_URL}/contact" style="color:#9a9aa3">Help</a>
</td></tr>
</table></td></tr></table></body></html>`
}

/**
 * The code in one panel, as one piece of text, so selecting it (a double click, a long press) takes all six digits and pasting gives
 * "482913" with nothing between. Separate boxes per digit look like a code field, but a client selects them one cell at a time.
 */
function codeBoxes(code: string) {
  const digits = code.replace(/\D/g, '').slice(0, 6)
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0"><tr><td align="center" bgcolor="#101013" style="background:#101013;border:1px solid #2c2c32;border-radius:20px;padding:30px 12px"><span class="code" style="display:inline-block;padding-left:.34em;font:600 44px/1.1 ${MONO};letter-spacing:.34em;color:#ffffff;-webkit-user-select:all;user-select:all">${esc(digits)}</span></td></tr></table>`
}

function expiry() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0"><tr><td align="left" style="font:500 13px/1.4 ${SANS};color:#8a8a93">Works for 10 minutes</td><td align="right" style="font:500 13px/1.4 ${SANS};color:#8a8a93">Single use</td></tr></table>`
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
export function codeEmail(code: string, kind: 'signup' | 'reset' | 'verify' | 'payout', test = false, meta?: Meta): Mail {
  if (kind === 'payout') {
    const t = test ? '[TEST] ' : ''
    return {
      subject: `${t}${code} is your logoless payout code`,
      text: [test ? 'THIS IS A TEST from the admin panel.\n' : '', 'Confirm a payout email', '', `Your code is ${code}`, 'It works for 10 minutes and can be used once.', '', 'You asked to add a PayPal email for payouts. Only enter this code on logoless. Anyone who has it could send your earnings to their own PayPal.', '', metaText(meta)].join('\n'),
      html: layout({
        preheader: `${code} is your code. It works for 10 minutes.`,
        tag: test ? 'Test' : 'Security',
        title: test ? 'Confirm a payout email (test)' : 'Confirm a payout email',
        intro: 'Enter this code on logoless to add the PayPal email you just typed. Your earnings can be sent there once it is added.',
        body: `${codeBoxes(code)}${expiry()}${details(meta)}`,
        note: 'If you did not ask to add a payout email, do not share this code and change your password. Nothing has been added.',
        test,
      }),
    }
  }
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

/** The code that proves an address on the waitlist. Digits only, so nothing typed by a visitor reaches the HTML. */
export function waitlistCodeEmail(code: string, test = false, meta?: Meta): Mail {
  const note = 'If you did not ask to join the logoless waitlist, ignore this email. Nothing happens without the code.'
  return {
    subject: `${test ? '[TEST] ' : ''}${code} is your logoless waitlist code`,
    text: `${test ? 'THIS IS A TEST from the admin panel.\n\n' : ''}Confirm your spot\n\nYour code is ${code}\nIt works for 10 minutes and can be used once.\n\n${metaText(meta)}${metaText(meta) ? '\n\n' : ''}${note}\n\nlogoless · ${SITE_URL}`,
    html: layout({
      preheader: `${code} is your code. It works for 10 minutes.`,
      tag: test ? 'Test' : 'Waitlist',
      title: test ? 'Confirm your spot (test)' : 'Confirm your spot',
      intro: 'Enter this code on the logoless page to hold your place on the waitlist. Next you can reserve your username.',
      body: `${codeBoxes(code)}${expiry()}${details(meta)}`,
      note,
      test,
    }),
  }
}

/** Sent once someone is on the waitlist: everything they gave us, and how to leave. The username is escaped (it is only ever letters, numbers, dots and underscores anyway). */
export function waitlistWelcomeEmail(input: { email: string; handle: string | null; joinedAt: number; position: number | null; unsubscribe: string }, test = false): Mail {
  const d = new Date(input.joinedAt * 1000)
  const two = (n: number) => String(n).padStart(2, '0')
  const when = `${two(d.getUTCDate())}/${two(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${two(d.getUTCHours())}:${two(d.getUTCMinutes())} UTC`
  const rows: [string, string][] = [
    ['Email', input.email],
    ['Username', input.handle ? `@${input.handle}` : 'None reserved yet'],
    ['Joined', when],
    ...(input.position ? ([['Place on the list', `#${input.position.toLocaleString('en-US')}`]] as [string, string][]) : []),
  ]
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">${rows
    .map(([k, v]) => `<tr><td align="left" style="padding:13px 0;border-top:1px solid #222227;font:400 13px/1.3 ${SANS};color:#6c6c75">${esc(k)}</td><td align="right" style="padding:13px 0;border-top:1px solid #222227;font:500 14px/1.3 ${SANS};color:#e4e4e8">${esc(v)}</td></tr>`)
    .join('')}</table>`
  const leave = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 0"><tr><td align="left" style="background:#111114;border:1px solid #26262b;border-radius:16px;padding:16px 18px"><p style="margin:0 0 6px;font:600 11px/1 ${SANS};letter-spacing:.12em;text-transform:uppercase;color:#80808a">Changed your mind?</p><p style="margin:0;font:400 14px/1.6 ${SANS};color:#c3c3ca">One click on <a href="${esc(input.unsubscribe)}" style="color:#f3f2ee">unsubscribe</a> takes you off the list and frees your username. There is nothing to confirm and no account to delete. Every email we send about the launch has the same link at the bottom.</p></td></tr></table>`
  return {
    subject: `${test ? '[TEST] ' : ''}${input.handle ? `@${input.handle} is yours` : 'You are on the logoless waitlist'}`,
    text: `${test ? 'THIS IS A TEST from the admin panel.\n\n' : ''}You are on the logoless waitlist.\n\nWhat you signed up with:\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nWe will email this address when logoless opens, and only about the launch.\n\nChanged your mind? One click takes you off the list and frees your username:\n${input.unsubscribe}\n\nlogoless · ${SITE_URL}`,
    html: layout({
      preheader: input.handle ? `@${input.handle} is held for you. Here is everything you signed up with.` : 'Here is everything you signed up with.',
      tag: test ? 'Test' : 'Waitlist',
      title: input.handle ? `@${input.handle} is yours` : 'You are on the list',
      intro: 'Thanks for joining the logoless waitlist. Here is everything you signed up with. We will email this address when the doors open, and only about the launch.',
      body: `${table}${button(SITE_URL, 'Visit logoless')}${leave}`,
      test,
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
  { id: 'waitlist-code', label: 'Waitlist code', make: () => waitlistCodeEmail('215804', false, { place: 'Singapore', device: 'Safari on iPhone' }) },
  { id: 'waitlist-welcome', label: 'Waitlist confirmation', make: () => waitlistWelcomeEmail({ email: 'sam@example.com', handle: 'sam.clips', joinedAt: 1792540800, position: 1284, unsubscribe: `${SITE_URL}/api/launch/unsubscribe?k=0&t=0` }) },
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

/** An update to the people who signed up on the launch page. `message` is plain text: blank lines start a new paragraph. Every one carries an unsubscribe link. */
export function launchUpdateEmail(subject: string, message: string, unsubscribe: string, test = false): Mail {
  const paras = message.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).slice(0, 12)
  const [first, ...rest] = paras
  const bodyHtml = `${rest.map((p) => `<p style="margin:0 0 16px;font:400 16px/1.65 ${SANS};color:#c3c3ca">${esc(p).replace(/\n/g, '<br>')}</p>`).join('')}${button(SITE_URL, 'Open logoless')}<p style="margin:26px 0 0;font:400 12px/1.6 ${SANS};color:#6c6c75">You are getting this because you signed up on the logoless launch page. <a href="${esc(unsubscribe)}" style="color:#9a9aa3">Unsubscribe</a>.</p>`
  return {
    subject: `${test ? '[TEST] ' : ''}${subject}`,
    text: `${test ? 'THIS IS A TEST from the admin panel.\n\n' : ''}${paras.join('\n\n')}\n\n${SITE_URL}\n\nUnsubscribe: ${unsubscribe}\n\nlogoless`,
    html: layout({ preheader: first ?? subject, tag: test ? 'Test' : 'Update', title: subject, intro: first ?? '', body: bodyHtml, test }),
  }
}

/** One notification, or a bundle of them (a digest, or what waited out quiet hours). Each item links to where it happened. */
export function notificationsEmail(name: string, items: { title: string; body?: string; href?: string | null }[], digest: 'daily' | 'weekly' | null, test = false): Mail {
  const first = name.trim().slice(0, 60) || 'there'
  const one = items.length === 1 ? items[0] : null
  const link = (h?: string | null) => (h ? (h.startsWith('/') ? `${SITE_URL}${h}` : h) : `${SITE_URL}/dashboard/notifications`)
  const title = one ? one.title : digest === 'weekly' ? 'Your week on logoless' : digest === 'daily' ? 'Your day on logoless' : `${items.length} new notifications`
  const rows = items
    .slice(0, 30)
    .map((n) => `<tr><td style="padding:14px 0;border-top:1px solid #222227"><a href="${esc(link(n.href))}" style="text-decoration:none"><span style="display:block;font:500 15px/1.45 ${SANS};color:#f3f2ee">${esc(n.title)}</span>${n.body ? `<span style="display:block;margin-top:3px;font:400 14px/1.5 ${SANS};color:#9a9aa3">${esc(n.body)}</span>` : ''}</a></td></tr>`)
    .join('')
  const settings = `${SITE_URL}/dashboard/notifications/settings`
  return {
    subject: `${test ? '[TEST] ' : ''}${title}`,
    text: `Hi ${first},\n\n${items.map((n) => `- ${n.title}${n.body ? `: ${n.body}` : ''}\n  ${link(n.href)}`).join('\n')}\n\nChoose what we email you: ${settings}\n\nlogoless`,
    html: layout({
      preheader: one?.body || items.map((n) => n.title).join(' · '),
      tag: 'Notifications',
      title,
      intro: one ? `Hi ${first}. ${one.body ?? ''}`.trim() : `Hi ${first}. Here is what happened.`,
      body: `${one ? '' : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">${rows}</table>`}${button(one ? link(one.href) : `${SITE_URL}/dashboard/notifications`, one ? 'Open it' : 'See them all')}`,
      note: `You get these because of your notification settings. Change them any time: ${settings}`,
      test,
    }),
  }
}
