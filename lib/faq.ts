import { SITE } from './site'

export type Faq = { q: string; a: string }

export const FAQ: Record<'Clippers' | 'Brands', Faq[]> = {
  Clippers: [
    {
      q: 'How do I get paid?',
      a: `You earn a set rate for every 1,000 verified views your approved clips collect. Earnings clear into your balance and you withdraw to your bank through Stripe once you pass the $${SITE.minPayoutUsd} minimum.`,
    },
    {
      q: 'Do I need a certain number of followers?',
      a: 'No. Campaigns pay for views, not audience size. A few campaigns set their own requirements, and those are listed in the brief.',
    },
    {
      q: 'Which platforms can I post on?',
      a: 'TikTok, YouTube (Shorts and long-form) and Instagram Reels. Each campaign lists the platforms it accepts.',
    },
    {
      q: 'When do my views count?',
      a: 'After your clip is approved against the brief. Views are then re-checked on a schedule, and only verified views are paid.',
    },
    {
      q: 'Why was my clip rejected?',
      a: 'Usually because it broke a rule in the brief, used off-limits material, or the views showed signs of botting. You will see the reason on the submission and can resubmit a fixed version when the campaign allows it.',
    },
    {
      q: 'Is there a fee to join?',
      a: 'No. Clippers never pay to join logoless or to submit clips.',
    },
  ],
  Brands: [
    {
      q: 'How does a campaign work?',
      a: 'You set a budget, a rate per 1,000 views and a brief. Clippers join, post and submit. You pay only for views that pass our checks, and unspent budget stays yours.',
    },
    {
      q: 'What does logoless cost?',
      a: `There is no subscription. We take a ${SITE.platformFeePct}% platform fee on funds that are paid out to clippers. See the pricing page for the full breakdown.`,
    },
    {
      q: 'How do you stop fake views?',
      a: 'Every submission goes through automated bot detection, brief compliance checks and scheduled re-checks of live posts. Unclear cases go to a human moderator. Likely fraud is rejected and never paid.',
    },
    {
      q: 'Can I approve clips myself?',
      a: 'Yes. Choose automatic approval against your brief, manual review, or a mix. You can remove a clip at any time.',
    },
    {
      q: 'How do I fund a campaign?',
      a: 'Add funds to your balance by card or bank transfer through Stripe, then assign budget to a campaign. You can top up or pause whenever you like.',
    },
    {
      q: 'Can agencies manage several clients?',
      a: 'Yes. Use one brand workspace per client, each with its own budget and billing details.',
    },
  ],
}
