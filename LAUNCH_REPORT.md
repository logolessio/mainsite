# Your overnight report

_Written overnight, 11 to 12 October 2026. This is the same text that was emailed to emile@logoless.io._

You asked for everything I could do to get the site ready, a dev site with a push button, and a full lowdown. This is it. The short version comes first, the detail after.

## The short version

- **logoless.io is up and healthy.** The real fixes below are live. Every new feature is switched off on the live site until you push it, so nothing about how the site looks or behaves for visitors changed in a dramatic way.
- **dev.logoless.io exists.** Admins only, every new feature switched on, and a floating "push" button on every page.
- **13 features are waiting on the dev site.** Tick the ones you want, press push, and they go live on logoless.io straight away. Every push can be undone.
- **I made one mistake.** The live site was down for about five minutes around 10pm while I set up the dev address. It is fixed and the cause is written into the project so it cannot happen again. Details in the next section.
- **Seven things need you.** They are the checklist near the bottom. The two that matter most: press the push button once to test it, and make the @logoless.io mailboxes exist.

## The mistake, and the fix

To put the dev site on dev.logoless.io I added a list of addresses to the project settings. Cloudflare treats that list as the complete set of addresses for the site, so logoless.io was detached from the worker and visitors got a Cloudflare error (1016) from roughly 10:03pm to 10:08pm BST.

- I noticed on my next check, added logoless.io back to the list, pushed, and confirmed the site, a campaign page, the health check and the dev site all answered correctly afterwards.
- The settings file now has a warning comment: logoless.io must always stay in that list.
- Nothing else was affected: no data was lost, no payments were in flight, and the database was never touched by this.
- If you ever see a Cloudflare 1016 or 530 error on logoless.io, check Workers > mainsite > Settings > Domains and Routes and make sure logoless.io is listed.

> Some Macs and routers remember "this address does not exist" for a few minutes after a blip like this, so the site can look down on one device and fine on another for a short while afterwards.

## The dev site and the push button

- **Where:** dev.logoless.io. It runs the same code and the same database as logoless.io, so there is nothing to keep in sync. Anyone who is not signed in as an admin sees only a sign-in screen. It is hidden from Google.
- **Signing in:** Email and password works straight away. Google sign-in needs one extra step: in Google Cloud Console > Credentials > your OAuth client > Authorised redirect URIs, add https://dev.logoless.io/api/auth/callback/google. If your admin account has only ever used Google, open "Forgot your password" on dev.logoless.io to give it a password.
- **The push button:** A white pill at the bottom right of every dev page. Click it, tick the features you want, press "Push to live". It also lives at Admin > Push features on logoless.io.
- **Undoing:** The History tab lists every push. You can undo one feature, or a whole push, with one click. Undo takes effect instantly too.
- **Be aware:** Pushing writes straight to the live site, and it is instant. There is a confirmation step, but there is no staging copy in between.
- **What I could not test:** My permissions blocked me from pressing the final "Push to live" button, because it is a write to the live feature switches. I tested everything up to it (the panel, the list, the history tab, the server checks behind it), but not the last click. Please press it once with something harmless like Calm mode, check it appears on logoless.io, then undo it.

## The 13 features on the dev site

All of these are on, for you, at dev.logoless.io. None are visible on logoless.io until pushed.

- **Reels** /reels. A full-screen, swipeable way to browse campaigns, one at a time, with the track playing, the rate, the pool and a one-tap "Clip this". Arrow keys and M for sound.
- **Spotlight search** Press ⌘K or / on the public site to search every live campaign and page. Press ? for shortcuts.
- **Clipper leaderboard** /leaderboard. A podium and ranking of top clippers by verified views, only for people who chose to show their views.
- **Live numbers on the home page** A band of real totals (live campaigns, paid out, clips posted). It hides itself until the numbers are worth showing, so it never says "0".
- **Earnings and budget calculators** On For clippers and For brands: slide to see what a clip earns or what a budget buys.
- **Watch a clip earn** On How it works: an animated phone and balance. A made-up clip is posted, checked, approved and its views turn into money. Visitors can change the rate and replay.
- **Public status page** /status. Checks the database, sign-in, payments and email live. Also a /api/health endpoint, which is live already (see below).
- **Announcement bar** A glass message pill at the bottom of the public site that you write in Admin > Push features. For launch day or downtime. Visitors can dismiss it.
- **Live notification toasts** A toast slides in when something happens to you (payment, approval, badge) without refreshing.
- **Badge celebration** Unlock a badge and a full-screen celebration shows it with confetti.
- **Your recap** /dashboard/recap. A story-style look back for clippers: earned, views, clips, biggest campaign, best clip, badges, with counting numbers and a progress bar.
- **Saved campaigns** /dashboard/saved. Every campaign a clipper has hearted, in one place.
- **Calm mode** A footer switch that turns off the heavy motion for people who prefer a quieter site or have a slower phone.

## What I fixed on logoless.io (live now)

These were things that looked finished but were not, or were quietly missing. They matter more than any new feature.

- **Sign-up now saves what people fill in.** The onboarding flow collected a name, handle, photo, bio, country, interests and social accounts, then threw them away. Now it saves them to the profile, uploads the photo for real, checks handle availability against the database, and shows an error with a retry instead of pretending it worked. Brands who sign up also send you a lead notification.
- **The contact form now sends.** It used to say "Message sent" without sending anything. It now emails the first address in ADMIN_EMAILS with the sender as reply-to, is rate limited, has a hidden spam trap, and shows an honest error if email is ever offline.
- **Settings are real.** The settings page was entirely fake. Now: you can change your password (current password required, checked against common and breached passwords), see your email, jump to profile and notifications, and ask for account deletion. The made-up notification toggles are gone.
- **Linked accounts are honest.** The "verify with a code in your bio" flow was theatre: the first check always failed and the second always passed, and nothing was saved. It is replaced with "add your username", saved on the profile, labelled "added" rather than "verified", with copy saying your team checks clips against these accounts.
- **Support addresses.** The site listed support@, legal@, privacy@, press@ and abuse@ at logoless.com. They are now @logoless.io. Those mailboxes must exist (see the checklist).
- **Health check.** logoless.io/api/health returns 200 when the database, sign-in, payments and email are all configured, and 503 when not. Point a free uptime monitor (UptimeRobot, Better Stack) at it and you get a text when anything breaks. It is green right now.
- **Remove sample campaigns.** Admin > Campaigns now has a "Remove sample campaigns" button. It deletes the made-up artists in one click, and only ones that never held money or clips. Do it once your first real campaign is live, so the home page is never empty.
- **Launch readiness page.** Two new checks on Admin > Launch readiness: the contact form reaching you, and the dev site.
- **Sharing and install.** Campaign links now show a proper large card on X, iMessage and Discord. The site can be added to a phone home screen (web app manifest). A security.txt file tells researchers where to report problems. robots.txt hides the dev site.
- **Reserved page names.** Artists can no longer claim a link like logoless.io/leaderboard or /reels that a real page uses.

## What needs you

1. **Press the push button once.** Dev site > push > tick Calm mode > Push to live. Check logoless.io footer shows the switch, then undo it from History.
2. **Google, two bits.** Add the dev redirect URI above, and make sure the Google app is "In production" rather than "Testing" (OAuth consent screen), or only test users can log in.
3. **Make the mailboxes exist.** In Cloudflare > Email > Email Routing, create support@, legal@, privacy@, press@ and abuse@logoless.io and forward them to you. Until you do, the footer and legal pages publish addresses that bounce.
4. **Company name and address.** lib/site.ts still says "Logoless Inc." and "[Registered business address]". They appear on the legal pages and the readiness page lists it as a blocker. Tell me the real details and I will put them in.
5. **Footer social links.** The Discord, X, Instagram, TikTok and YouTube links in lib/site.ts are guesses at handles. Send me the real ones or confirm.
6. **The Stripe account name.** It is called "EDUNE". Is that the same business as logoless? If it is a different company, payouts and receipts will show that name and the terms should say who the contracting party is.
7. **Small Cloudflare items.** If you use Turnstile, make sure dev.logoless.io is allowed on the widget. Consider attaching www.logoless.io to the worker too (it is not attached now, so www links do not work). The Workers Paid plan ($5) and usage alerts are still ticks on the readiness page.

## Earlier today (already live)

Covered in the chat as it happened, repeated here so this email is the full record.

- Artist invite links (logoless.io/their-name), the artist onboarding, funding and clip pages, and the admin Artist links page.
- Campaign pages rebuilt: a big hero in the cover colours, large numbers, the brief beside an earnings calculator, rules, how you get paid, the submit section and more campaigns. Tiles cleaned up.
- 19 profile card effects (embers, and the rest), a tabbed profile editor, username-only socials, icon-only connections.
- 24 hand-drawn badges with a new achievements page, and a redesigned notifications panel and page.
- Dashboard panel opens when the cursor hits the left edge, an Admin dashboard button for admins, the new wordmark, the notification badge fix.
- Stripe: the live keys and both webhooks were walked through together. The signing secret that was pasted into chat should be rolled if it was not already (you did this).

## How it was checked, honestly

- Every change passed the type checker, and the full production build passed before each push. Cloudflare built every push successfully.
- I called the contact API with a valid message, an invalid one, a cross-site request and a bot (the spam trap); the password, search and handle APIs; and loaded the pages on both a dev-mode and a production-mode copy. The live site returns 404 for every feature you have not pushed.
- I looked at Reels, the push panel, the status page and the Watch a clip earn demo in a real browser. The Recap and leaderboard were checked for structure and errors but not with real data, because the test database has no clippers with earnings.
- There is no automated test suite in the project, and nothing here was tested with real money or real members. Treat a first run of the whole loop (artist link, fund, launch, clip, approve, payout) as still to do.

## If you want something undone

- A feature you pushed: dev site > push > History > Undo. Instant.
- A change to the live site: every change is its own commit. c01d745 (onboarding, contact, settings, accounts), af03646 (launch prep), f6f3555 (dev system and the first ten features). Ask me to revert one, or run git revert on it and push.
- Never remove logoless.io from the list of routes in wrangler.jsonc.

---

Sent by the logoless site itself, as you asked. A copy of this report is saved in the project as LAUNCH_REPORT.md.


# Overnight report: addendum

_Follow-up, same night. Also emailed._

A short follow-up. I kept going after the first email went out, so here is what changed since, and one thing to check.

## Added since the first email

- **A 14th feature: Pool remaining meter.** On every funded campaign page, a bar and a number show how much of the pool is still unpaid, straight from the money ledger. Campaigns that have not been funded (like the samples) show nothing rather than a made-up figure. On the dev site now; hidden on logoless.io until pushed.
- **A Reels button on the home page.** With Reels switched on, the home page gets a "Swipe through campaigns" button next to "Take the tour".
- **The push button counts.** The white pill on the dev site now shows how many features are on the dev site but not on logoless.io yet, so you can see at a glance what is waiting.
- **Brand sign-up saves the logo.** The logo a brand picks during sign-up was only a temporary preview. It is now uploaded and saved as the brand's picture. I also removed a "Balance funded" checklist row at the end of brand sign-up that could never be ticked.

## One thing to check before you sign in on dev.logoless.io

- **AUTH_URL.** In Cloudflare > Workers > mainsite > Settings > Variables and Secrets, if there is a variable called AUTH_URL (or NEXTAUTH_URL) set to https://logoless.io, delete it. The project does not need it, and it would send you to the live site when you try to sign in on the dev site. If it is not there, there is nothing to do.

## State when I wrote this

- logoless.io and dev.logoless.io both answer, the health check is green (database, sign-in, payments, email), and the last Cloudflare build succeeded.
- Everything is pushed. The first email was sent once by the site (a second attempt correctly sent nothing).
- The checklist in the first email is still the list of what needs you. Nothing in this email adds to it except the AUTH_URL check above.

---

Sent by the logoless site itself. The full text of both emails is saved in the project as LAUNCH_REPORT.md.
