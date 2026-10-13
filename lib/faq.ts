import { SITE } from './site'

export type Faq = { q: string; a: string }

export const FAQ: Record<'Clippers' | 'Brands', Faq[]> = {
  Clippers: [
    {
      q: 'How do I get paid?',
      a: `Each campaign pays a set rate for every 1,000 verified views your approved clips get. Your earnings clear for ${SITE.holdDays} days, then you can withdraw them to your PayPal once your balance is $${SITE.minPayoutUsd} or more. Pick any PayPal email, press withdraw, and it is sent.`,
    },
    {
      q: 'Do I need a lot of followers?',
      a: "No. Campaigns pay for views, not audience size. A few campaigns add their own requirements, and they're listed in the brief.",
    },
    {
      q: 'Which platforms can I post on?',
      a: 'TikTok, YouTube (Shorts and longer videos) and Instagram Reels. Each campaign says which ones it accepts.',
    },
    {
      q: 'When do my views count?',
      a: "Once we've approved your clip against the brief, we look up its views on the platform and pay for the verified ones. We check again while the campaign is running.",
    },
    {
      q: 'Why was my clip rejected?',
      a: "Usually it broke a rule in the brief, used something that's off limits, or the views didn't look genuine. The reason is shown on the clip. If you think we got it wrong, email us and we'll take another look.",
    },
    {
      q: 'Does it cost anything to join?',
      a: 'No. Clippers never pay to join or to submit a clip.',
    },
  ],
  Brands: [
    {
      q: 'How does a campaign work?',
      a: "You write a brief and set a rate per 1,000 views and a budget. We read it, and once we've said yes you fund it and we launch it. Clippers join, post and submit, we check their clips and views, and you only pay for what's verified.",
    },
    {
      q: 'What does logoless cost?',
      a: `There's no subscription. Clippers keep everything a campaign pays them. Brands pay our ${SITE.platformFeePct}% fee on top of what clippers earn, so a $1,000 budget costs $${(1000 + (1000 * SITE.platformFeePct) / 100).toLocaleString()}. The pricing page has the full breakdown.`,
    },
    {
      q: 'How do you stop fake views?',
      a: "Our team reviews every clip and checks the view count on the platform itself, then checks again while the campaign runs. Views that don't look genuine are rejected and never paid for.",
    },
    {
      q: 'Can I turn down clips?',
      a: "Yes. If a clip isn't right for your campaign you can turn it down from your dashboard before it's paid. We handle the final approval and the payment.",
    },
    {
      q: 'How do I fund a campaign?',
      a: `Add money to your balance with PayPal on the funding page. Once we've approved your brief, the campaign budget plus our ${SITE.platformFeePct}% fee comes out of that balance and we launch it.`,
    },
    {
      q: 'Can I get unspent budget back?',
      a: 'Yes. If a campaign ends with budget left over, get in touch and we will refund it. The refund policy has the details.',
    },
  ],
}
