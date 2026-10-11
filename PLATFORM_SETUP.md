# Platform setup (what to do outside the code)

Everything below is a one-off. Nothing here is pushed to GitHub: keys live in Cloudflare.

## 1. Database

1. Cloudflare dashboard > Storage & databases > D1 > the `logoless` database. Copy its **Database ID**.
2. Put that id into `wrangler.jsonc` (`database_id`) before you merge to `main`.
3. Apply the migrations to the real database (the Cloudflare build does not do this for you):

   ```bash
   npx wrangler d1 migrations apply DB --remote
   ```

   This runs every migration not yet applied (`0006` and `0007` are the newest: profile styles and the activity log). `0003` also adds the 10 sample campaigns, marked "sample" in the admin list. Delete them from `/admin/campaigns` when you have real ones.

## 2. Secrets (Cloudflare > Workers & Pages > mainsite > Settings > Variables and Secrets, type **Secret**)

| Name | What it is |
| --- | --- |
| `AUTH_SECRET` | 32+ random characters (`npx auth secret`) |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | Google sign-in |
| `ADMIN_EMAILS` | your email(s), comma separated. These people are admins. |
| `STRIPE_SECRET_KEY` | start with a **test** key (`sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | from the Stripe webhook endpoint (`whsec_...`) |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile widget (step 3) |
| `RESEND_API_KEY` | Switches on sign-in by emailed code (see "Email sign-in" below) |
| `DISCORD_BOT_TOKEN` | Optional. Switches on "Import from Discord" on profiles (see below) |

You can check which are set, and test them, at `/admin/keys`. Secret values are never shown there.

## 3. Human check (Turnstile)

Cloudflare dashboard > Turnstile > Add widget. Hostname `logoless.io`, mode **Managed**. Copy the site key and secret key into the table above. Until you do, sign-in has no human check and `/admin` shows a warning.

## 4. Stripe webhook

Developers > Webhooks > add endpoint `https://logoless.io/api/stripe/webhook` with these events:
`checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `account.updated` (tick "connected accounts"), `transfer.reversed`, `charge.refunded`, `charge.dispute.created`.
Then run the Stripe and webhook tests at `/admin/keys`.

## 5. Lock the admin area to you (strongly recommended)

Cloudflare Zero Trust > Access > Applications > Add > Self-hosted. Application domain `logoless.io`, path `/admin` (and a second one for `/api/admin`). Policy: allow only your email. This adds a second lock in front of the in-app admin check, so a stolen session alone cannot open it.

## 6. Cloudflare settings worth switching on

SSL/TLS > Edge Certificates: Always Use HTTPS, Minimum TLS 1.2. Security > WAF > Rate limiting rules: a rule for `/api/*` (for example 100 requests per minute per IP). Notifications: enable usage and D1 alerts.

## How a campaign goes live

Artist requests it (`/brand/campaigns/new`) > you accept it in `/admin/campaigns` > the artist pays with Stripe from `/brand/campaigns` > the payment webhook marks it **paid** and tells you > you press **Launch**. A campaign cannot launch before it is paid.

## How clips are paid

`/admin/submissions`: open the clip, check the views on the platform, type the verified number, press Approve and pay. The clipper gets 90%, the 10% fee goes to the "Site fees" pill. Raising the number later pays only the difference. There is no automatic view checking yet, so this step is manual.

## Import from Discord (optional)

Discord only lets a bot read someone's picture, banner, colour and name from their user ID. It does not let any app read the "About me" text or the connections, so those are added by hand.

1. Go to discord.com/developers/applications and click **New Application**. Call it logoless.
2. Open the **Bot** tab, press **Reset Token** and copy the token.
3. Add it in Cloudflare as a **Secret** called `DISCORD_BOT_TOKEN`. The bot does not need to join any server and needs no permissions.

## Activity log

Every request, page view, sign-in, security event and money movement is written to the database and shown at `/admin/logs`, where you can filter it and download it as CSV or JSON. Two plumbing calls that fire on every page (`/api/me/nav` and `/api/security/config`) are left out when they succeed. Visitors are stored as a salted hash, never a raw address.

Cloudflare's free D1 plan allows 100,000 row writes a day across everything, and the log uses some of them on every page. If the site gets busy, upgrade to the Workers Paid plan ($5 a month), and use "Delete activity log rows older than..." on the Logs page now and then.

## Email sign-up with a password (Resend)

People can sign up with an email and a password. We email a six-digit code (valid 10 minutes) to prove the address is real, and nothing is created until they type it in. After that they log in with email and password. "Forgot your password?" emails a reset code the same way. Google and Discord keep working.

1. In Resend, make sure the domain `verify.logoless.io` shows **Verified** (Domains page). If not, add the DNS records it lists in Cloudflare (DNS) and press Verify.
2. Resend > **API Keys** > Create API Key. Permission **Sending access**, domain `verify.logoless.io`.
3. Add it in Cloudflare as a **Secret** called `RESEND_API_KEY`.
4. Optional: add a plain variable `RESEND_FROM` to change the sender. The default is `logoless <login@verify.logoless.io>`.
5. Optional but wise: add a secret `PASSWORD_PEPPER` (a long random string). It is mixed into every password before hashing. **Never change it afterwards**, or every password stops matching. If you skip it, `AUTH_SECRET` is used, so then never change that either.
6. Open `/admin/email` in the admin area. It sends a test of every email we send (sign-up code, password reset, already-a-member, plain), runs a full code round trip to your inbox, and lists recent sends with a "Check delivery" button. `/admin/keys` also has an **Email (Resend)** test for the key and domain.

How passwords are kept safe: they are salted and run through PBKDF2 (100,000 rounds, the most Cloudflare allows) with the pepper, and only that result is stored. New passwords must be 10+ characters, not common, not contain the email name, and not appear in a known data breach (checked with Have I Been Pwned without sending the password: only the first 5 characters of its fingerprint leave). Logins are limited to 10 tries per address every 15 minutes and 20 per network.

Heads up: hashing a password takes real computing time. Cloudflare's free Workers plan gives each request only about 10 milliseconds of computing, which a password check can exceed. If logins fail with an error, upgrade to Workers Paid ($5 a month), which also fixes the free daily database limit.

Resend's free plan allows 100 emails a day and 3,000 a month. Past that, upgrade it.
