# Stripe setup checklist

The code for payments is in place and tested locally (ledger, webhooks, withdrawals, refunds). These are the
one-time steps that need your accounts. Do them in TEST mode first.

## 1. Stripe dashboard (test mode)
1. Create/open your Stripe account and switch on **Test mode**.
2. **Connect**: Settings > Connect > turn it on, choose "Platform or marketplace", fill in the platform profile.
   Clippers are Express accounts, so Stripe collects their ID, bank and tax details.
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
