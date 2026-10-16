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

/** The reports that can be sent, by id. */
export const REPORTS: Record<string, Report> = { [OVERNIGHT.id]: OVERNIGHT, [ADDENDUM.id]: ADDENDUM, [FEATURE_LIST.id]: FEATURE_LIST, [SESSION_TWO.id]: SESSION_TWO, [FULL_LOWDOWN.id]: FULL_LOWDOWN }
