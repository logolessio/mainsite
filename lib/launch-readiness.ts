import { headers } from 'next/headers'
import { verifyAudit } from './chain'
import { captchaConfigured } from './human'
import { db, setting } from './db'
import { getSetting } from './settings'
import { SITE } from './site'
import { paypalConfig, paypalPing } from './paypal'

/** The newest database migration this code expects. Bump it whenever a migration is added. */
export const LATEST_MIGRATION = '0010_artist_invites'

export type Level = 'blocker' | 'should' | 'nice'
export type State = 'done' | 'warn' | 'todo'
export type Group = 'Sign-in and accounts' | 'Payments and payouts' | 'Database and safety' | 'Content and look' | 'Running the business'

export type Item = {
  id: string
  group: Group
  title: string
  why: string
  level: Level
  state: State
  /** What we actually found. */
  detail?: string
  /** Plain steps to fix it. */
  how?: string[]
  href?: string
  hrefLabel?: string
  /** A thing only a person can confirm: they tick it themselves. */
  manual?: boolean
}

export type Readiness = {
  items: Item[]
  percent: number
  verdict: 'not-ready' | 'almost' | 'ready'
  blockersLeft: number
  counts: { done: number; todo: number; warn: number; total: number }
  checkedAt: number
}

const WEIGHT: Record<Level, number> = { blocker: 3, should: 2, nice: 1 }
const MANUAL_PREFIX = 'launch:'

type Def = Omit<Item, 'state'> & { state?: State }

/** Computes everything from the real site: secrets, database, PayPal and what the owner has ticked off by hand. */
export async function readiness(): Promise<Readiness> {
  const d = await db()
  const has = async (n: string) => Boolean(await setting(n))
  const val = async (n: string) => (await setting(n)) ?? ''
  const safe = async <T,>(fn: () => Promise<T>, fallback: T) => {
    try {
      return await fn()
    } catch {
      return fallback
    }
  }

  // ---- facts we look up once ----
  const ticks = new Map((await safe(async () => (await d.prepare("SELECT key, value FROM settings WHERE key LIKE 'launch:%'").all<{ key: string; value: string }>()).results, [])).map((r) => [r.key.slice(MANUAL_PREFIX.length), r.value === '1']))
  const pp = await paypalConfig()
  const secret = await val('AUTH_SECRET')
  const adminEmails = (await val('ADMIN_EMAILS')).split(',').filter((e) => e.trim()).length
  const host = await safe(async () => (await headers()).get('host') ?? '', '')

  const facts = await safe(
    async () =>
      d
        .prepare(
          `SELECT
             (SELECT COUNT(*) FROM stripe_events) AS events,
             (SELECT COUNT(*) FROM campaigns WHERE admin_note = 'sample') AS samples,
             (SELECT COUNT(*) FROM campaigns WHERE status = 'live' AND COALESCE(admin_note, '') != 'sample') AS realLive,
             (SELECT COUNT(*) FROM topups WHERE status = 'paid' AND campaign_id IS NOT NULL) AS campaignPayments,
             (SELECT COUNT(*) FROM payouts WHERE status = 'sent') AS payoutsSent,
             (SELECT COUNT(*) FROM users WHERE role != 'admin') AS people,
             (SELECT COUNT(*) FROM event_log WHERE kind = 'error' AND ts > strftime('%s','now') - 86400) AS errors24h,
             (SELECT COUNT(*) FROM artist_invites) AS invites,
             (SELECT COUNT(*) FROM artist_invites WHERE campaign_id IS NOT NULL) AS inviteCampaigns,
             (SELECT COUNT(*) FROM (SELECT campaign_id FROM ledger WHERE account = 'campaign' GROUP BY campaign_id HAVING SUM(amount_cents) < 0)) AS negPools,
             (SELECT COUNT(*) FROM (SELECT user_id FROM ledger WHERE account = 'clipper' GROUP BY user_id HAVING SUM(amount_cents) < 0)) AS negClippers`,
        )
        .first<Record<string, number>>(),
    null,
  )
  const f = facts ?? {}
  const migration = await safe(async () => (await d.prepare('SELECT name FROM d1_migrations ORDER BY id DESC LIMIT 1').first<{ name: string }>())?.name ?? null, null)
  const migrated = migration ? migration.replace(/\.sql$/, '') >= LATEST_MIGRATION : await safe(async () => Boolean(await d.prepare("SELECT 1 AS x FROM sqlite_master WHERE name = 'artist_invites'").first()), false)
  const chain = await safe(() => verifyAudit(), { ok: false, rows: 0 })
  const pingOk = pp ? await safe(async () => (await paypalPing(), true), false) : false
  const payoutsPaused = (await getSetting('payouts_paused')) === '1'
  const live = Boolean(pp?.live)

  const tick = (id: string) => ticks.get(id) === true
  const manual = (id: string, o: Omit<Def, 'id' | 'manual'>): Def => ({ id, manual: true, state: tick(id) ? 'done' : 'todo', ...o })

  const defs: Def[] = [
    // ---------------- sign-in ----------------
    { id: 'auth-secret', group: 'Sign-in and accounts', level: 'blocker', title: 'Sign-in secret is long and random', why: 'It signs every login. If it is short or missing, sessions can be forged.', state: secret.length >= 32 ? 'done' : secret ? 'warn' : 'todo', detail: secret ? `${secret.length} characters` : 'Not set', how: ['Run `npx auth secret` to make one.', 'Cloudflare → your Worker → Settings → Variables and Secrets → add AUTH_SECRET as a Secret.', 'Promote the new version.'], href: '/admin/keys', hrefLabel: 'Open keys and tests' },
    { id: 'google', group: 'Sign-in and accounts', level: 'blocker', title: 'Google sign-in works', why: 'Most people will log in with Google.', state: (await has('AUTH_GOOGLE_ID')) && (await has('AUTH_GOOGLE_SECRET')) ? 'done' : 'todo', detail: (await has('AUTH_GOOGLE_ID')) ? 'Keys are set' : 'Keys missing', how: ['Google Cloud Console → APIs & Services → Credentials → OAuth client (Web).', 'Authorised redirect: https://logoless.io/api/auth/callback/google', 'Add AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in Cloudflare as Secrets.'] },
    manual('google-published', { group: 'Sign-in and accounts', level: 'blocker', title: 'Google app is published, not in "Testing"', why: 'In Testing mode only listed test users can log in. Everyone else sees an error.', how: ['Google Cloud Console → OAuth consent screen.', 'Press "Publish app" and set the status to In production.', 'Tick this once it says In production.'] }),
    { id: 'admins', group: 'Sign-in and accounts', level: 'blocker', title: 'Admin emails are set', why: 'Only these addresses can open /admin.', state: adminEmails > 0 ? 'done' : 'todo', detail: adminEmails ? `${adminEmails} admin${adminEmails > 1 ? 's' : ''}` : 'ADMIN_EMAILS is empty', how: ['Add ADMIN_EMAILS in Cloudflare as a Secret (your email, comma separated).'] },
    { id: 'email', group: 'Sign-in and accounts', level: 'blocker', title: 'Email can be sent', why: 'Sign-up codes, password resets and artist invitations all need it.', state: (await has('RESEND_API_KEY')) ? 'done' : 'todo', detail: (await has('RESEND_API_KEY')) ? 'Resend key is set' : 'No Resend key', how: ['Resend → Domains: make sure verify.logoless.io shows Verified.', 'Resend → API Keys → create one with Sending access.', 'Add it in Cloudflare as RESEND_API_KEY.'], href: '/admin/email', hrefLabel: 'Send a test email' },
    manual('email-inbox', { group: 'Sign-in and accounts', level: 'should', title: 'A test email reached a real inbox, not spam', why: 'Gmail and Outlook can quietly bin new senders. Check before artists depend on it.', how: ['Send yourself a test from the Email page.', 'Check Gmail and an Outlook address, including the spam folder.', 'If it lands in spam, check the SPF and DKIM records for verify.logoless.io.'] }),
    { id: 'turnstile', group: 'Sign-in and accounts', level: 'should', title: 'Bot check (Turnstile) is on', why: 'Stops bots creating thousands of fake accounts.', state: (await captchaConfigured()) ? 'done' : 'todo', detail: (await captchaConfigured()) ? 'Active on sign-in' : 'Not set up', how: ['Cloudflare → Turnstile → Add widget for logoless.io (Managed).', 'Add TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY as Secrets.'] },
    { id: 'pepper', group: 'Sign-in and accounts', level: 'should', title: 'Password pepper is set', why: 'Adds a second secret to every stored password. Set it once and never change it.', state: (await has('PASSWORD_PEPPER')) ? 'done' : 'warn', detail: (await has('PASSWORD_PEPPER')) ? 'Set' : 'Falling back to AUTH_SECRET', how: ['Add PASSWORD_PEPPER (a long random string) as a Secret.', 'Do this before real people sign up. Changing it later logs everyone out of passwords.'] },
    { id: 'discord', group: 'Sign-in and accounts', level: 'nice', title: 'Discord login (optional)', why: 'A second way in that clippers like.', state: (await has('AUTH_DISCORD_ID')) && (await has('AUTH_DISCORD_SECRET')) ? 'done' : 'todo', detail: (await has('AUTH_DISCORD_ID')) ? 'Set' : 'Not set' },

    // ---------------- payments ----------------
    { id: 'paypal-key', group: 'Payments and payouts', level: 'blocker', title: 'PayPal is connected', why: 'Brands add funds and clippers are paid through it. All the money is held there.', state: pp ? 'done' : 'todo', detail: pp ? 'Keys are set' : 'No keys', how: ['Open PAYPAL_SETUP.md in the project: it walks through every step.', 'developer.paypal.com → Apps and credentials → create an app on a Business account.', 'Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Cloudflare as Secrets.'], href: '/admin/keys', hrefLabel: 'Run the PayPal test' },
    { id: 'paypal-works', group: 'Payments and payouts', level: 'blocker', title: 'PayPal accepts our keys', why: 'A wrong key means nobody can add funds or withdraw.', state: pingOk ? 'done' : 'todo', detail: pingOk ? 'PayPal answered' : pp ? 'PayPal refused the keys' : 'No keys yet', href: '/admin/keys', hrefLabel: 'Run the PayPal test' },
    { id: 'paypal-live', group: 'Payments and payouts', level: 'blocker', title: 'PayPal is in LIVE mode', why: 'In sandbox mode no real money moves. Launch with live keys.', state: live ? 'done' : 'todo', detail: pp ? (live ? 'Live keys in use' : 'Still sandbox') : 'No keys', how: ['developer.paypal.com → switch the toggle to Live and copy the live Client ID and Secret.', 'Replace PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET, and set PAYPAL_ENV to live (or remove it).', 'Create the webhook again on the live app and replace PAYPAL_WEBHOOK_ID.'] },
    { id: 'paypal-webhook', group: 'Payments and payouts', level: 'blocker', title: 'PayPal webhook ID is set', why: 'Without it we are never told about refunds, bounced payouts or payments that clear late.', state: (await has('PAYPAL_WEBHOOK_ID')) ? 'done' : 'todo', how: ['PayPal app → Webhooks → add https://logoless.io/api/paypal/webhook with the payment capture and payouts item events.', 'Copy its Webhook ID into PAYPAL_WEBHOOK_ID as a Secret.'] },
    { id: 'webhook-proof', group: 'Payments and payouts', level: 'blocker', title: 'A real PayPal event has arrived', why: 'Proves the webhook URL is reachable and the ID matches.', state: (f.events ?? 0) > 0 ? 'done' : 'todo', detail: `${f.events ?? 0} received so far`, how: ['Add funds with a small amount, or send a simulated event from the PayPal webhooks page.'], href: '/admin/keys', hrefLabel: 'Check the webhook' },
    manual('paypal-payouts', { group: 'Payments and payouts', level: 'blocker', title: 'PayPal Payouts is switched on', why: 'It is how clippers are paid. PayPal has to approve it for your business account first.', how: ['PayPal business account → Pay & Get Paid → Payouts (or ask PayPal support to enable Payouts).', 'Tick this once a test payout works.'] }),
    manual('paypal-funded', { group: 'Payments and payouts', level: 'blocker', title: 'The PayPal account holds enough to pay clippers', why: 'Payouts come out of the PayPal balance. Money brands add arrives there; keep it from running dry.', how: ['Watch the Company funds figure on the admin overview: your PayPal balance should always be at least that much.'] }),
    { id: 'payment-proof', group: 'Payments and payouts', level: 'blocker', title: 'A campaign payment went all the way through', why: 'The money in, pool credited, campaign launched path must work once for real.', state: (f.campaignPayments ?? 0) > 0 ? 'done' : 'todo', detail: `${f.campaignPayments ?? 0} paid campaign payment${f.campaignPayments === 1 ? '' : 's'}`, how: ['Make an artist link for yourself, claim it with a second account and fund a $100 campaign.', 'Confirm it lands in the pool and you can Launch it.'], href: '/admin/invites', hrefLabel: 'Make a test link' },
    { id: 'payout-proof', group: 'Payments and payouts', level: 'blocker', title: 'A clipper payout was sent', why: 'Proves a clipper can set up, withdraw and be paid.', state: (f.payoutsSent ?? 0) > 0 ? 'done' : 'todo', detail: `${f.payoutsSent ?? 0} sent so far`, how: ['Use a second account as a clipper, submit a clip, approve it with views, and withdraw.', 'Check the money arrived in the PayPal account.'], href: '/admin/payouts', hrefLabel: 'Open payouts' },
    { id: 'payouts-on', group: 'Payments and payouts', level: 'blocker', title: 'Payouts are not paused', why: 'The pause switch stops every withdrawal.', state: payoutsPaused ? 'todo' : 'done', detail: payoutsPaused ? 'Paused right now' : 'Running', href: '/admin/settings', hrefLabel: 'Open settings' },

    // ---------------- database & safety ----------------
    { id: 'migrations', group: 'Database and safety', level: 'blocker', title: 'Database is up to date', why: 'New features (like artist links) need the newest tables.', state: migrated ? 'done' : 'todo', detail: migration ? `Latest applied: ${migration}` : migrated ? 'Newest tables found' : 'Newest tables missing', how: ['In the project folder run: npx wrangler d1 migrations apply DB --remote', 'Then refresh this page.'] },
    { id: 'ledger', group: 'Database and safety', level: 'blocker', title: 'Money books balance', why: 'No campaign or clipper may ever be below zero.', state: (f.negPools ?? 0) + (f.negClippers ?? 0) === 0 ? 'done' : 'todo', detail: (f.negPools ?? 0) + (f.negClippers ?? 0) === 0 ? 'No negative balances' : `${f.negPools} pools and ${f.negClippers} clippers are below zero`, href: '/admin/keys', hrefLabel: 'Run the money check' },
    { id: 'audit', group: 'Database and safety', level: 'should', title: 'Admin log is untampered', why: 'The log is chained: any edit breaks it.', state: chain.ok ? 'done' : 'todo', detail: chain.ok ? `${chain.rows} entries verified` : 'The chain is broken: investigate', href: '/admin/audit', hrefLabel: 'Open audit log' },
    { id: 'errors', group: 'Database and safety', level: 'should', title: 'No server errors in the last 24 hours', why: 'Errors mean something broke for a real person.', state: (f.errors24h ?? 0) === 0 ? 'done' : (f.errors24h ?? 0) < 5 ? 'warn' : 'todo', detail: `${f.errors24h ?? 0} in the last day`, href: '/admin/logs?kind=error', hrefLabel: 'See the errors' },
    manual('cf-access', { group: 'Database and safety', level: 'should', title: 'Cloudflare Access locks /admin to you', why: 'A second lock in front of the admin area, so a stolen login alone cannot open it.', how: ['Cloudflare Zero Trust → Access → Applications → Add → Self-hosted.', 'Domain logoless.io, path /admin (and another for /api/admin).', 'Policy: allow only your email.'] }),
    manual('waf', { group: 'Database and safety', level: 'should', title: 'Cloudflare rate-limit rule on /api', why: 'Slows down anyone hammering the site.', how: ['Cloudflare → Security → WAF → Rate limiting rules.', 'Rule: URI path starts with /api/, 100 requests per minute per IP, then block for 1 minute.'] }),
    manual('paid-plan', { group: 'Database and safety', level: 'should', title: 'Workers Paid plan ($5/month)', why: 'The free database allows 100,000 writes a day. A busy launch day can pass that and stop the site writing.', how: ['Cloudflare → Workers & Pages → Plans → Workers Paid.'] }),
    manual('alerts', { group: 'Database and safety', level: 'nice', title: 'Cloudflare usage alerts are on', why: 'An email if traffic or database use spikes.', how: ['Cloudflare → Notifications → add usage and D1 alerts.'] }),

    // ---------------- content ----------------
    { id: 'samples', group: 'Content and look', level: 'blocker', title: 'Sample campaigns are removed', why: 'The home page should show only real campaigns. Samples are fake artists.', state: (f.samples ?? 0) === 0 ? 'done' : 'todo', detail: (f.samples ?? 0) === 0 ? 'None left' : `${f.samples} sample campaigns still showing`, how: ['Open Campaigns and press “Remove sample campaigns” (top right). Do this when your first real campaign is ready, so the home page is never empty.'], href: '/admin/campaigns', hrefLabel: 'Open campaigns' },
    { id: 'real-live', group: 'Content and look', level: 'blocker', title: 'At least one real campaign is live', why: 'A launch with an empty home page looks abandoned.', state: (f.realLive ?? 0) > 0 ? 'done' : 'todo', detail: `${f.realLive ?? 0} live`, how: ['Send your first artist link and launch their campaign.'], href: '/admin/invites', hrefLabel: 'Make an artist link' },
    { id: 'company', group: 'Content and look', level: 'blocker', title: 'Company name and address are real', why: 'They appear in the legal pages and receipts. A placeholder looks unfinished and is not legally sound.', state: SITE.address.includes('[') || SITE.address.includes('TODO') ? 'todo' : 'done', detail: SITE.address.includes('[') ? 'Address is still a placeholder' : SITE.company, how: ['Edit `company` and `address` in lib/site.ts, then push.'] },
    manual('mailboxes', { group: 'Content and look', level: 'blocker', title: 'support@ / legal@ / privacy@ mailboxes work', why: 'The legal pages and footer tell people to write to these. Someone must receive them.', how: [`The site lists ${SITE.emails.support}, ${SITE.emails.legal}, ${SITE.emails.privacy} and ${SITE.emails.abuse}.`, 'Make each one a real mailbox or a forward to you, and send a test to each.'] }),
    manual('socials', { group: 'Content and look', level: 'should', title: 'Social links in the footer go to real accounts', why: 'Dead links in the footer undermine trust.', how: ['Check Discord, X, Instagram, TikTok and YouTube links in lib/site.ts.', 'Create the accounts if they do not exist yet.'] }),
    manual('legal-review', { group: 'Content and look', level: 'should', title: 'A lawyer has read the Terms and Privacy Policy', why: 'The site moves real money and stores personal data. Templates are a starting point only.', how: ['Send the pages under /legal to a solicitor or attorney in your country.', 'Apply their changes in the code so every edit is reviewed.'] }),
    manual('mobile', { group: 'Content and look', level: 'should', title: 'You tried the whole site on a phone', why: 'Most clippers will use their phone.', how: ['Sign up, browse, submit a clip, open the dashboard and an artist link on your phone.'] }),

    // ---------------- running it ----------------
    { id: 'invites', group: 'Running the business', level: 'should', title: 'First artist link made', why: 'Artist links are how your first campaigns arrive.', state: (f.invites ?? 0) > 0 ? 'done' : 'todo', detail: `${f.invites ?? 0} made, ${f.inviteCampaigns ?? 0} turned into campaigns`, href: '/admin/invites', hrefLabel: 'Make one' },
    manual('views-process', { group: 'Running the business', level: 'blocker', title: 'You know how views get verified each day', why: 'View counts are checked by hand for now. Clippers expect to be paid, so someone has to do it on a schedule.', how: ['Pick a time each day to open the Review queue.', 'Check each clip’s real views on the platform, enter them, and press Approve and pay.', 'Decide who covers it when you are away.'] }),
    manual('support-plan', { group: 'Running the business', level: 'should', title: 'You have a plan for support and disputes', why: 'Clippers will ask where their money is and artists will ask for refunds.', how: ['Read the refund policy under /legal/refunds and decide who answers support email.', 'Decide what happens on a PayPal dispute (the site flags it, a human decides).'] }),
    manual('first-run', { group: 'Running the business', level: 'blocker', title: 'You ran the whole loop once, end to end', why: 'Artist link → set up → fund → launch → clip → approve → payout. Doing it once finds every sharp edge.', how: ['Use two spare accounts: one artist (via a link), one clipper.', 'Walk through every step above and write down anything that confused you.'] }),
    manual('contact-form', { group: 'Running the business', level: 'should', title: 'A message from the contact form reaches you', why: 'The contact page now emails the first admin address. Make sure it lands in a real inbox and you can reply to it.', how: ['Open /contact in a private window and send yourself a message.', 'Check your inbox and spam folder. Hitting reply should go to the address you typed.'], href: '/contact', hrefLabel: 'Open the contact page' }),
    manual('dev-site', { group: 'Running the business', level: 'nice', title: 'Dev site works (dev.logoless.io)', why: 'This is where new features are tried before they reach the real site. Admins only.', how: ['In Google Cloud Console, add https://dev.logoless.io/api/auth/callback/google as an authorised redirect for the OAuth client.', 'Open dev.logoless.io and sign in with an admin account.', 'Use the push button, or Admin → Push features, to send a feature live. Every push can be undone.'], href: '/admin/push', hrefLabel: 'Open push panel' }),
    manual('launch-plan', { group: 'Running the business', level: 'nice', title: 'First 10 artists lined up', why: 'Clippers only join when there is something to clip.', how: ['List the artists you have spoken to and make their links ahead of time.'] }),
  ]

  const items: Item[] = defs.map((x) => ({ ...x, state: x.state ?? 'todo' }))
  let got = 0
  let max = 0
  for (const i of items) {
    const w = WEIGHT[i.level]
    max += w
    got += i.state === 'done' ? w : i.state === 'warn' ? w / 2 : 0
  }
  const percent = Math.round((got / max) * 100)
  const blockersLeft = items.filter((i) => i.level === 'blocker' && i.state !== 'done').length
  const counts = { done: items.filter((i) => i.state === 'done').length, todo: items.filter((i) => i.state === 'todo').length, warn: items.filter((i) => i.state === 'warn').length, total: items.length }
  const verdict = blockersLeft > 0 ? 'not-ready' : percent >= 90 ? 'ready' : 'almost'
  return { items, percent, verdict, blockersLeft, counts, checkedAt: Math.floor(Date.now() / 1000) }
}
