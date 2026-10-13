# Adding PayPal to logoless

All money on logoless is held and moved with PayPal:

* **Brands add funds** to their logoless balance with a normal PayPal checkout. Campaigns are paid from that balance.
* **Clippers withdraw** by typing a PayPal email and pressing Withdraw. We send it with the PayPal Payouts API.
* The **15% platform fee** is charged to the brand **on top** of what clippers earn. A clipper always receives the full amount their views earned. A $1,000 budget costs the brand $1,150: $1,000 goes into the campaign pool for clippers and $150 is our fee, kept as each payout is made.

You do the steps below once. Nothing needs to be installed.

## 1. A PayPal Business account

Use (or create) a **Business** account at paypal.com. Finish verification (business details, bank account, identity). PayPal limits payouts until it is verified.

## 2. Turn on Payouts

In the Business account go to **Pay & Get Paid > Payouts** (or contact PayPal merchant support and ask for the **Payouts** product to be enabled). PayPal reviews this, so ask early. Without it clippers cannot be paid.

Payouts are sent from your PayPal balance. Money brands add arrives in that balance, so keep it at least as large as the "Company funds" figure on the admin overview.

## 3. Create the app (the keys)

1. Go to https://developer.paypal.com and sign in with the Business account.
2. **Apps & Credentials**. Start with the **Sandbox** toggle to try everything with fake money, then repeat on **Live**.
3. **Create App**, type *Merchant*. Name it logoless.
4. Under *Features* tick **Accept payments** and **Payouts**.
5. Copy the **Client ID** and **Secret**.

## 4. Add the secrets in Cloudflare

Cloudflare > Workers & Pages > mainsite > Settings > Variables and Secrets. Add these as **Secrets**:

| Name | Value |
| --- | --- |
| `PAYPAL_CLIENT_ID` | the Client ID |
| `PAYPAL_CLIENT_SECRET` | the Secret |
| `PAYPAL_ENV` | `sandbox` while testing, `live` when you launch (leaving it out means live) |
| `PAYPAL_WEBHOOK_ID` | from step 5 |

Then deploy a new version so the site sees them.

## 5. The webhook

PayPal tells the site about refunds, payouts that bounce and payments that clear late.

1. In the same PayPal app scroll to **Webhooks > Add Webhook**.
2. URL: `https://logoless.io/api/paypal/webhook`
3. Tick these events: *Payment capture completed*, *Payment capture refunded*, *Payment capture reversed*, *Payment capture denied*, and under Payouts: *Payouts item succeeded, failed, blocked, denied, canceled, returned, refunded, unclaimed*.
4. Save, then copy the **Webhook ID** into `PAYPAL_WEBHOOK_ID`.

## 6. Test it

1. Open **Admin > System > Keys**. Run **PayPal connection** and **PayPal webhook**. Both should say OK.
2. As a brand, open **Funding** and add $10 with a sandbox buyer account (PayPal gives you one under Sandbox > Accounts). The balance should update.
3. As a clipper with earnings, open **Payouts**, type a sandbox PayPal email and withdraw $10.
4. When everything works, switch the keys to Live (step 3 on the Live toggle), set `PAYPAL_ENV` to `live`, create the webhook again on the live app and update `PAYPAL_WEBHOOK_ID`.

## How a payout is kept safe

* The money is taken off the clipper's balance in one step *before* anything is sent, so a double click cannot pay twice.
* PayPal is given the payout's own id as its batch id, so it can only ever be sent once.
* If PayPal clearly refuses, the money goes back on the clipper's balance. If PayPal does not answer at all, the payout is **held for an admin** instead of being returned, because it may have gone through. Check PayPal, then approve or decline it from **Admin > Payouts**.
* If PayPal later reports a payout failed or was returned, the webhook puts the money back on the balance.

## Notes

* Database columns that used to hold Stripe ids now hold PayPal ids (`topups.session_id` is the PayPal order id, `topups.payment_intent` is the capture id, `payouts.stripe_transfer_id` is the payout batch id). The names are old, the contents are PayPal. This avoids a risky database change.
* PayPal's own fees come out of the money brands pay in; the amount is stored per payment and shown in the admin logs as "PayPal costs".
