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


export const ADDENDUM: Report = {
  id: 'overnight-addendum-2026-10-12',
  to: 'emile@logoless.io',
  subject: 'logoless overnight report: addendum (a 14th feature, one thing to check)',
  preheader: 'A few things added after the first email, and one setting worth checking before you sign in on the dev site.',
  title: 'Overnight report: addendum',
  intro: 'A short follow-up. I kept going after the first email went out, so here is what changed since, and one thing to check.',
  blocks: [
    {
      h: 'Added since the first email',
      items: [
        ['A 14th feature: Pool remaining meter.', 'On every funded campaign page, a bar and a number show how much of the pool is still unpaid, straight from the money ledger. Campaigns that have not been funded (like the samples) show nothing rather than a made-up figure. On the dev site now; hidden on logoless.io until pushed.'],
        ['A Reels button on the home page.', 'With Reels switched on, the home page gets a "Swipe through campaigns" button next to "Take the tour".'],
        ['The push button counts.', 'The white pill on the dev site now shows how many features are on the dev site but not on logoless.io yet, so you can see at a glance what is waiting.'],
        ['Brand sign-up saves the logo.', 'The logo a brand picks during sign-up was only a temporary preview. It is now uploaded and saved as the brand\'s picture. I also removed a "Balance funded" checklist row at the end of brand sign-up that could never be ticked.'],
      ],
    },
    {
      h: 'One thing to check before you sign in on dev.logoless.io',
      items: [
        ['AUTH_URL.', 'In Cloudflare > Workers > mainsite > Settings > Variables and Secrets, if there is a variable called AUTH_URL (or NEXTAUTH_URL) set to https://logoless.io, delete it. The project does not need it, and it would send you to the live site when you try to sign in on the dev site. If it is not there, there is nothing to do.'],
      ],
    },
    {
      h: 'State when I wrote this',
      items: [
        'logoless.io and dev.logoless.io both answer, the health check is green (database, sign-in, payments, email), and the last Cloudflare build succeeded.',
        'Everything is pushed. The first email was sent once by the site (a second attempt correctly sent nothing).',
        'The checklist in the first email is still the list of what needs you. Nothing in this email adds to it except the AUTH_URL check above.',
      ],
    },
  ],
  footer: 'Sent by the logoless site itself. The full text of both emails is saved in the project as LAUNCH_REPORT.md.',
}

export const FEATURE_LIST: Report = {
  id: 'feature-list-2026-10-12',
  to: 'emile@logoless.io',
  subject: 'logoless: the 14 features you can push from the dev site',
  preheader: 'What each one does, where to see it, and a suggested order to push them.',
  title: 'Features you can push',
  intro: 'All 14 are switched on at dev.logoless.io and switched off at logoless.io. Open the dev site, press the white "push" pill, tick the ones you want and press "Push to live". Any push can be undone from the History tab. Here is what each one is.',
  blocks: [
    {
      h: 'Safe to push straight away',
      intro: 'These work with no data and no setup, so they look right on day one.',
      items: [
        ['Calm mode', 'A footer switch that turns off the heavy motion (floating cards, particles, hero movement) for people who prefer a quieter site or have a slower phone. See it: the footer on any page. A good first push to test the button, since it is easy to spot and easy to undo.'],
        ['Spotlight search', 'Press ⌘K (or /) on the public site to search every live campaign and page. ? shows the shortcut list. See it: any public page, bottom-left on a laptop.'],
        ['Reels: swipe through campaigns', 'A full-screen, swipeable feed of live campaigns, one at a time, with the track playing, the rate, the pool and a one-tap "Clip this". Arrow keys to move, M for sound. It also adds a "Swipe through campaigns" button on the home page. See it: /reels.'],
        ['Earnings and budget calculators', 'On For clippers: slide to see what a clip earns. On For brands: see what a budget buys. See it: /for-clippers and /for-brands.'],
        ['Watch a clip earn (animated demo)', 'An animated phone and balance on How it works: a made-up clip is posted, checked, approved, and its views turn into money. Visitors can pick a rate and replay. See it: /how-it-works.'],
        ['Public status page', 'A /status page that checks the database, sign-in, payments and email live, linked from the footer. It is all green on the live site right now. See it: /status.'],
        ['Pool remaining meter', 'On funded campaign pages: a bar and a number for how much of the pool is still unpaid, straight from the money ledger. Campaigns that have not been funded (like the samples) show nothing. See it: any funded campaign page.'],
      ],
    },
    {
      h: 'Push once people have an account',
      intro: 'These live inside the clipper dashboard, so they only matter once real clippers are signed in.',
      items: [
        ['Saved campaigns page', 'A "Saved" page in the clipper dashboard listing every campaign they have hearted. See it: /dashboard/saved.'],
        ['Your recap (story)', 'A full-screen, story-style look back: earned, views, clips, biggest campaign, best clip and badges, with counting numbers and a progress bar. With no clips yet it shows a friendly "your story starts with one clip" screen. See it: /dashboard/recap.'],
        ['Live notification toasts', 'A toast slides in when something happens (payment, approval, badge) without refreshing the page. See it: anywhere signed in.'],
        ['Badge celebration', 'Unlock a badge and a full-screen celebration shows the badge with confetti. See it: after unlocking a badge in the dashboard.'],
      ],
    },
    {
      h: 'Wait until you have real numbers',
      intro: 'Pushing these on day one would show empty or tiny numbers.',
      items: [
        ['Live numbers on the home page', 'A band of real totals (live campaigns, paid out, clips posted). It hides itself until the numbers are worth showing (at least 3 real campaigns, 25 clips and $500 paid out), so pushing it early is harmless, it just will not appear yet. See it: the home page, below the campaigns.'],
        ['Clipper leaderboard', 'A podium and ranking of top clippers by verified views, only for people who chose to show their views. It will say "Nobody is on the board yet" until clippers have approved clips and opt in. See it: /leaderboard.'],
      ],
    },
    {
      h: 'Push when you have something to say',
      items: [
        ['Announcement bar', 'A glass message pill at the bottom of the public site that you write yourself (launch day, a new feature, planned downtime). Visitors can dismiss it. To use it: push the feature, then write the message under Admin > Push features on logoless.io. Until you write one, nothing shows.'],
      ],
    },
    {
      h: 'A suggested order',
      numbered: true,
      items: [
        ['Calm mode', 'to test the button, then undo it.'],
        ['Spotlight, Reels, calculators, the earn demo and the status page', 'together, as the launch-day upgrade for visitors.'],
        ['Pool meter', 'as soon as your first real campaign is funded.'],
        ['Saved, recap, toasts and badge celebration', 'when the first clippers sign up.'],
        ['Live numbers and the leaderboard', 'once there is real activity.'],
        ['Announcement bar', 'on launch day with your message.'],
      ],
    },
  ],
  footer: 'Sent by the logoless site itself. The full text of this and the earlier emails is saved in the project as LAUNCH_REPORT.md.',
}

export const SESSION_TWO: Report = {
  id: 'session-two-2026-10-12',
  to: 'emile@logoless.io',
  subject: 'logoless: everything done since the overnight reports (redesign, white mode, new dashboard, street lab)',
  preheader: 'What changed, what is already live, what is waiting for your push, and where to see the street experiment.',
  title: 'Everything since the overnight reports',
  intro: 'This covers all the work after the first two emails, in the order it happened, with what is live already and what is waiting for your push button.',
  blocks: [
    {
      h: 'What you need to push (dev site > push)',
      numbered: true,
      items: [
        ['White by default (light mode).', 'The whole site is white until a visitor presses Dark mode, which they can do from the home page or the footer. Member profiles, artists\' private pages and /lab stay dark.'],
        ['New dashboard.', 'The solid sidebar and slim top bar for clippers, brands and admins, with a tab bar on phones. Until you push it, the old floating glass sidebar stays.'],
        ['Everything else listed below is already live.', 'The dev site and the live site share the same code, so only features with a switch need a push. Checking the 16 or so switches in the push panel is worth five minutes.'],
      ],
    },
    {
      h: 'Today\'s seven things',
      items: [
        ['1. Dashboard.', 'The new sidebar is solid and shows the whole menu. The active page is a solid white pill, the account card sits at the bottom, there is a centred "Search or jump to a page" field in the top bar, and the overview is four large figures, a recent clips list and a setup list.'],
        ['2. Home page.', 'The menu bar, search bar and filters now sit in one column of the same width. The campaign grid frame is less bulky. The floating search pill no longer appears on the home page, where it duplicated the search bar.'],
        ['3. Overlaps.', 'Fixed: the Search pill and the Tools button, the announcement bar and the Push button, the Tools button and the dashboard sidebar and phone tab bar, and Reels\' sound button and the Search pill.'],
        ['4. Names on covers.', 'Every campaign cover on the home grid now has its name and artist over a soft fade at the bottom, with no caption bar.'],
        ['5. Better covers.', 'Rounder corners, a slightly richer colour grade, and the covers are cropped a touch so the rough white borders baked into some images disappear. The same crop is on the campaign page and the For clippers strip.'],
        ['6. Street experiment.', 'Open dev.logoless.io/lab. It is a need-for-speed, glitchy, pop-art, halftone, spray-paint mock-up with a glitching headline, speed lines, comic panels using the real covers, a starburst for each rate and a racing ticker. It only exists on the dev site: on logoless.io that address is a 404. Nothing on it is connected to anything.'],
        ['7. This email.', 'Sent by the site itself, as before.'],
      ],
    },
    {
      h: 'Earlier today (all live unless noted)',
      items: [
        ['Premium redesign.', 'Every inner page was rebuilt: one huge left-aligned headline, hairline rows, no numbered labels, no icon grids, no outline numerals, no tickers or tilting cards.'],
        ['Honest, human copy.', 'The public copy was rewritten in a plainer voice, and it now says what the product really does: a person on your team reviews every clip and checks the view counts by hand. I removed claims the product does not support yet: automated bot detection, scheduled re-checks, an appeal button, agency workspaces and an analytics suite.'],
        ['Home headlines.', 'Cut from sixteen slogans to eight plain ones.'],
        ['Rounded again.', 'You asked for square, then for rounded. The square corners feature is gone and everything is rounded, including the new dashboard.'],
        ['Dots.', 'The dot landscape is redrawn at your screen\'s real sharpness with crisp dots, depth, swelling peaks and a lean towards the cursor.'],
        ['Moving gradient.', 'Five black and white clouds drift and morph behind the public pages. It holds still in calm mode.'],
        ['Cover strip.', 'The For clippers page shows real live campaigns.'],
      ],
    },
    {
      h: 'Still open from before',
      items: [
        'Press the push button once as a test, create the @logoless.io mailboxes, put the real company name and address in lib/site.ts, confirm the footer social handles, and answer whether the Stripe account named EDUNE is the same business as logoless.',
        'The legal documents were not rewritten. They are formal on purpose and are worth a lawyer\'s eye.',
        'I checked the look of most pages in a browser, but not on every phone size or every page of the dashboard. Look through the new dashboard on your own screen before pushing it.',
      ],
    },
  ],
  footer: 'Sent by the logoless site itself. The full text of every report is in the project as LAUNCH_REPORT.md.',
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
<tr><td align="center" style="padding:0 0 20px"><a href="https://logoless.io" style="text-decoration:none"><img src="https://logoless.io/logo-sm.png" width="84" height="63" alt="logoless" style="display:block;border:0;width:84px;height:63px;font:600 20px/63px ${SANS};color:#f3f2ee"></a></td></tr>
<tr><td bgcolor="#0b0b0d" style="background:#0b0b0d;border:1px solid #232328;border-radius:24px;padding:38px 34px">
<h1 style="margin:0 0 12px;font:300 34px/1.1 ${SANS};letter-spacing:-.02em;color:#f3f2ee">${esc(r.title)}</h1>
<p style="margin:0;font:400 16px/1.6 ${SANS};color:#a2a2a9">${esc(r.intro)}</p>
${blocks}
</td></tr>
<tr><td align="center" style="padding:22px 12px 0;font:400 12px/1.7 ${SANS};color:#6c6c75">${esc(r.footer)}</td></tr>
</table></td></tr></table></body></html>`
  return { subject: r.subject, text, html }
}

export const FULL_LOWDOWN: Report = {
  id: 'full-lowdown-2026-10-16',
  to: 'emile@logoless.io',
  subject: 'logoless: the full lowdown of every feature (October 16)',
  preheader: 'Everything the site does today for visitors, creators, brands and you, how the money and the checks work, and what is still open.',
  title: 'The full logoless lowdown',
  intro: 'This is the whole site in one email: what each kind of person can do, how the money and the view checks work, what you can run from the owner dashboard, the optional features, what changed tonight, and what is still waiting on you. It is written from the code as it stands now.',
  blocks: [
    {
      h: 'In one minute',
      items: [
        ['What logoless is:', 'A marketplace for clip campaigns. An artist, streamer or brand posts a campaign with a rate per 1,000 views and a budget. Creators post clips on their own TikTok, YouTube or Instagram, submit the link, and are paid for the views we verify.'],
        ['Three addresses, one system:', 'logoless.io is the public site plus the creator and brand dashboards. owner.logoless.io is your dashboard (admin and developer pages under one sidebar). dev.logoless.io is a team-only copy of the site where new things are tried and then pushed live. They share one worker and one database. admin.logoless.io only forwards to owner.'],
        ['Three kinds of people:', 'Creators, brands (artists, streamers, companies), and you. You are the owner through ADMIN_EMAILS. Other admins and developers are given a role from the People page, which needs your admin password and notifies them.'],
        ['The money in one line:', 'Brands add funds with PayPal into one balance. Campaigns draw from it as creators earn. The 15% fee is charged to the brand on top, never taken from a creator. Creators withdraw to any PayPal email from $10 with no waiting period, and we cover PayPal fees.'],
      ],
    },
    {
      h: 'The public site (logoless.io)',
      items: [
        ['Campaigns (home):', 'A hero, then every live campaign as a cover tile. Search by artist, song or platform, filter by category and platform, and sort by highest rate, ending soon or biggest budget. Your search and filters are now remembered when you open a campaign and come back.'],
        ['Campaign page:', 'The brief (what to clip, what is off limits), the rate per 1,000 views, the budget, the platforms, the track preview and a heart to save it. It opens as a sheet from the grid or as a full page.'],
        ['Submitting a clip:', 'Paste the link (pasting a whole link now goes straight to the preview), watch the platform embed to confirm it is the right post, and submit. You see the automatic first look result at once: approved, waiting for a person, or declined with the reason. A declined clip can ask a person to look once. After approval there is a button to submit another to the same campaign.'],
        ['Information pages:', 'For creators (with an earnings calculator when that feature is on), For brands (budget calculator), Pricing, About, Case studies, Questions (FAQ with tabs), Contact (pick a topic or write your own, and the conversation lives at a private link and in your inbox), and Report (fake views, stolen content, scams, harassment, impersonation).'],
        ['Legal:', 'Twelve documents under /legal: Terms, Privacy, Creator Terms, Brand Terms, Campaign Rules, Acceptable Use, Payments, Cookies, Do Not Sell, DMCA, Refunds and External Links. They were rewritten this week to match what the product really does, and the fee, minimums and dispute window come from one place so they cannot drift apart.'],
        ['Public profiles:', 'logoless.io/@handle shows a creator banner, picture, bio, links, equipped badges and, if they chose, their views. Links that leave the site pass a "Leaving logoless" notice first.'],
        ['Artist links:', 'logoless.io/name is a private link you make for an artist. They get a welcome, claim it, and walk through a 12 step wizard (You, Campaign, Launch) that builds their campaign. It goes straight to "approved, pay to launch", skipping review.'],
        ['Signing up and in:', 'Discord, Google, or email and password. Email sign-ups confirm the address with an emailed code. Passwords are hashed and checked against breached-password lists, and a human check runs before sign-in. Onboarding asks creator or brand, then a picture and banner (upload one, or pick a noisy gradient look, or get a default), and anything skipped becomes a guide in the dashboard.'],
        ['For search engines and machines:', 'Sitemap, robots, llms.txt, a web manifest, structured data, and a /api/health endpoint.'],
      ],
    },
    {
      h: 'The creator dashboard',
      intro: 'Five sections, with the useful things first. The main action, Find a campaign, sits in the top bar on every page.',
      items: [
        ['Overview:', 'The next set-up step, the balance (available to withdraw, total earned, verified views), an optional monthly earnings goal, and recent submissions you can click through to the campaign.'],
        ['Submissions:', 'Summary tiles, filters (All, Approved, In review, Rejected), search, a sort (newest, most views, most earned), and cards or a table. It remembers what you chose last time.'],
        ['Earnings:', 'Withdraw to PayPal first on the page. Save up to five PayPal emails and pick one, tap a quick amount (All, $10, $25, $50, $100) or type your own, and press Enter. Below that: your withdrawals with their status, an earnings chart and the full ledger.'],
        ['Profile (tabs):', 'Profile (name, handle, photo, banner, bio, links, the gradient look picker, 15 fonts, 6 name effects, card effects and theme colours), Achievements (29 badges with rarity and points, equip up to five), Accounts (your TikTok, YouTube and Instagram), Saved campaigns and Recap when those features are on.'],
        ['Settings:', 'Account, How we contact you (an icon choice: email and Discord, email only, Discord only, or the site only), Discord (connect with one click), Connected apps (places you used Login with logoless), Display (calm mode for less motion, large text), Password, and Delete account (a 30 day wait, and then the team removes it from People).'],
        ['Set-up guide:', 'Seven steps with plain how-tos: confirm your email, finish your profile, add an account, add a PayPal email, connect Discord, make a first submission, get a first payout. The overview always shows the next one.'],
        ['Notifications:', 'A bell with the unread count, a full page, and a live toast when something happens to you.'],
      ],
    },
    {
      h: 'The brand dashboard',
      items: [
        ['Overview:', 'Your balance, what the money bought (verified views, spend, cost per 1,000), a chart of views over time, your campaigns, and an optional top creators card.'],
        ['Campaigns:', 'Start a campaign with a short wizard: name, artist, type (Music, Streamer, Podcast, Brand, Sport, Other), cover, platforms, what to clip, what is off limits, a rate from $0.50 to $50 per 1,000 views, a budget cap from $50, an end date, and optional caps per clip and per creator. A person reads it, you pay to start, and it goes live.'],
        ['Controlling a live campaign:', 'Pause or start it, change its budget cap, or move cap between your campaigns. If your balance runs low the campaigns pause by themselves and you are told.'],
        ['Submissions:', 'See the clips on your campaigns and turn down any that have not been paid yet.'],
        ['Balance:', 'Add funds with PayPal ($10 to $10,000 a time, Enter submits), see what the balance would pay for at your current rates, and read every movement of money in the history.'],
        ['Set-up guide:', 'Four steps: confirm your email, add funds, start a campaign, connect Discord.'],
        ['When a campaign ends:', 'When the budget is used up or the end date passes, the campaign closes and summaries go to the brand and the creators, by each person\'s contact choice.'],
      ],
    },
    {
      h: 'The money, exactly',
      items: [
        ['One balance per brand.', 'Everything runs from a ledger. Campaigns draw from the balance as creators earn, up to the campaign budget cap.'],
        ['The fee.', '15% on top of what creators earn, charged to the brand. A creator is credited the full payout. Budget, fee and total are shown wherever money is set up.'],
        ['PayPal fees.', 'We pay PayPal fees on deposits and withdrawals. PayPal may still convert currencies, and the Terms say so.'],
        ['Withdrawing.', 'From $10 to a PayPal email, available as soon as earnings are confirmed. Large or unusual withdrawals wait for a person: there is a per-withdrawal threshold, a daily limit, and accounts on VPN or proxy networks get extra checks. One switch pauses all withdrawals.'],
        ['Caps.', 'A campaign can limit what one clip can earn and what one creator can earn in total. They are enforced in the single step that pays.'],
        ['Refunds.', 'Unspent budget stays in the balance, and a refund to PayPal is done on request by a person. A balance is not a bank account and is not insured, and the Terms say that plainly.'],
      ],
    },
    {
      h: 'How submissions and views are checked',
      items: [
        ['At submission:', 'An automatic first look checks that it is a real, public post on the right platform. Anything unclear waits for a person.'],
        ['Every two hours, until the campaign ends:', 'YouTube and TikTok views are looked up again and any increase is paid through the same step a person uses, so budgets, caps and the campaign ending still apply. Checking stops when the campaign ends. The pause switch is under System, Settings.'],
        ['What it will not pay on its own:', 'A lower number is ignored. A sudden jump (over 20,000 and more than three times what is verified) is held and you are notified. A video posted before the campaign started is held. A video missing for three checks in a row notifies you.'],
        ['What it cannot do:', 'Instagram cannot be looked up, so Instagram views are still set by a person. TikTok is read from its public page, which TikTok can change, so that check is best effort. Adding a YOUTUBE_API_KEY makes the YouTube check sturdier.'],
        ['The review queue:', 'Owner dashboard, Submissions: approve, decline or set views by hand, plus a View checks card showing the last scan and a "check now" button.'],
      ],
    },
    {
      h: 'Discord',
      items: [
        ['Connecting:', 'One click with Discord sign-in (no codes). The bot adds the member to the server and gives them the linked role. Only the Discord ID is kept.'],
        ['Slash commands:', '/help, /link, /unlink, /profile, /stats, /balance, /submissions, /badges, /campaigns, /campaign, /submit, /leaderboard, /earn, /faq, /support, /status, /report, /notifications, /sync, /ping, and team-only /rules, /site and /admin.'],
        ['The server:', 'Welcome (#get-started), Info (#rules, #site, #support, #status), Landing (#news, #system, #updates, #new-campaigns), and a channel per artist with a live campaign card.'],
        ['Messages are short:', 'They give the basics and link to the site, where the real set-up happens. Buttons that open a page are real link buttons.'],
        ['Tickets:', '/support or the button makes a private channel named after the person, in plain text. Replies from the site inbox appear there without saying who replied.'],
        ['Notifications:', 'People who choose it get their logoless notifications as Discord messages.'],
        ['Your control panel:', 'Owner dashboard, Discord, with tabs Setup, Server and Messages: register commands, test every message with a preview, and check the live connection.'],
      ],
    },
    {
      h: 'The owner dashboard (owner.logoless.io)',
      intro: 'One sidebar with small numbers beside anything waiting on you (new campaign requests, submissions to review, payouts to check, unread messages).',
      items: [
        ['Run: Overview.', 'Site health, the queues, and charts.'],
        ['Run: Campaigns.', 'New requests to approve or reject, campaigns ready to launch, the launch readiness score, artist links (make and track the private links), and mock campaigns for testing the ending flow. A button removes the sample campaigns.'],
        ['Run: Submissions.', 'The review queue and the View checks card.'],
        ['Run: Payouts.', 'Withdrawals being checked, sending held payouts (needs your admin password), and the pause switch.'],
        ['Run: People.', 'Search anyone, see risk flags, suspend or ban with a reason, add or clear extra checks, give or remove roles, adjust a balance, send a message, and delete an account.'],
        ['Run: Inbox.', 'Contact messages and reports, with replies, closing, and Discord ticket sync.'],
        ['Communicate: Discord, Email, Broadcast.', 'Email has test sends, a full code round trip, delivery lookup and a log of recent sends. Broadcast sends a notice by site, email and optionally Discord to everyone, creators, brands, active people, the team, one person or a Discord channel. Large audiences need your admin password.'],
        ['Site: Site text.', 'While signed in as an admin you can click any text on the site and edit it. The list shows every sentence with history and reset, and a scan finds text the editor has not seen. A wording layer changes words at display time, so nothing you edited is ever overwritten.'],
        ['System.', 'Activity log, the tamper-evident audit log, Keys (which secrets are set, never their values, plus a security header test), Settings (switches and limits), Security (lockdown), API keys, and Developer apps.'],
        ['Developer.', 'Design toggles, dashboard previews, features, events and previews. Only people with the developer role see it.'],
        ['Protection on big actions.', 'Banning, deleting, role changes, balance adjustments, sending held payouts and broadcasting to large groups ask for your admin password. After crucial actions the browser also runs a Cloudflare check.'],
      ],
    },
    {
      h: 'The dev site and pushing features',
      items: [
        ['dev.logoless.io.', 'The same code and database as the live site, visible only to admins and developers, with every optional feature switched on and a floating push button.'],
        ['Push and undo.', 'Tick features, press push, and they go live at once. Every push is in a history and can be undone, one feature or a whole push, instantly. The same panel is at Owner, Push.'],
        ['Design toggles.', 'Cover zoom, border, bar and info, scroll effects, a liquid loader, a dot background and a monospace font, all off until you turn them on.'],
      ],
    },
    {
      h: 'The optional features (switch on with Push)',
      intro: 'All 16 are on at dev.logoless.io. Each is live on logoless.io only if you have pushed it.',
      items: [
        ['Spotlight search.', 'Press ⌘K or / on the public site to search campaigns and pages.'],
        ['Reels.', 'A full-screen, swipeable way to browse campaigns with a Clip this button.'],
        ['Leaderboard.', 'A podium and ranking of top creators who chose to show their views.'],
        ['Live numbers.', 'Real totals on the home page, hidden until they are worth showing.'],
        ['Calculators.', 'What could I earn, and what will my budget buy.'],
        ['Status page.', 'Live checks of the site, database and sign-in at /status.'],
        ['Announcement bar.', 'A message pill at the bottom of the public site that you write and visitors can dismiss.'],
        ['Badge celebration.', 'A full-screen moment when someone unlocks a badge.'],
        ['Pool meter.', 'How much of a campaign is still unpaid, on its page.'],
        ['Recap.', 'A story-style look back at what a creator has done.'],
        ['Developers: Login with logoless.', 'Anyone can register an app and add a Sign in with logoless button.'],
        ['Saved campaigns.', 'Every campaign someone has hearted, in one place.'],
        ['Ending soon.', 'A row of campaigns with a quarter or less of their pool left.'],
        ['Top creators.', 'The five creators earning most on a brand\'s campaigns.'],
        ['Earnings goal.', 'A private monthly goal with a bar that fills.'],
        ['Dashboard keyboard shortcuts.', 'g then a number to jump between sections, n for the main action, / for search, ? for the list.'],
      ],
    },
    {
      h: 'For developers: the owner API and Login with logoless',
      items: [
        ['Owner API (/api/v1).', 'Revocable keys with scopes (read, moderate, message, pay, content, publish) that can read users, campaigns, submissions, payouts and the audit log, make the same decisions the dashboard makes, edit site text, and publish features and the announcement bar. Keys are managed under System, API.'],
        ['Login with logoless.', 'Standard OAuth2 and OpenID Connect with a consent screen, signed tokens and per-app user ids. Docs and an app manager live under /developers. It goes live when you push the developers feature.'],
      ],
    },
    {
      h: 'Email',
      items: [
        ['How it sends.', 'Through Resend from login@verify.logoless.io, using ready-made templates: sign-up code, password reset, already a member, role changed, account deleted, invitations, plain messages and tests.'],
        ['Who gets what.', 'Each person chooses how we contact them. Important things always reach the notification bell as well.'],
        ['The site wording applies to email too,', 'so an email never uses a word you have replaced on the site.'],
      ],
    },
    {
      h: 'Security and trust',
      items: [
        ['Every route follows one pattern:', 'sign-in check, role check, same-site check, rate limit, validated input, the change, then an audit entry for anything an admin does.'],
        ['Headers and cookies:', 'A content security policy, two-year HSTS, secure cookies shared across the logoless.io addresses, and no source maps or debug detail.'],
        ['Uploads:', 'JPEG, PNG and WebP only, read from the file bytes, re-encoded, size and dimension limited, SVG refused.'],
        ['Money safety:', 'Amounts always come from the database, a pool can never go below zero, there is a daily payout limit, large withdrawals are reviewed and withdrawals can be paused in one click.'],
        ['Logs:', 'The activity log records requests, sign-ins, refusals and errors. The audit log is hash-chained so tampering shows. Honest limit: it makes tampering visible, it cannot stop someone with full database access.'],
        ['Accessibility:', 'Calm mode, large text, a skip to the page link, clear keyboard focus, and fields that no longer make phones zoom in.'],
      ],
    },
    {
      h: 'What changed tonight (ergonomics)',
      items: [
        ['The sidebar:', 'Rebuilt like your recording. Each item has a soft pill that fades in under the pointer, the old one fades out more slowly so the highlight trails you, and when you leave it settles back on the page you are on. The same trailing fade is on Owner dashboard and Back to the site.'],
        ['Waiting numbers:', 'Small counters beside sidebar items: submissions in review, a dot on Earnings when you can withdraw, campaigns waiting for payment, and for you the requests, submissions, payouts and messages waiting. They refresh on every page change.'],
        ['One search for everything:', '⌘K or / opens a box that finds pages and actions. Typing "with" finds Withdraw, "fund" finds Add funds, "new" starts a campaign. With nothing typed it shows where you were last and the actions people use most.'],
        ['A main action in the top bar:', 'Find a campaign for creators, Start a campaign for brands, on every page and on phones too.'],
        ['Shortcuts:', 'g then a number for sections (shown on hover), n for the main action, / for search, ? for the list.'],
        ['Lists remember you:', 'Submissions keep your filter, sort and view. Browsing keeps your search and filters when you open a campaign and come back.'],
        ['Money forms:', 'Quick amounts and a button that says exactly what you will withdraw, and Enter submits Add funds.'],
        ['Submitting:', 'Pasting a link goes straight to the preview, and there are Submit another and Try a different link buttons.'],
        ['Settings:', 'A jump bar across the top that lights the part you are reading, with anchors that quick actions use (for example straight to Discord).'],
        ['Phones:', 'No zoom when a field is tapped, no tap delay, bigger tap targets, and no hover effects that stick.'],
        ['Fewer duplicate buttons:', 'The overview pages no longer repeat the main action that is now in the top bar.'],
      ],
    },
    {
      h: 'Still open, and what I need from you',
      numbered: true,
      items: [
        ['The logo.', 'The image you attached arrived as a blank white square and was not saved. Send it again as a file (transparent PNG or SVG is best) and I will swap it everywhere.'],
        ['Your edited sentences.', 'Thirteen of them conflict with what the product does or what the Terms say (CLAIMS_REVIEW.md lists them with suggested wording). I have not touched them. Say "do them all" or tell me which.'],
        ['Company details.', 'lib/site.ts still says Logoless Inc. with a placeholder address. The Terms need a real registered company, and the DMCA agent has to be registered with the US Copyright Office to count.'],
        ['A lawyer.', 'Holding balances can count as stored value in some places, and the Terms require users to be 16 but sign-up does not ask. Both deserve a professional look before a big launch.'],
        ['Discord.', 'In the Discord developer portal add https://logoless.io/api/discord/callback and https://dev.logoless.io/api/discord/callback as redirects. After any deploy that changes commands, press Register commands under Discord.'],
        ['Push what you want live.', 'In particular Dashboard keyboard shortcuts, Ending soon and Earnings goal, which are all about speed.'],
        ['The view-check schedule.', 'Open Workers, mainsite, Triggers in Cloudflare and confirm the 30 minute cron is listed. If it is not, the first visitor after three quiet hours starts a check instead.'],
        ['Mailboxes.', 'Make sure support, legal, privacy, press and abuse @logoless.io exist, since the site tells people to write to them.'],
        ['Sample campaigns.', 'Remove them from Campaigns once a real campaign is live.'],
      ],
    },
  ],
  footer: 'Sent once from logoless to emile@logoless.io. The full detail of the claims audit is in CLAIMS_REVIEW.md in the project.',
}

const pick = (h: string): Block => FULL_LOWDOWN.blocks.find((b) => b.h === h) as Block

/** The public site block, with the links page added. */
const publicSite: Block = {
  ...pick('The public site (logoless.io)'),
  items: [
    ...(pick('The public site (logoless.io)').items ?? []),
    ['The links page:', 'logoless.io/links is the one address for a bio: our mark, the site, the Discord and every social account, one big tap per place. What it lists is edited in the owner dashboard.'],
  ],
}

export const LAUNCH_RUNDOWN: Report = {
  id: 'launch-rundown-2026-10-17',
  to: 'emile@logoless.io',
  subject: 'logoless is ready to launch: the full rundown (October 17)',
  preheader: 'What is new tonight, every feature, how to run it from the owner dashboard, and the short list that only you can finish.',
  title: 'Ready to launch: the full rundown',
  intro: 'Everything you asked for tonight is done and live, and this is the complete picture of the site as it stands: what is new, what every part does, how to run it, and the short list that only you can finish. This email was sent by a one-time trigger that has already been deleted.',
  blocks: [
    {
      h: 'The short version',
      items: [
        ['Ready from the code side.', 'A crawl of every public page on logoless.io found no broken page, every page has a title and description, the standard files (sitemap, robots, manifest, security.txt, share image) are there, the new pages work on a phone without sideways scrolling, and the last deploys all passed.'],
        ['What you asked for is done.', 'Your logo is the site logo, logoless.io/links exists, you can change every social account from the owner dashboard, there are 21 new site typefaces and 9 new profile fonts, the staff dashboards are organised into views, and the site is smoother.'],
        ['What is left needs you.', 'Payments in live mode, your real company details, the mailboxes, the Discord redirects, and removing the sample campaigns. The last section is that list, in order. Nothing in it can be done from the code.'],
        ['Honest limit.', 'I could not run the site on a real phone or time it with a profiler, so "insanely smooth" is built from known causes of lag (listed below) rather than measured. If anything still feels heavy on your device, tell me which page.'],
      ],
    },
    {
      h: 'New tonight',
      items: [
        ['Your logo.', 'The outline L mark is now the logo everywhere: the site header and footer, the dashboard sidebar, the browser tab icon, the phone app icon, the share image when a link is pasted into a chat, every email, and the Discord bot picture. The file you sent was a white outline on a transparent background, which is why it looked blank in the chat.'],
        ['logoless.io/links.', 'Our mark and name, then big buttons: the site, start earning, launch a campaign, the Discord and each social. Phone first, it opens fast and has no menus around it. Put this one address in every bio.'],
        ['Socials and links editor.', 'Owner dashboard, Site, Socials and links. Each row is one place: pick where it goes (27 choices including Discord, X, Instagram, TikTok, YouTube, Twitch, Kick, Threads, Bluesky, Spotify), type the name shown and the address, and switch it on for the footer, the links page, or both. Move rows up and down, add or delete, press Save, and both places update at once. Reset puts the built-in list back. It also tells search engines which accounts are yours.'],
        ['Change the placeholders first.', 'The five starting accounts (Discord, X, TikTok, Instagram, YouTube) point at addresses I could not confirm are yours, for example discord.gg/logoless. Replace them with the real ones when you create the accounts.'],
        ['New typefaces.', '21 for the whole site: Bricolage Grotesque, Funnel, Hanken Grotesk, Instrument Sans, Schibsted Grotesk, Special Gothic, Host Grotesk, Familjen Grotesk, Mona Sans, Onest, Figtree, Geologica, Wix Madefor Display, Syne, Newsreader, Young Serif, Gloock, Bodoni Moda, Martian Mono, DM Mono and Fragment Mono. Pick one under Developer, Design, Typeface, preview it big, then press Use on the whole site. I did not change the current font.'],
        ['New profile fonts.', 'Creators can pick Bricolage, Funnel, Expanded, Syne, Unbounded, Young Serif, Gloock, Newsreader and Martian for their name, next to the older ones.'],
        ['Staff dashboards, organised.', 'Every long page is split so you see one thing at a time. The details are in the owner dashboard section below.'],
        ['Smoother everywhere.', 'One gentle easing for every hover and state change, so nothing snaps. The sidebar, top bar and phone tab bar no longer blur the moving background behind them (that blur was recomputed every frame and is the usual cause of lag). Dashboard pages show a skeleton straight away while their data loads, a thin progress line runs along the top while a page loads, and links start fetching their page when your pointer or finger lands on them. Text edits now wait until the page is fully ready, which removes a rare flicker.'],
        ['Sign-up.', 'People now confirm they are 16 or older when they agree to the Terms.'],
        ['The launch checklist is current.', 'Owner dashboard, Campaigns, Launch. It now covers the links page, social accounts, the automatic view checks and the Discord redirects.'],
      ],
    },
    publicSite,
    {
      ...pick('The creator dashboard'),
      items: (pick('The creator dashboard').items ?? []).map((it) => (Array.isArray(it) ? ([it[0], it[1].replace('15 fonts', '24 fonts')] as [string, string]) : it)),
    },
    pick('The brand dashboard'),
    pick('The money, exactly'),
    pick('How submissions and views are checked'),
    pick('Discord'),
    {
      h: 'The owner dashboard (owner.logoless.io), now organised',
      intro: 'One sidebar in four groups: Run, Communicate, Site and System. Small counters sit beside anything waiting on you, and ⌘K or / finds any page or action.',
      items: [
        ['Overview.', 'What needs you comes first: campaign requests, submissions and withdrawals with their buttons right there. Then the money, then activity. "Setup and health" and "Emergency controls" are folded away until you open them, with a count on the fold so nothing is hidden by accident.'],
        ['Campaigns.', 'Views with counts: Needs you, Waiting for payment, Live, Paused, Ended, Rejected. Each campaign is one short row with its main button (Accept, Reject, Launch, Pause, End, Resume). The brief, edit form and delete sit under "Brief, edit and more". Mock and sample tools are folded at the bottom. Tabs beside it: Launch readiness and Artist links.'],
        ['Submissions.', 'Views: Waiting, Approved, Rejected. The View checks card is now one slim bar showing the last scan, with Check now and a "How it works" fold.'],
        ['Payouts.', 'Withdrawals being checked, sending held payouts (admin password) and the pause switch.'],
        ['People.', 'One list instead of two. Filters: Everyone, Online now, New this week, Team, Extra checks, Restricted. Switch between a compact list and profile cards. Open anyone for everything: roles, messages, moderation, balance and removal. The deletion queue appears on top when someone is waiting.'],
        ['Inbox.', 'Messages and reports, filtered To do, Reports, Messages, Closed.'],
        ['Discord, Email, Broadcast.', 'Discord has Setup, Server and Messages tabs. Email has test sends, a code round trip, delivery lookup and recent sends. Broadcast sends to everyone, creators, brands, active people, the team, one person or a Discord channel; big audiences need your admin password.'],
        ['Site text.', 'Now a list of pages with their sentence counts and how many you edited. Open a page to edit only its sentences, search all text, or filter to just what you edited. The home headline editor is folded away.'],
        ['Socials and links.', 'The new editor described above.'],
        ['System.', 'Seven tabs: Logs, Audit, Keys, Settings, API, Developer apps, Security. Logs split their statistics into Traffic, Speed and errors, Security, The business and Money. Audit splits into Admin actions and Text changes, with the chain check as a single line.'],
        ['Developer.', 'Design toggles and the typeface picker, dashboard previews, features, events and previews. Only people with the developer role see it.'],
        ['Protection on big actions.', 'Banning, deleting, role changes, balance adjustments, sending held payouts and broadcasting to large groups ask for your admin password, and the browser then runs the Cloudflare check.'],
      ],
    },
    pick('The dev site and pushing features'),
    pick('The optional features (switch on with Push)'),
    pick('For developers: the owner API and Login with logoless'),
    pick('Email'),
    pick('Security and trust'),
    {
      h: 'Ergonomics (added earlier today)',
      items: pick('What changed tonight (ergonomics)').items,
    },
    {
      h: 'What is left, and only you can do it',
      intro: 'In the order I would do them. Owner dashboard, Campaigns, Launch has the same list with a how-to under each item and ticks as you go.',
      numbered: true,
      items: [
        ['Make the real social accounts', 'and put their addresses into Socials and links. The starting addresses are placeholders. Then put logoless.io/links in each bio.'],
        ['Take PayPal live.', 'Live keys in Cloudflare, the webhook ID, Payouts switched on in PayPal, and enough money in the PayPal account to pay creators. Then run the whole loop once with a real $10: artist link, set-up, fund, campaign, clip, withdraw.'],
        ['Real company details.', 'lib/site.ts still says Logoless Inc. with a placeholder address. The Terms need a real registered company. The DMCA notice agent has to be registered with the US Copyright Office to count.'],
        ['The mailboxes.', 'Make support, legal, privacy, press and abuse @logoless.io exist and reach you, because the site tells people to write to them. Send yourself a message from /contact to prove it.'],
        ['Discord.', 'In the Discord developer portal add https://logoless.io/api/discord/callback and https://dev.logoless.io/api/discord/callback as redirects, then press Register commands on the Discord page. The invite link in Socials and links should be your real server.'],
        ['Remove the sample campaigns', 'from Campaigns, Testing tools once a real campaign is live, so the home page shows only real ones.'],
        ['Confirm the view-check schedule.', 'Cloudflare, Workers, mainsite, Triggers should list a 30 minute cron. If it does not, the first visitor after three quiet hours starts a check instead. Add a YOUTUBE_API_KEY if you want the YouTube check to be sturdier.'],
        ['Decide on your edited sentences.', 'Thirteen conflict with what the product does or what the Terms say (CLAIMS_REVIEW.md lists each with suggested wording). I have not touched them. Say "do them all" or tell me which.'],
        ['Push the optional features you want live.', 'In particular Dashboard keyboard shortcuts, Ending soon and Earnings goal.'],
        ['A lawyer.', 'Holding balances can count as stored value in some places, and the 16-or-older confirmation is a statement, not a check. Both deserve a professional look before a big launch.'],
      ],
    },
  ],
  footer: 'Sent once from logoless to emile@logoless.io. The claims audit is in CLAIMS_REVIEW.md in the project.',
}

const L = (h: string): Block => LAUNCH_RUNDOWN.blocks.find((b) => b.h === h) as Block
/** Replaces one item of a block (by its bold label), or drops it when `repl` is null. */
const swap = (b: Block, label: string, repl: Item | null): Block => ({ ...b, items: (b.items ?? []).flatMap((it) => (Array.isArray(it) && it[0] === label ? (repl ? [repl] : []) : [it])) })
const more = (b: Block, extra: Item[]): Block => ({ ...b, items: [...(b.items ?? []), ...extra] })

export const FINAL_RUNDOWN: Report = {
  id: 'full-rundown-2026-10-18',
  to: 'emile@logoless.io',
  subject: 'logoless: the updated full rundown (October 18): your text edits in the code, Gloock headlines, no flicker, a tidier owner dashboard',
  preheader: 'Everything the site does today, what changed since the last rundown, how to run it, and the short list that only you can finish.',
  title: 'The updated full rundown',
  intro: 'This replaces the earlier rundowns. It describes the site as it stands now: what is new (your edited text written into the code, Gloock headlines, no more flicker, plain campaign covers, the owner dashboard in nine places with a roundness slider, bio verification in sign-up), what every part does, how to run it, and the short list that only you can finish.',
  blocks: [
    {
      h: 'The short version',
      items: [
        ['Ready from the code side.', 'Every page answers, the deploys are green, and an accessibility check (axe) over 37 pages found a handful of problems, which are fixed, and a re-check of 13 key pages came back clean. What remains needs you: payments in live mode, your real company details, the mailboxes, the Discord redirects, real social accounts and removing the sample campaigns. The last section is that list.'],
        ['Since the last rundown I added four things.', 'Real bio verification for TikTok, YouTube and Instagram accounts; a new motion system (page changes that cross-fade, springs, press feedback, toasts); a keyboard layer that works across the whole site; and an accessibility pass with an Accessibility page.'],
        ['One change affects your workload.', 'The automatic first look now approves a clip only when it comes from a verified account. Clips from any other account wait for a person. A switch under Platform settings turns that off if the queue gets heavy.'],
        ['What I could not check.', 'I could not run the site on a real phone or time it with a profiler, so the smoothness is built from known causes of lag, not measured. Bio checks were tested against stand-in pages and the real pages\' content, not yet from Cloudflare against a real account of yours. And no one has used the site with a real screen reader yet.'],
      ],
    },
    {
      h: 'New on October 18',
      items: [
        ['Your edited text is in the code.', 'All 84 sentences you changed in the text editor are now written straight into the site (the FAQ, For brands, For creators, Pricing, About, the sign-up screen and the rest), exactly as you wrote them, typos included. The saved copies in the database are retired, so nothing is swapped on a page after it loads any more. One thing to know: your edit of "Questions" applied to every label that said Questions (the heading on the FAQ page, the breadcrumb, the Related links at the bottom of six pages and the menu), so it now reads "That\'s why its called a Q&A :)" in all of them. Tell me if you want the links back to "Questions" and only the FAQ heading to keep the joke.'],
        ['The site\'s wording is in the code too.', 'The swap from clip to submission and clipper to creator is written into the source, so it no longer happens in the browser after the page appears. Eight of your edited sentences use the word clip on purpose, and they are never reworded.'],
        ['Gloock for headers and titles, Inter for the rest.', 'Every heading and title uses Gloock. Small labels that happen to be headings (14px and under) stay Inter, because a high contrast serif is not readable that small. Inter Tight headlines are still a choice under Site, Design.'],
        ['No more flicker.', 'The causes were all the same kind: things that start invisible and fade in. The page wrapper, the blocks of a dashboard page, the campaign tiles, pictures, the search and filter bars, the profile card, the leaderboard and the loading skeletons all started at zero opacity, which means they are blank in the HTML the server sends until the page has woken up. None of them do now, the sign-in buttons in the top bar are drawn from the first paint, and the sidebar card is drawn at once. A slow page shows a thin progress line, a fast one shows nothing. The browser still cross-fades between pages.'],
        ['Campaign covers are just covers.', 'No play button, no arrow, no text on top. When the pointer (or keyboard focus) is on one, a single panel slides up from the bottom with the name, the artist and the rate. Previews still play on the campaign\'s own page. The same cover is used in the strip on For creators.'],
        ['Bio verification in sign-up.', 'After a creator saves their profile, the accounts they added are listed with a Verify button each: the same code in the bio, the same check. They can skip it and do it later in Accounts.'],
        ['A tab icon that reads.', 'Your logo as the browser tab icon (a tight version so it stays readable at 16 pixels), the phone home-screen icon and the share image. The mark itself was already in use, so nothing else changed.'],
      ],
    },
    {
      h: 'The owner dashboard, in nine places',
      intro: 'Fewer tabs, with related pages behind switches at the top of each page. Run is the daily work in the order it arrives; Manage is everything you set up or look at now and then. Press g then a letter to jump (o c s p u i w m y).',
      items: [
        ['Overview (o).', 'What needs a decision comes first, with the buttons right there; a queue with nothing in it takes no room and is named in one quiet line. Then the money, recent activity, your notes, and "Setup and health" and "Emergency controls" folded away with a count.'],
        ['Campaigns (c).', 'Tabs: Campaigns, Launch, Artist links. Views with counts: Needs you, Waiting for payment, Live, Paused, Ended, Rejected. A live campaign can be pinned to the top of the home page (t) or unpinned.'],
        ['Submissions (s), Payouts (p), People (u), Inbox (i).', 'As before: submissions with views and the verification bar, withdrawals being checked, one list of people with filters and a compact or card view, and the inbox with To do, Reports, Messages and Closed.'],
        ['Site (w).', 'Design, Text, Links, then Features, Previews and Dashboards for developers. Design moved here. It now opens with Roundness: one slider from square to extra round that changes every corner on the whole site (buttons, fields, cards, covers, pictures), with presets and live samples, and "Back to the standard look" resets everything. Then the typeface, and the looks that were taken out.'],
        ['Communicate (m).', 'Broadcast, Email and Discord, everything you send out. What comes in is the Inbox.'],
        ['System (y).', 'Health (what used to be the Developer overview), Logs, Events, Audit, Settings, Keys, Security, API and Apps.'],
        ['Search.', 'Press / or ⌘K and type a name or an address: people and campaigns appear as you type, next to pages and actions.'],
        ['Notes and activity.', 'A private notepad on the Overview that saves itself, and a feed of what just happened (who joined, what was submitted, withdrawals, campaign requests).'],
        ['Protection on big actions.', 'Banning, deleting, role changes, balance adjustments, sending held payouts and broadcasting to large groups ask for your admin password, and the browser then runs the Cloudflare check.'],
      ],
    },
    {
      h: 'New since the last rundown',
      items: [
        ['Bio verification.', 'A creator links a TikTok, YouTube or Instagram account, gets a code such as logoless-7KQ4MX, puts it in the account\'s bio, and presses Check my bio. The site reads the account\'s public page and looks for the code. Details are in the next section.'],
        ['Page changes cross-fade.', 'Moving between pages, on the dashboards and the public site, now uses the browser\'s built-in page transitions: the old page eases out as the new one eases in, with no wait before the click is answered. If a browser cannot or does not start it, the site simply goes to the page.'],
        ['One motion system.', 'One easing and one set of speeds for hovers and state changes. Buttons dip slightly when pressed and spring back. Dashboard pages build in section by section, campaign tiles rise in row by row, covers fade in once loaded, keyboard focus rings glide in, and dialogs, search and toasts open with a short spring.'],
        ['Toasts and small kindnesses.', 'Short confirmations such as Saved, Copied and Done at the bottom of the screen. Profile and links editors ask before you leave with unsaved changes. The campaign form keeps what you typed on that device. The favourite heart pops. The top bar lifts with a shadow when you scroll, and the phone tab bar has a marker that slides.'],
        ['Search finds campaigns.', '⌘K and / now also find live campaigns from inside the dashboards, and in the owner dashboard anything you type also offers to search People and Site text.'],
        ['A keyboard layer.', 'g then a letter goes to a page, j and k move through lists, arrow keys move across grids, menus and tabs, [ and ] switch tabs, and one key per action on a row. Press ? on any page for the list. Search (/ and ⌘K) and the shortcuts are always on now, so I removed Spotlight search and Dashboard keyboard shortcuts from the Push list.'],
        ['Accessibility.', 'Dialogs hold the keyboard and freeze the page behind them, page changes are announced and focus moves into the new page after a keyboard click, the dimmest text was brightened to a readable level, lists, headings and radio groups were fixed, the preview slider now works from the keyboard, and Settings has Contrast and Underlined links options. There is a new Accessibility page.'],
      ],
    },
    {
      h: 'Bio verification, in detail',
      items: [
        ['For creators.', 'Dashboard, Profile, Linked accounts. Add an account by its username, press Verify, copy the code, put it in the bio (the dialog says where for each platform), and press Check my bio. A verified account shows a Verified badge there, a tick on the public profile if the creator shows their accounts, and can be checked automatically. The code can be taken out of the bio afterwards.'],
        ['What the site can read.', 'TikTok and YouTube are read from their public pages, and a missing code means the code is not in the bio. Instagram does not let a website read a profile, so for Instagram, and for any page a platform blocks, the creator presses Ask the team to check.'],
        ['Your side.', 'Owner dashboard, People, open a person: a Linked accounts card shows each account, its status and the code to look for, with Approve, Not there and Remove. A counter on People and a line in Overview show how many are waiting, and every decision is in the audit log.'],
        ['One account per person.', 'An account is verified for one logoless user at a time. If someone else proves the same account later, the newest proof wins and the first person is told. If a creator changes or removes the account, the verification is dropped.'],
        ['What it changes.', 'The clip first look approves automatically only from a verified account. That is the real protection against someone claiming another person\'s account, and it also sends more clips to a person until creators verify. Platform settings, "Only auto-approve clips from verified accounts" turns it off. The set-up guide step is now "Link and verify an account".'],
        ['What we say about it.', 'The Terms, Privacy Policy, FAQ and CLAIMS_REVIEW.md describe it: we read an account\'s public page to find the code, keep a record that it was verified, and a person may check by hand.'],
        ['First real test.', 'Try it once with one of your own accounts on logoless.io. If Cloudflare\'s network is blocked by TikTok or YouTube you will see "ask the team", which is the designed fallback, and you can approve it from the People page.'],
      ],
    },
    {
      h: 'The keyboard, in detail',
      items: [
        ['Go to a page.', 'Press g, then a letter. A small card shows each letter, and the sidebar shows them on hover. Creator: o Overview, s Submissions, e Earnings, p Profile, t Settings. Brand: o, c Campaigns, s Submissions, b Balance, t. Owner: o, c, s, p Payouts, u People, i Inbox, d Discord, m Email, b Broadcast, x Site text, l Socials and links, y System, v Developer. A number works too. On the public site: h, c, b, p, a, q, t.'],
        ['Move through things.', 'j and k step through the rows of a list and scroll a page that has none. The arrow keys move across the campaign grid, along a menu, and between tabs and radio buttons. [ and ] switch the page\'s tabs. Enter opens what has focus.'],
        ['Act on a row.', 'With a row focused, its keys appear on its buttons. Submissions: a approve, r reject, o open the clip, v set the views. Campaigns: a Accept, r Reject, l Launch, p Pause, s Resume. On a campaign: s submit, f favourite, p play.'],
        ['Forms.', '⌘ or Ctrl with Enter sends a message you are writing, with S saves the profile or links editor, and Esc leaves a field. Letters never act while you are typing.'],
        ['Everywhere.', '/ or ⌘K searches or does something, n does the main thing in the area (Find a campaign, Start a campaign), ? shows the list for the page you are on, and Esc closes a dialog.'],
      ],
    },
    {
      h: 'Accessibility, in detail',
      items: [
        ['What was checked.', 'An automated check (axe) over 37 pages, then a re-check of 13 key pages after the fixes, which came back clean, plus real key presses for the keyboard features. It cannot find everything, and a real screen reader pass is still worth doing.'],
        ['What was fixed.', 'Contrast of the dimmest text, valid lists, headings in order, radio groups with arrow keys, one navigation landmark on the developer pages, a skip link that has a target, and labels on the preview slider with working keys.'],
        ['Dialogs.', 'Focus moves in, Tab stays inside, Esc closes, the page behind cannot be tabbed into or read, and focus returns to what opened it.'],
        ['Page changes.', 'The new page\'s name is announced, and after a keyboard click focus moves into the page.'],
        ['Settings, Display.', 'Calm mode, text size, Contrast (also follows the device\'s own preference), Underlined links, and a button for the shortcut list. Reduced motion follows the device setting.'],
        ['The Accessibility page.', 'logoless.io/legal/accessibility says what we aim for (WCAG 2.2 AA, without claiming full conformance), what works, what does not yet, and where to write. Please read its wording once, as it is a public statement.'],
      ],
    },
    { ...swap(L('New tonight'), 'Staff dashboards, organised.', null), h: 'Also new on October 17: logo, links, socials, fonts' },
    {
      ...L('The public site (logoless.io)'),
      items: (L('The public site (logoless.io)').items ?? []).map((it) =>
        Array.isArray(it) && it[0] === 'Legal:' ? (['Legal:', 'Thirteen documents under /legal: Terms, Privacy, Creator Terms, Brand Terms, Campaign Rules, Acceptable Use, Payments, Cookies, Do Not Sell, DMCA, Refunds, External Links and Accessibility. The fee, minimums and dispute window come from one place so they cannot drift apart.'] as [string, string]) : it,
      ),
    },
    {
      ...L('The creator dashboard'),
      items: (L('The creator dashboard').items ?? []).map((it) => {
        if (!Array.isArray(it)) return it
        if (it[0] === 'Profile (tabs):') return ['Profile (tabs):', 'Profile (name, handle, photo, banner, bio, links, the gradient look picker, 24 fonts, 6 name effects, card effects and theme colours), Achievements (29 badges with rarity and points, equip up to five), Linked accounts (add TikTok, YouTube and Instagram and verify each with a code in its bio), Saved campaigns and Recap when those features are on.'] as [string, string]
        if (it[0] === 'Set-up guide:') return ['Set-up guide:', 'Seven steps with plain how-tos: confirm your email, finish your profile, link and verify an account, add a PayPal email, connect Discord, make a first submission, get a first payout. The overview always shows the next one.'] as [string, string]
        if (it[0] === 'Settings:') return ['Settings:', 'Account, How we contact you (an icon choice), Discord (connect with one click), Connected apps, Display (calm mode, text size, contrast, underlined links and the shortcut list), Password, and Delete account (a 30 day wait, and then the team removes it from People).'] as [string, string]
        return it
      }),
    },
    more(L('The brand dashboard'), [['Your draft is kept.', 'The campaign form saves what you type on that device as you go, so a refresh or a wrong click never loses a brief, with a Start over link.']]),
    L('The money, exactly'),
    more(L('How submissions and views are checked'), [['Which clips are approved automatically.', 'Only clips from a verified account (see bio verification). The switch is under Platform settings.']]),
    L('Discord'),
    L('The dev site and pushing features'),
    {
      h: 'The optional features (switch on with Push)',
      intro: 'All 14 are on at dev.logoless.io. Each is live on logoless.io only if you have pushed it. Search and the keyboard shortcuts are no longer on this list: they are always on.',
      items: (pick('The optional features (switch on with Push)').items ?? []).filter((it) => !(Array.isArray(it) && (it[0] === 'Spotlight search.' || it[0] === 'Dashboard keyboard shortcuts.'))),
    },
    L('For developers: the owner API and Login with logoless'),
    L('Email'),
    more(L('Security and trust'), [
      ['Account ownership.', 'A linked TikTok, YouTube or Instagram account is proven by a code in its bio, one logoless user at a time, with every decision logged.'],
      ['Reading other sites.', 'The only pages the bio check reads are the platform\'s own profile page for the account name, built by the site and never from an address a person typed, with a time limit and a size limit.'],
    ]),
    {
      h: 'What is left, and only you can do it',
      intro: 'In the order I would do them. Owner dashboard, Campaigns, Launch has most of this list with a how-to under each item.',
      numbered: true,
      items: [
        ['Make the real social accounts', 'and put their addresses into Socials and links (the starting ones are placeholders), then put logoless.io/links in each bio.'],
        ['Take PayPal live.', 'Live keys in Cloudflare, the webhook ID, Payouts switched on in PayPal, and enough money in the PayPal account to pay creators. Then run the whole loop once with a real $10.'],
        ['Real company details.', 'lib/site.ts still says Logoless Inc. with a placeholder address. The Terms need a real registered company, and the DMCA agent has to be registered with the US Copyright Office to count.'],
        ['The mailboxes.', 'Make support, legal, privacy, press and abuse @logoless.io exist and reach you, and send yourself a message from /contact to prove it.'],
        ['Discord.', 'Add https://logoless.io/api/discord/callback and https://dev.logoless.io/api/discord/callback as redirects in the Discord developer portal, then press Register commands on the Discord page.'],
        ['Try bio verification once.', 'With one of your own accounts. Decide whether to keep "Only auto-approve clips from verified accounts" on, knowing that clips from unverified accounts wait for you.'],
        ['Remove the sample campaigns', 'from Campaigns, Testing tools once a real campaign is live.'],
        ['Confirm the view-check schedule.', 'Cloudflare, Workers, mainsite, Triggers should list a 30 minute cron. If it does not, the first visitor after three quiet hours starts a check instead. A YOUTUBE_API_KEY makes the YouTube check sturdier.'],
        ['Decide on your edited sentences.', 'Thirteen conflict with what the product does or what the Terms say (CLAIMS_REVIEW.md has each with suggested wording). I have not touched them. Say "do them all" or tell me which. Your other 84 edits are already in the code.'],
        ['Push the optional features you want live.', 'Ending soon and Earnings goal are the ones about speed.'],
        ['Two people checks.', 'Have someone use the site with a screen reader, and have a lawyer look at stored balances, the 16-or-older confirmation and the Accessibility page.'],
      ],
    },
  ],
  footer: 'Sent once from logoless to emile@logoless.io. The claims audit is in CLAIMS_REVIEW.md in the project.',
}

/** The reports that can be sent, by id. */
export const REPORTS: Record<string, Report> = { [OVERNIGHT.id]: OVERNIGHT, [ADDENDUM.id]: ADDENDUM, [FEATURE_LIST.id]: FEATURE_LIST, [SESSION_TWO.id]: SESSION_TWO, [FULL_LOWDOWN.id]: FULL_LOWDOWN, [LAUNCH_RUNDOWN.id]: LAUNCH_RUNDOWN, [FINAL_RUNDOWN.id]: FINAL_RUNDOWN }
