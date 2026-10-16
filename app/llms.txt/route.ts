import { SITE } from '@/lib/site'

/** A short plain-text summary for AI search tools, like robots.txt but for readers rather than crawlers. */
export function GET() {
  const body = `# ${SITE.name}

> ${SITE.name} is a marketplace where people who cut short clips get paid for the views those clips earn. Brands, artists and streamers fund a campaign and set a rate per 1,000 views. Clippers post on their own TikTok, YouTube or Instagram accounts. A person on the team reviews every clip and checks the view counts before anything is paid.

## Pages
- [Campaigns](${SITE.url}/): every live campaign
- [For creators](${SITE.url}/for-creators): how creators earn
- [For brands](${SITE.url}/for-brands): how to launch a campaign
- [Pricing](${SITE.url}/pricing): no subscription, clippers keep everything they earn, brands pay a ${SITE.platformFeePct}% fee on top of payouts, $${SITE.minPayoutUsd} minimum payout, paid out with PayPal
- [About](${SITE.url}/about)
- [Case studies](${SITE.url}/case-studies)
- [Questions](${SITE.url}/faq)
- [Contact](${SITE.url}/contact)
- [Legal](${SITE.url}/legal): terms, privacy and policies

## Facts
- Clippers pay nothing to join or submit.
- Brands pay a budget up front and are only charged for verified views.
- Payouts need a balance of $${SITE.minPayoutUsd} or more.
`
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}
