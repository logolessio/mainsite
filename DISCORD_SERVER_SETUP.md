# Running logoless from Discord

Written Oct 23, 2026, from what the live site says today. The site is closed behind the launch page until **Dec 1 2026, 17:00 GMT**, so for now the
Discord server is the front door. This is the order to set it up in, what to switch on inside Discord yourself, and what still needs the site.

## Where things stand

- The bot is built and all nine Discord switches are on at logoless.io (get started, payouts, submissions, campaign cards, live numbers, roles,
  tickets, commands, the Discord page).
- The server is saved in `/admin/discord`: the get-started, rules, site, support, status, news, new-campaigns, system, updates, clips and logs
  channels, the tickets, artists and inactive categories, and the linked, clipper, brand, team and staff roles.
- **Not filled in yet:** the payouts and submissions channels, the Artist, Developer and Admin roles, the earnings tiers, and any community
  channels (general chat and so on). Without the payouts and submissions channels those two switches have nowhere to post.
- The one-button **Get started** used to send people to a sign-up page that the launch page hides. It now answers with the opening date and what
  to do here instead, until the site opens.

## 1. The buttons, in this order (owner.logoless.io/admin/discord)

1. **Check the bot's access.** Fix anything it lists before going on.
2. **Make the missing roles.** Then, in Discord: Server Settings, Roles, and drag the bot's role *above* all the roles it hands out (Linked,
   Clipper, Brand, Artist, Developer, Team, Admin). A bot cannot give a role that sits above its own.
3. **Make the missing categories and channels.** Fills the payouts and submissions channels (read-only for members) and the tickets, artists and
   inactive categories if any are missing.
4. **Make the community channels.** New: general, introductions, clip-showcase, edit-help, ideas-and-feedback, off-topic, bot-commands, two voice
   lounges, and a private Team category (team-chat, mod-queue) that only the staff, team and admin roles can see. It only adds what is missing and
   never touches anything that already exists. Drag the new Community category up under the Welcome and Info ones.
5. **Register commands.** Needed whenever the command list changes.
6. Post the panels: **get-started, rules, site, support, status** (the "Post" buttons).
7. **Make artist channels and cards**, then **Run the live loop now**.
8. **Send a test message** and **Send me the welcome rundown** to see what members see.

Nothing in these buttons deletes or renames anything.

## 2. Settings only you can change inside Discord

The bot is not allowed to change server-wide settings (it does not have Manage Server), so these are yours:

- **Turn on Community** (Server Settings, Enable Community). Use the rules channel for rules and the updates channel for updates.
- **Server Onboarding** (Server Settings, Onboarding): one question, "What brings you here?", with answers Clipper, Artist or streamer, Brand. Let the
  answers choose which channels a person sees, and do not give roles from it: the real roles (clipper, brand, creator, tiers) come from linking their
  account, and the bot keeps them in step.
- **Verification level: Medium** (the account must be registered on Discord for 5 minutes), and **scan media from all members**.
- **AutoMod** (Server Settings, Safety Setup, AutoMod): block spam content; block mention spam (limit 5 mentions, then a timeout); block invite
  links; a keyword list for the usual scams ("free nitro", "airdrop", "send me your login", "DM me for paid clips"); send alerts to the team log. Turn
  on the three preset filters too.
- **@everyone** should not be able to mention @everyone and @here, create invites or use external apps; keep threads and reactions on.
- **Require 2FA for moderator actions**, and keep the team to people you trust.
- **One permanent invite** to #get-started (never expires, no use limit). Put that in your TikTok bio and on the /links page, and watch its use
  count under Server Settings, Invites, to see what the ad brings in.
- **Pin** one message in #general: what logoless is, how people get paid, and a link to #rules.

## 3. What works from Discord alone

For anyone with a logoless account linked to their Discord (logging in with Discord on logoless.io does the linking and gives the roles):

- `/campaigns`, `/campaign`, `/earn`, `/leaderboard`, `/rank`, `/faq`, `/status`, `/next`, `/help`
- `/stats`, `/balance`, `/payout`, `/submissions`, `/profile`, `/badges`, `/roles`, `/sync`, `/notifications`
- `/submit` (send a post to a campaign), `/support` and the Open a ticket button (private channel with the team), `/report`
- brands: `/brand`; developers: `/dev`; the team: `/admin ...` (stats, queue, lookup, announce, update, campaign, panel, tick)
- every payout and submission is posted in its channel as a card, and each live campaign gets its own card and artist channel

## 4. What still needs the site

While the site is closed, only the log in page, the legal pages and /links are open, so nobody but the owner can do these yet. After Dec 1 they
need the site: finishing a profile (onboarding), proving a TikTok, YouTube or Instagram account with a code in the bio, adding a PayPal address and
withdrawing (typed twice, emailed code, hold to send), and brands creating and funding campaigns.

## 5. To make Discord truly stand on its own (not built yet)

In the order I would build them. The first three are what a new creator needs to go from nothing to paid without opening the site:

1. `/join`: make an account from Discord with an emailed code (no website visit).
2. `/verify`: get the bio code and check it for a connected social account.
3. `/paypal` and `/withdraw`: add the address with the emailed code, then withdraw with a confirm button. This moves money, so it gets the most care.
4. `/waitlist`: reserve a username from Discord while the site is closed.
5. Brands starting a campaign from a form in Discord.

## Launch day (Dec 1, 17:00 GMT)

The site opens by itself at that time. Before it: post in #news what changes, check **Check the bot's access** and **Run the live loop now**, and
make sure at least one real campaign is live so `/campaigns` has something in it.
