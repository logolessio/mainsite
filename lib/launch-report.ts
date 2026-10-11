// The overnight report, written once and sent once. Pure data and string building: no secrets, no database.
// Everything here is static text, and every piece is escaped before it goes into the HTML.

export type Item = string | [string, string]
export type Block = { h: string; intro?: string; items?: Item[]; numbered?: boolean; note?: string }
export type Report = { id: string; to: string; subject: string; preheader: string; title: string; intro: string; blocks: Block[]; footer: string }

export const OVERNIGHT: Report = {
  id: 'overnight-2026-10-11',
  to: 'emile@logoless.io',
  subject: 'logoless overnight report: dev site, push button, 13 new features and one thing I broke',
  preheader: 'Everything I did while you slept, what is live, what is waiting on the dev site, and what needs you.',
  title: 'Your overnight report',
  intro: 'You asked for everything I could do to get the site ready, a dev site with a push button, and a full lowdown. This is it. The short version comes first, the detail after.',
  blocks: [
    {
      h: 'The short version',
      items: [
        ['logoless.io is up and healthy.', 'The real fixes below are live. Every new feature is switched off on the live site until you push it, so nothing about how the site looks or behaves for visitors changed in a dramatic way.'],
        ['dev.logoless.io exists.', 'Admins only, every new feature switched on, and a floating "push" button on every page.'],
        ['13 features are waiting on the dev site.', 'Tick the ones you want, press push, and they go live on logoless.io straight away. Every push can be undone.'],
        ['I made one mistake.', 'The live site was down for about five minutes around 10pm while I set up the dev address. It is fixed and the cause is written into the project so it cannot happen again. Details in the next section.'],
        ['Seven things need you.', 'They are the checklist near the bottom. The two that matter most: press the push button once to test it, and make the @logoless.io mailboxes exist.'],
      ],
    },
    {
      h: 'The mistake, and the fix',
      intro: 'To put the dev site on dev.logoless.io I added a list of addresses to the project settings. Cloudflare treats that list as the complete set of addresses for the site, so logoless.io was detached from the worker and visitors got a Cloudflare error (1016) from roughly 10:03pm to 10:08pm BST.',
      items: [
        'I noticed on my next check, added logoless.io back to the list, pushed, and confirmed the site, a campaign page, the health check and the dev site all answered correctly afterwards.',
        'The settings file now has a warning comment: logoless.io must always stay in that list.',
        'Nothing else was affected: no data was lost, no payments were in flight, and the database was never touched by this.',
        'If you ever see a Cloudflare 1016 or 530 error on logoless.io, check Workers > mainsite > Settings > Domains and Routes and make sure logoless.io is listed.',
      ],
      note: 'Some Macs and routers remember "this address does not exist" for a few minutes after a blip like this, so the site can look down on one device and fine on another for a short while afterwards.',
    },
    {
      h: 'The dev site and the push button',
      items: [
        ['Where:', 'dev.logoless.io. It runs the same code and the same database as logoless.io, so there is nothing to keep in sync. Anyone who is not signed in as an admin sees only a sign-in screen. It is hidden from Google.'],
        ['Signing in:', 'Email and password works straight away. Google sign-in needs one extra step: in Google Cloud Console > Credentials > your OAuth client > Authorised redirect URIs, add https://dev.logoless.io/api/auth/callback/google. If your admin account has only ever used Google, open "Forgot your password" on dev.logoless.io to give it a password.'],
        ['The push button:', 'A white pill at the bottom right of every dev page. Click it, tick the features you want, press "Push to live". It also lives at Admin > Push features on logoless.io.'],
        ['Undoing:', 'The History tab lists every push. You can undo one feature, or a whole push, with one click. Undo takes effect instantly too.'],
        ['Be aware:', 'Pushing writes straight to the live site, and it is instant. There is a confirmation step, but there is no staging copy in between.'],
        ['What I could not test:', 'My permissions blocked me from pressing the final "Push to live" button, because it is a write to the live feature switches. I tested everything up to it (the panel, the list, the history tab, the server checks behind it), but not the last click. Please press it once with something harmless like Calm mode, check it appears on logoless.io, then undo it.'],
      ],
    },
    {
      h: 'The 13 features on the dev site',
      intro: 'All of these are on, for you, at dev.logoless.io. None are visible on logoless.io until pushed.',
      items: [
        ['Reels', '/reels. A full-screen, swipeable way to browse campaigns, one at a time, with the track playing, the rate, the pool and a one-tap "Clip this". Arrow keys and M for sound.'],
        ['Spotlight search', 'Press ⌘K or / on the public site to search every live campaign and page. Press ? for shortcuts.'],
        ['Clipper leaderboard', '/leaderboard. A podium and ranking of top clippers by verified views, only for people who chose to show their views.'],
        ['Live numbers on the home page', 'A band of real totals (live campaigns, paid out, clips posted). It hides itself until the numbers are worth showing, so it never says "0".'],
        ['Earnings and budget calculators', 'On For clippers and For brands: slide to see what a clip earns or what a budget buys.'],
        ['Watch a clip earn', 'On How it works: an animated phone and balance. A made-up clip is posted, checked, approved and its views turn into money. Visitors can change the rate and replay.'],
        ['Public status page', '/status. Checks the database, sign-in, payments and email live. Also a /api/health endpoint, which is live already (see below).'],
        ['Announcement bar', 'A glass message pill at the bottom of the public site that you write in Admin > Push features. For launch day or downtime. Visitors can dismiss it.'],
        ['Live notification toasts', 'A toast slides in when something happens to you (payment, approval, badge) without refreshing.'],
        ['Badge celebration', 'Unlock a badge and a full-screen celebration shows it with confetti.'],
        ['Your recap', '/dashboard/recap. A story-style look back for clippers: earned, views, clips, biggest campaign, best clip, badges, with counting numbers and a progress bar.'],
        ['Saved campaigns', '/dashboard/saved. Every campaign a clipper has hearted, in one place.'],
        ['Calm mode', 'A footer switch that turns off the heavy motion for people who prefer a quieter site or have a slower phone.'],
      ],
    },
    {
      h: 'What I fixed on logoless.io (live now)',
      intro: 'These were things that looked finished but were not, or were quietly missing. They matter more than any new feature.',
      items: [
        ['Sign-up now saves what people fill in.', 'The onboarding flow collected a name, handle, photo, bio, country, interests and social accounts, then threw them away. Now it saves them to the profile, uploads the photo for real, checks handle availability against the database, and shows an error with a retry instead of pretending it worked. Brands who sign up also send you a lead notification.'],
        ['The contact form now sends.', 'It used to say "Message sent" without sending anything. It now emails the first address in ADMIN_EMAILS with the sender as reply-to, is rate limited, has a hidden spam trap, and shows an honest error if email is ever offline.'],
        ['Settings are real.', 'The settings page was entirely fake. Now: you can change your password (current password required, checked against common and breached passwords), see your email, jump to profile and notifications, and ask for account deletion. The made-up notification toggles are gone.'],
        ['Linked accounts are honest.', 'The "verify with a code in your bio" flow was theatre: the first check always failed and the second always passed, and nothing was saved. It is replaced with "add your username", saved on the profile, labelled "added" rather than "verified", with copy saying your team checks clips against these accounts.'],
        ['Support addresses.', 'The site listed support@, legal@, privacy@, press@ and abuse@ at logoless.com. They are now @logoless.io. Those mailboxes must exist (see the checklist).'],
        ['Health check.', 'logoless.io/api/health returns 200 when the database, sign-in, payments and email are all configured, and 503 when not. Point a free uptime monitor (UptimeRobot, Better Stack) at it and you get a text when anything breaks. It is green right now.'],
        ['Remove sample campaigns.', 'Admin > Campaigns now has a "Remove sample campaigns" button. It deletes the made-up artists in one click, and only ones that never held money or clips. Do it once your first real campaign is live, so the home page is never empty.'],
        ['Launch readiness page.', 'Two new checks on Admin > Launch readiness: the contact form reaching you, and the dev site.'],
        ['Sharing and install.', 'Campaign links now show a proper large card on X, iMessage and Discord. The site can be added to a phone home screen (web app manifest). A security.txt file tells researchers where to report problems. robots.txt hides the dev site.'],
        ['Reserved page names.', 'Artists can no longer claim a link like logoless.io/leaderboard or /reels that a real page uses.'],
      ],
    },
    {
      h: 'What needs you',
      numbered: true,
      items: [
        ['Press the push button once.', 'Dev site > push > tick Calm mode > Push to live. Check logoless.io footer shows the switch, then undo it from History.'],
        ['Google, two bits.', 'Add the dev redirect URI above, and make sure the Google app is "In production" rather than "Testing" (OAuth consent screen), or only test users can log in.'],
        ['Make the mailboxes exist.', 'In Cloudflare > Email > Email Routing, create support@, legal@, privacy@, press@ and abuse@logoless.io and forward them to you. Until you do, the footer and legal pages publish addresses that bounce.'],
        ['Company name and address.', 'lib/site.ts still says "Logoless Inc." and "[Registered business address]". They appear on the legal pages and the readiness page lists it as a blocker. Tell me the real details and I will put them in.'],
        ['Footer social links.', 'The Discord, X, Instagram, TikTok and YouTube links in lib/site.ts are guesses at handles. Send me the real ones or confirm.'],
        ['The Stripe account name.', 'It is called "EDUNE". Is that the same business as logoless? If it is a different company, payouts and receipts will show that name and the terms should say who the contracting party is.'],
        ['Small Cloudflare items.', 'If you use Turnstile, make sure dev.logoless.io is allowed on the widget. Consider attaching www.logoless.io to the worker too (it is not attached now, so www links do not work). The Workers Paid plan ($5) and usage alerts are still ticks on the readiness page.'],
      ],
    },
    {
      h: 'Earlier today (already live)',
      intro: 'Covered in the chat as it happened, repeated here so this email is the full record.',
      items: [
        'Artist invite links (logoless.io/their-name), the artist onboarding, funding and clip pages, and the admin Artist links page.',
        'Campaign pages rebuilt: a big hero in the cover colours, large numbers, the brief beside an earnings calculator, rules, how you get paid, the submit section and more campaigns. Tiles cleaned up.',
        '19 profile card effects (embers, and the rest), a tabbed profile editor, username-only socials, icon-only connections.',
        '24 hand-drawn badges with a new achievements page, and a redesigned notifications panel and page.',
        'Dashboard panel opens when the cursor hits the left edge, an Admin dashboard button for admins, the new wordmark, the notification badge fix.',
        'Stripe: the live keys and both webhooks were walked through together. The signing secret that was pasted into chat should be rolled if it was not already (you did this).',
      ],
    },
    {
      h: 'How it was checked, honestly',
      items: [
        'Every change passed the type checker, and the full production build passed before each push. Cloudflare built every push successfully.',
        'I called the contact API with a valid message, an invalid one, a cross-site request and a bot (the spam trap); the password, search and handle APIs; and loaded the pages on both a dev-mode and a production-mode copy. The live site returns 404 for every feature you have not pushed.',
        'I looked at Reels, the push panel, the status page and the Watch a clip earn demo in a real browser. The Recap and leaderboard were checked for structure and errors but not with real data, because the test database has no clippers with earnings.',
        'There is no automated test suite in the project, and nothing here was tested with real money or real members. Treat a first run of the whole loop (artist link, fund, launch, clip, approve, payout) as still to do.',
      ],
    },
    {
      h: 'If you want something undone',
      items: [
        'A feature you pushed: dev site > push > History > Undo. Instant.',
        'A change to the live site: every change is its own commit. c01d745 (onboarding, contact, settings, accounts), af03646 (launch prep), f6f3555 (dev system and the first ten features). Ask me to revert one, or run git revert on it and push.',
        'Never remove logoless.io from the list of routes in wrangler.jsonc.',
      ],
    },
  ],
  footer: 'Sent by the logoless site itself, as you asked. A copy of this report is saved in the project as LAUNCH_REPORT.md.',
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

export function reportMail(r: Report) {
  const text = [
    r.title.toUpperCase(),
    '',
    r.intro,
    '',
    ...r.blocks.flatMap((b) => [
      '',
      b.h.toUpperCase(),
      ...(b.intro ? [b.intro] : []),
      ...(b.items ?? []).map((it, i) => `${b.numbered ? `${i + 1}.` : '-'} ${Array.isArray(it) ? `${it[0]} ${it[1]}` : it}`),
      ...(b.note ? ['', b.note] : []),
    ]),
    '',
    r.footer,
  ].join('\n')

  const blocks = r.blocks
    .map((b) => {
      const tag = b.numbered ? 'ol' : 'ul'
      const items = (b.items ?? [])
        .map((it) => `<li style="margin:0 0 12px;padding:0 0 0 2px;color:#c9c9cf">${Array.isArray(it) ? `<strong style="color:#f3f2ee;font-weight:600">${esc(it[0])}</strong> ${esc(it[1])}` : esc(it)}</li>`)
        .join('')
      return `<h2 style="margin:38px 0 10px;font:600 20px/1.25 ${SANS};letter-spacing:-.01em;color:#f3f2ee">${esc(b.h)}</h2>
${b.intro ? `<p style="margin:0 0 14px;font:400 15px/1.6 ${SANS};color:#a2a2a9">${esc(b.intro)}</p>` : ''}
${items ? `<${tag} style="margin:0;padding:0 0 0 22px;font:400 15px/1.6 ${SANS}">${items}</${tag}>` : ''}
${b.note ? `<p style="margin:12px 0 0;font:400 13px/1.55 ${SANS};color:#80808a">${esc(b.note)}</p>` : ''}`
    })
    .join('\n')

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>${esc(r.title)}</title></head>
<body style="margin:0;background:#050506">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#050506;font-size:1px;line-height:1px">${esc(r.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#050506" style="background:#050506"><tr><td align="center" style="padding:32px 14px">
<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px">
<tr><td align="center" style="padding:0 0 20px"><a href="https://logoless.io" style="text-decoration:none"><img src="https://logoless.io/logo-sm.png" width="120" height="63" alt="logoless" style="display:block;border:0;width:120px;height:63px;font:600 20px/63px ${SANS};color:#f3f2ee"></a></td></tr>
<tr><td bgcolor="#0b0b0d" style="background:#0b0b0d;border:1px solid #232328;border-radius:24px;padding:38px 34px">
<h1 style="margin:0 0 12px;font:300 34px/1.1 ${SANS};letter-spacing:-.02em;color:#f3f2ee">${esc(r.title)}</h1>
<p style="margin:0;font:400 16px/1.6 ${SANS};color:#a2a2a9">${esc(r.intro)}</p>
${blocks}
</td></tr>
<tr><td align="center" style="padding:22px 12px 0;font:400 12px/1.7 ${SANS};color:#6c6c75">${esc(r.footer)}</td></tr>
</table></td></tr></table></body></html>`
  return { subject: r.subject, text, html }
}

/** The reports that can be sent, by id. */
export const REPORTS: Record<string, Report> = { [OVERNIGHT.id]: OVERNIGHT }
