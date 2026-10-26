# Running logoless from Discord

Written Oct 23, 2026, from what the live site says today. The site is closed behind the launch page until **Dec 1 2026, 17:00 GMT**, so for now the
Discord server is the front door. This is the order to set it up in, what to switch on inside Discord yourself, and what still needs the site.

## The plan until launch

There are no campaigns yet and nothing to withdraw. The job of the server right now is to collect **founding members** and to turn as many of them as
possible into **proven creators** (an account made, a TikTok, YouTube or Instagram linked and proven with a code in the bio), so that you have real
numbers to show artists when you ask them for campaigns.

- Every setup message says so: logoless is not live yet, there are no campaigns yet, we are gathering founding members, and it opens on the date.
- **How a new member goes through it:**
  1. They find logoless.io (the coming-soon page: countdown, a Join Discord button, your socials) and join the Discord.
  2. They are **Unverified** and can see only #get-started. (The bot marks people who join by an invite link within a minute; people who join through the
     sign-in below come in already marked.)
  3. #get-started has one button, **Sign up**, which opens https://beta.logoless.io/onboarding. They sign in with Discord (which also adds them to the server),
     add a name and username, optionally Google and PayPal, and finish. The sign-up page is behind Cloudflare's quick check.
  4. Where they came from is written down and shown to you: Discord page, Setup tab, **Sign-ups** (network address, country, network name, device, Discord
     account age, anything odd). The address is kept with the account, for the account limit in the privacy policy, and goes when the account is deleted.
  5. They are **Verified**: the Unverified role comes off and the rest of the server opens. While the site is still shut they are a **Founding member** too.
  6. A clean welcome goes up in #welcome (their Discord picture, name, and Founding member #N or Verified member #N), and they get a direct message that
     says welcome and whether they are a founding member.
- **Bots:** a sign-up that looks odd (a script, Tor, a Discord account under 4 days old, three other sign-ups from the same network, a filled-in hidden field, or two
  smaller flags together) is **held**: the person sees "almost there" and you see it at the top of Sign-ups with the reasons, and press Let in or Turn down.
  Letting one in makes them Verified and sends the same messages.
- **No emoji.** Every message uses the gradient icons (the logo's colours) instead. They show next to titles and on buttons as the bot's own emoji: press
  **Upload the gradient icons** once (it uploads a few at a time and keeps going), and they appear in every message from then on. Until then the messages just
  have no icon in front of their titles (the small icon at the top of a card shows regardless).
- Everything still works inside Discord too (`/join`, `/verify`, `/paypal`, `/accounts`, `/payments`): linking and proving a TikTok, YouTube or
  Instagram, and adding PayPal. The main site's own sign-up (logoless.io/onboarding) opens with the site.
- While the site is shut, logoless.io shows only the coming-soon page: the countdown, a **Join Discord** button (the Discord link under Socials and
  links) and all the socials. beta.logoless.io shows only the sign-up; every other address on it comes back to the sign-up, and once the site opens it sends people to logoless.io.
- While the site is closed there is no balance, no withdraw button and no campaign list (those would only lead nowhere): `/withdraw` says there is
  nothing to withdraw yet, `/campaigns` says there are none, and the payment panel only offers adding PayPal. All of it comes back by itself when the site opens.
- **Your numbers** (owner dashboard, Discord page, Setup tab; also `/admin audience` in Discord): server members, accounts made, accounts with Discord
  linked, people who linked a social account, proven TikToks, YouTubes and Instagrams, the **TikTok followers of the proven accounts added up** (read from
  the profile at the moment it is proven; YouTube and Instagram do not give a follower count that can be trusted, so they are counted but not added up),
  and a one-line summary to paste into a message to an artist. The #site card shows the same line while there are no campaigns.

## Where things stand

- The bot is built and all nine Discord switches are on at logoless.io (get started, payouts, submissions, campaign cards, live numbers, roles,
  tickets, commands, the Discord page).
- The server is saved in `/admin/discord`: the get-started, rules, site, support, status, news, new-campaigns, system, updates, clips and logs
  channels, the tickets, artists and inactive categories, and the linked, clipper, brand, team and staff roles.
- **Not filled in yet:** the payouts and submissions channels, the Founding member, Artist, Developer and Admin roles, the earnings tiers, and any community
  channels (general chat and so on). Without the payouts and submissions channels those two switches have nowhere to post.
- The one-button **Get started** used to send people to a sign-up page that the launch page hides. It now answers with the opening date and what
  to do here instead, until the site opens.

## 1. The buttons, in this order (owner.logoless.io/admin/discord)

1. **Check the bot's access.** Fix anything it lists before going on.
2. **Make the missing roles.** This now includes **Verified** and **Unverified**. Then, in Discord: Server Settings, Roles, and drag the bot's role *above* all the roles
   it hands out (Linked, Clipper, Brand, Artist, Developer, Team, Admin, Verified, Unverified, Founding member). A bot cannot give a role that sits above its own.
3. **Make the missing categories and channels.** Fills the payouts and submissions channels (read-only for members) and the tickets, artists and
   inactive categories if any are missing.
4. **Fit the whole server (names, channels, roles).** One plan for the entire server, pressed as often as you like (it looks first and only does what is not done):
   - roles: every role becomes **L | …** (the "L™ | " ones too: L | Admin, L | Creator, L | Brand, L | Member, L | Welcome; the bot's own become L | Site Admin,
     L | Developer, L | Artist, L | Founding Member, L | Verified, L | Unverified) and the three earnings tiers (L | $100 / $1K / $10K Earner) are made;
   - channels: every channel becomes **・name**. The categories are Welcome (・get-started), Info (・rules ・site ・status), Landing (・news ・updates ・campaigns ・system),
     Metro (・welcome ・chat ・introductions ・edit-help ・off-topic ・bot-commands ・payouts ・submissions, the ・suggestions and ・help forums, two voice lounges),
     Help (・support) and Staff (・moderator ・logs ・team-chat), then Artists and Inactive. It adopts what you already have by name, makes only what is missing, puts each
     channel in its category, fills in an empty topic, and puts the categories in that order;
   - it also removes the bot's earlier Community and Team categories and their copies (general, ideas-and-feedback, mod-queue) but only when nothing was ever written in them;
     anything it cannot do (a role above the bot's own role cannot be renamed: drag the bot's role to the top in Server Settings, Roles, and press again) is listed in the answer;
   - permissions: Verified and the team can see the member channels, read-only ones stay read-only, the team's channels stay the team's. It does **not** hide anything from
     everyone: that is the lock below, which is yours to press.
   After its first look at a channel or category the fit **leaves it alone**: if you move, rename or delete something by hand it stays that way (a deleted channel is not
   made again, a moved one is not moved back, the category order is set once). New channels the plan adds later are made once. **Keep the server as it is now** writes the
   current layout down as the one you want, without changing anything. The plan also has **#roles** (what each role means) and **#how-it-works** (the five steps from
   sign-up to payout); press **Post it** next to each (Server tab) after the fit has made them.
   **Make the launch-day event** puts "logoless opens" in the server's events list for the opening time on the Countdown page (press it again if you change the time).
   **Use the new logo** puts the bracket mark (thicker, with the gradient) on the server icon, the bot's picture and the logo emoji (Discord lets the bot change its picture
   only a couple of times an hour). **Post a welcome preview in the welcome channel** sends the welcome card with your own name and Discord picture, exactly as a new member's.
   **Lock the server to verified members** is the one that matters now: for every channel and category it adds "Verified can see it" and "everyone cannot", and
   leaves every other permission as it was (a read-only channel stays read-only; the team's private channels are left alone). #get-started stays open to everyone to
   read, and no one can write in it. Safe to press again. After it, a new member sees only #get-started.
   **Server Members Intent:** in the Discord developer portal (the application, Bot, Privileged Gateway Intents) switch on *Server Members Intent*. The bot reads
   the newest members once a minute to mark people who joined by an invite link as Unverified; without it that marking does not happen (the lock still works,
   because a new member has no role, so they see only #get-started either way). Check the bot's access says whether it is on.
5. **Register commands.** Needed whenever the command list changes. The newest commands (`/join`, `/verify`, `/accounts`, `/paypal`, `/payments`, `/withdraw`) only appear after this.
6. Post the panels: **get-started, rules, site, support, status**. The get-started one now links to the web sign-up; post it again (delete the old message) to get the new button (the "Post" buttons). Then, in the channels where you want them, type `/admin panel` and pick **Manage accounts** and **Payment details**. If the rules message is already posted, post it again to get the new look (delete the old one).
7. **Make artist channels and cards**, then **Run the live loop now**.
8. **Send a test message** and **Send me the welcome rundown** to see what members see.

Only **Fit the whole server** renames anything (and removes the bot's own empty older copies); the rest only add.

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
- `/stats`, `/balance`, `/payout`, `/withdraw`, `/submissions`, `/profile`, `/badges`, `/roles`, `/sync`, `/notifications`
- `/submit` (send a post to a campaign), `/support` and the Open a ticket button (private channel with the team), `/report`
- brands: `/brand`; developers: `/dev`; the team: `/admin ...` (stats, queue, lookup, announce, update, campaign, panel, tick)
- every payout and submission is posted in its channel as a card, and each live campaign gets its own card and artist channel

## 3b. Set up your account from Discord (new)

While the site is closed, a member can do all of this without the website:

- **Make an account** (`/join` or the Make an account button): email address, a 6 digit code sent to it, and the Discord is linked at once. A Discord account younger than 4 days is asked to wait (they are the easy way to make many).
- **Link an account and prove it** (`/verify`, the Link Account button): pick TikTok, YouTube or Instagram, type the username, put the code in the bio, press Check my bio. Instagram cannot be read by a server, so a person on the team checks it by hand.
- **Add PayPal** (`/paypal`, the Link Payment Method button): the address typed twice, and a code emailed to the *account* email (the same ceremony as the site). Manage or remove them with `/payments`; `/accounts` does the same for linked accounts.
- **Withdraw** (`/withdraw`, the Withdraw buttons on the balance card and the payment panel): the amount (or everything) and the destination are shown, and the member has 2 minutes to press Confirm. Money only goes to a PayPal email that was added with a code, never one typed here. Confirming reserves the money first (so a double press cannot pay twice) and then sends it through PayPal; the site's own checks apply (smallest withdrawal, pause switch, large amounts and the daily limit wait for you to approve; an account with extra checks waits too). The one check that cannot be done from Discord is the VPN/network look, because the request comes from Discord's servers. A receipt goes to the account email.
- Every welcome and setup message carries a notice that logoless is not live yet and when it opens, for as long as the launch page is up.

## 4. What still needs the site

While the site is closed, only the log in page, the legal pages, /links and the sign-in hop (/join, used by beta.logoless.io) are open on logoless.io, and
beta.logoless.io/onboarding is the one sign-up. After Dec 1 the main site's own onboarding (role choice, brands) opens, and brands can create and fund
campaigns. Founding members keep their role and their profile. Making an account, linking and proving social accounts, adding PayPal and withdrawing can all
be done in Discord now.

## 5. To make Discord truly stand on its own (not built yet)

Done now: `/join`, `/verify`, `/paypal` and `/withdraw` (section 3b). Still missing, in the order I would build them:

1. Finishing a profile (picture, bio) from Discord (name and username are on the web sign-up).
2. `/waitlist`: reserve a username from Discord while the site is closed.
3. Brands starting a campaign from a form in Discord.

## Launch day (Dec 1, 17:00 GMT)

The site opens by itself at that time. Before it: post in #news what changes, check **Check the bot's access** and **Run the live loop now**, and
make sure at least one real campaign is live so `/campaigns` has something in it.

## Getting members (what Seeder shows, and what I would do)

What Seeder says about itself (seeder.gg, Oct 2026): artists and labels fund campaigns and pay only for counted views, with a hard budget cap and a live
report link; editors earn per 1,000 views, paid by PayPal or USDT with the PayPal fee covered; live campaigns are announced in its Discord first; it
covers 14 niches, says thousands of editors see a campaign when it opens, and has its team watch posts and brief more editors when a format starts to
catch on. I could not find how it grew (no member count, funding or growth story is public), so what follows is my reading, not a fact about them.

1. **Campaigns first, members second.** An empty server does not keep anyone. Have three to five real, funded campaigns live before you push
   the invite hard (the first 5 campaigns per brand are fee-free, which helps you sign artists).
2. **Proof of payment is the best advert.** The payouts channel (a card per payout, names half hidden) is exactly this. Make it visible from the
   invite page and the first message in #get-started.
3. **The invite goes everywhere the editors already are:** your TikTok bio and the /links page, a pinned comment on every post, in every campaign
   brief, and on the artists' own pages.
4. **Run a few edit pages yourself.** Post edits of your live campaigns' songs on TikTok with the invite in the bio. It shows editors that the
   money is real and it is cheap reach.
5. **Pay people to bring people.** Seeder shows no referral programme. A bonus per referred editor who gets an approved submission would be
   a real difference (it needs building: say if you want it).
6. **Keep the first month busy:** a campaign drop every few days, an edit of the week, the leaderboard and earnings tiers (the roles already exist).
7. **Track where people come from** with a separate invite link per place (bio, ad, artist) and look at the use counts weekly.
8. **Protect quality:** verification level Medium, AutoMod on, and approve submissions quickly (people leave when reviews are slow).
