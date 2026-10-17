# Claims review (October 16, 2026)

This is a check of what the site says against what the product actually does and what the Terms say. It is not legal advice, and nobody can guarantee a site will never be sued. Have a lawyer read the Terms, Privacy Policy and the points under "Only you or a lawyer can fix" before launch.

## How the product really works (the facts every claim has to match)

- Earnings can be withdrawn as soon as they are confirmed. There is no hold period (`SITE.holdDays = 0`).
- Withdraw from $10 to a PayPal email. Large or unusual withdrawals are checked by a person first.
- Brands add funds with PayPal, from $10 to $10,000 at a time. The 15% fee is charged to the brand on top of what creators earn. We pay PayPal's fees on deposits and withdrawals. PayPal may still convert currencies.
- A person reads every new campaign before it goes live.
- When a submission arrives it gets an automatic first look (is it a real, public post on the right platform). Anything unclear waits for a person.
- **Views are now looked up automatically about every two hours for YouTube and TikTok** while a campaign is running (a cron every 30 minutes; each submission is only looked at once it is due). Increases are paid through the same step a person uses, so budgets, caps and the campaign ending apply. A jump of more than three times the verified views (and over 20,000), or a video posted before the campaign started, is **not** paid: a person is asked to look. Checking stops when the campaign ends. **Instagram cannot be looked up**, so Instagram views are still confirmed and set by a person. The switch is under Platform settings. TikTok is read from its public video page, which TikTok can change or block, so it is best effort.
- **Accounts are proven by a code in the bio.** A creator links TikTok, YouTube or Instagram, gets a code, puts it in the bio, and the site reads the public page to find it (a person checks by hand when a site will not let us, which is usually Instagram). With the switch on (Platform settings), the automatic first look only approves a clip from a verified account; clips from any other account wait for a person. The Terms, Privacy Policy and FAQ say this.
- A declined submission can be sent for a human review once, before anything has been paid for it, from the Submissions page. There is no 14 day window.
- Brands can turn a submission down before it is paid. Unspent budget stays in the balance and a refund to PayPal is done on request, by a person.
- There is no cookie banner and no analytics cookies. Page views are logged on our own servers with a hashed IP address.

## Fixed in the code (the text was not one of your edits)

- Terms, Payments, Brand Terms, Creator Terms, Campaign Rules, Cookie Policy, Do Not Sell and Refunds now say what the product does. The old versions mentioned a pending/verification period, a $10 and a $100 minimum top-up at the same time, "card or bank transfer", a 14 day appeal window, a cookie banner, Global Privacy Control handling and advertising technologies, none of which exist.
- Discord is now described: signing in with or connecting Discord lets the bot add you to the server and give you roles. Only the Discord ID is kept.
- The numbers (fee, minimum payout, minimum top-up, dispute window) come from one place (`lib/site.ts`) so the Terms, FAQ and pages cannot drift apart.
- FAQ answers that said the money is "checked against what PayPal reports", that the Discord bot sends "codes" so you never need an email, and "nothing more" about data were reworded to be accurate. "Is my money safe?" now says plainly that a logoless balance is not a bank account and is not insured.
- The fee promise, the pricing description and a few app messages no longer say "safe" or "arrives" where they could mean more than we promise.

## Your edited sentences that conflict with the product or the Terms

I did not change any of these, because you asked me not to touch what you edited. Each one is a claim a regulator or an unhappy customer could point at. Tell me which to replace (or say "do them all") and I will apply the suggested wording.

| Where | What it says now | Problem | Suggested wording |
| --- | --- | --- | --- |
| FAQ, "When do my views count?" | "We check again every 2 hours while the campaign is running… we automatically check and you get paid for it" | True for YouTube and TikTok now. Not true for Instagram (a person sets those). |  "Once we have approved your submission against the campaign rules, our team checks its views on the platform and you are paid for the verified ones. We check again while the campaign is running, so a submission that keeps growing can keep earning." |
| FAQ, "How do you stop fake views?" | "Our automatic system reviews every submission and checks the view count on the platform itself…" | Close to true for YouTube and TikTok; Instagram views are set by a person. | "Every submission gets an automatic first look, and our team checks the view count on the platform itself, then checks again while the campaign runs. Views that don't look genuine are rejected and never paid for. Creators can ask for a person to look again at a rejected submission." |
| FAQ, "What is the 15% fee?" | "Brands pay 15% on top of what creators earn per withdraw" | The fee is added when a creator earns, not at withdrawal. | "…Brands pay 15% on top of what creators earn…" (drop "per withdraw") |
| FAQ, "How do I add money?" | "We cover submissions leaving Logoless, not entering." | Unclear, and it reads like a promise about PayPal fees. | "We pay PayPal's fees on every deposit." |
| FAQ, review time | "…usually accepted within a day or two" | "Accepted" promises the outcome. | "…usually looked at within a day or two" |
| For brands | "Not only do we offer far cheaper rates compared to other sites" | A comparison to competitors with no evidence is the kind of claim that gets advertisers in trouble. | "We charge no subscription and no deposit fee, and we cover PayPal's fees." |
| For brands | "Your funds are safe with us" | An absolute promise, and the Terms say balances are not insured. | "Your balance is kept in a ledger, and payments go through PayPal." |
| For brands | "Never pay for 'empty views' again." | A guarantee. The Terms say we do not guarantee results. | "You only pay for views we have verified." |
| For brands | "Our creators post exactly what you described and get paid for their views. Your media gets the views it deserves." | Promises exact compliance and results. | "Creators post to your brief and are paid for views we verify." |
| For brands | "You can add, remove, edit and withdraw your funds whenever you like." | Refunds are on request and handled by a person. | "You can add funds whenever you like, and ask for unspent money back." |
| For brands | "…rules and regulations that our team will thoroughly enforce." | We cannot promise enforcement. | "…rules that our team will check submissions against." |
| For creators | "We cover ALL PayPal transaction fees" and, on Pricing, "We fully cover all transaction fees" | PayPal can still charge currency conversion, and the Terms say so. | "We cover PayPal's fees on every deposit and withdrawal." |
| For creators | "…get paid as soon and as frequently as you like." | Timing depends on PayPal, your country and the review of large withdrawals. | "…withdraw whenever you like, from $10. Timing depends on PayPal." |

## Only you or a lawyer can fix

- **The company.** `lib/site.ts` still says "Logoless Inc." with the address "[Registered business address]" (both marked TODO). The Terms now leave the address out while it is a placeholder, but the entity name has to be a real registered company, and the governing-law clause refers to "the jurisdiction in which the company is registered".
- **DMCA.** The Copyright page says to send notices to a "designated agent". To get the legal protection that goes with that, the agent has to be registered with the US Copyright Office.
- **Terms of a stored balance.** Holding balances for brands and creators can count as money transmission or stored value in some places. The Terms now say a balance is not a bank account and is not insured, but a lawyer should say whether you need more (for example PayPal's own rules for marketplaces).
- **Age.** The Terms require users to be 16. Sign-up now asks people to confirm they are 16 or older when they agree to the Terms, but nothing verifies it.
- **Tax and consumer rules** for each country you launch in.
