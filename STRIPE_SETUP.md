# Stripe setup checklist

The code for payments is in place and tested locally (ledger, webhooks, withdrawals, refunds). These are the
one-time steps that need your accounts. Do them in TEST mode first.

## 1. Stripe dashboard (test mode)
1. Create/open your Stripe account and switch on **Test mode**.
2. **Connect**: Settings > Connect > turn it on, choose "Platform or marketplace", fill in the platform profile.
   In the Connect setup wizard choose: buyers purchase from you, payouts split between sellers, embedded onboarding components, embedded account components. Clippers get Stripe accounts with no Stripe-hosted dashboard: Stripe still collects their ID, bank and tax details, but the forms and dashboard are shown inside logoless. (Stripe charges the platform a small monthly fee per active clipper account plus a fee per payout; check Stripe's Connect pricing for your country.)
3. **Customer portal**: Settings > Billing > Customer portal > Activate (lets brands manage cards and receipts).
4. **API key**: Developers > API keys > copy the **Secret key** (`sk_test_...`).
5. **Webhook**: Developers > Webhooks > Add endpoint
   - URL: `https://logoless.io/api/stripe/webhook`
   - Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`,
     `charge.dispute.created`, `transfer.reversed`
   - Add a second endpoint with the same URL for **Connected accounts** with the event `account.updated`
     (or one endpoint listening to both, if your dashboard offers it).
   - Copy each endpoint's **Signing secret** (`whsec_...`). If you create two endpoints you get two secrets;
     the webhook accepts both: put the first in `STRIPE_WEBHOOK_SECRET` and the Connect one in `STRIPE_CONNECT_WEBHOOK_SECRET`.
6. To test withdrawals, add balance to the platform with card `4000 0000 0000 0077`
   (Stripe test card that goes straight to available balance).

## 2. Cloudflare
1. Storage & databases > D1 > Create database, name it `logoless`. Copy its **Database ID**.
2. Put that id in `wrangler.jsonc` (replace the zeros) and commit.
3. Create the tables: open the database > Console, paste the contents of `migrations/0001_init.sql`, run it.
   (Or in a terminal: `npx wrangler d1 migrations apply DB --remote`.)
4. Worker project > Settings > Variables and secrets: add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `STRIPE_CONNECT_WEBHOOK_SECRET` as **Secrets**.

## 2a. Which payout screens clippers get (`PAYOUT_SETUP`)
The Payouts page can show two different setups, switched by one Cloudflare variable, no code change:
- **Stripe's own forms inside logoless (default).** Stripe collects identity and bank details in its embedded onboarding and shows balances, payouts and account details in its embedded components, themed to match the site. Needs `STRIPE_PUBLISHABLE_KEY`. Accounts are created so that Stripe collects the details.
- **logoless's own forms.** Set `PAYOUT_SETUP` to `custom`. logoless collects and sends the details itself (section 2b). Accounts are created so that logoless collects the details.
An account is created for one mode and cannot be switched: after changing `PAYOUT_SETUP`, test accounts made under the old mode need deleting in Stripe (Workbench > Overview > Review test data) and re-creating.

## 2b. Payout setup on our own site (no Stripe screens)
Clippers set up payouts in logoless's own forms. Nothing is embedded and nobody is sent to stripe.com: logoless sends the details to Stripe by API and Stripe does the identity checks and holds the data. Bank numbers are swapped for a one-time token in the browser, so logoless never sees them; ID photos pass through to Stripe and are not stored.
1. Stripe > Developers > API keys > copy the **Publishable key** (`pk_test_...`). It is meant to be public.
2. Cloudflare > Worker > Variables and secrets: add `STRIPE_PUBLISHABLE_KEY` (a normal variable is fine).
3. In the Connect wizard choose: buyers purchase from you, payouts split between sellers, **build your own** onboarding, **build your own** account management.
4. Because logoless collects the details, logoless is the one Stripe bills for the account's fees and the one that covers any losses (the account is created with those settings). Stripe charges the platform a small monthly fee per active clipper account plus a fee per payout; check Stripe's Connect pricing for your country.
5. Countries offered are listed in `lib/connect-fields.ts`. Each needs its own bank fields; add more there. Stripe only lets a platform pay connected accounts in the US, UK, EEA, Canada and Switzerland from a UK platform (other countries, such as Australia, are not possible with Connect).
6. Test in the sandbox: Payouts page > pick United States > use Stripe's test values (date of birth `01/01/1901`, SSN last 4 `0000`, address `address_full_match`, routing `110000000`, account `000123456789`).

## 3. Going live
Repeat steps 1.4 to 1.5 and 2.4 with your **live** keys only after test mode works end to end,
and only after a lawyer or accountant has looked at how you hold and move funds.

## Money rules in the code
- Everything is integer cents, USD only. Balances are sums over the `ledger` table, never stored numbers.
- Brands add funds with Stripe Checkout. Funds sit in your Stripe balance until paid out.
- A clipper's earning is the brand's payment minus the platform fee (`SITE.platformFeePct`), held for
  `SITE.holdDays` days, then withdrawable from `SITE.minPayoutUsd`.
- Withdrawals reserve the money in one atomic database step, then create a Stripe Transfer to the clipper's
  Connect account. If the transfer fails the money is put back automatically.
- There is no automatic view verification yet. Admins credit earnings from /admin/earnings.
