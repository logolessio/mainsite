import { SITE } from './site'

export type Faq = { q: string; a: string }

const fee = SITE.platformFeePct
const example = (1000 + (1000 * fee) / 100).toLocaleString()

export const FAQ: Record<'Clippers' | 'Brands' | 'Money' | 'Account', Faq[]> = {
  Clippers: [
    {
      q: 'How do I get paid?',
      a: `Each campaign pays a set rate for every 1,000 verified views your approved clips get. As soon as an earning is confirmed it is yours to withdraw to your PayPal, once your balance is $${SITE.minPayoutUsd} or more. Pick any PayPal email, press withdraw, and it is sent. We pay PayPal's fees, so the full amount arrives.`,
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
      a: "Once we've approved your clip against the brief, we look up its views on the platform and pay for the verified ones. We check again while the campaign is running, so a clip that keeps growing keeps earning.",
    },
    {
      q: 'How do I prove an account is mine?',
      a: "Add the account to your profile, press Verify, and put the short code we give you in that account's bio. We read its public page to see the code, or for a site that will not let us (Instagram, for example) a person on our team checks it by hand. A verified account gets a tick on your public page, and clips from it can be approved automatically. Clips from other accounts are looked at by a person. You can take the code out of your bio once you are verified.",
    },
    {
      q: 'Why was my clip rejected?',
      a: "Usually it broke a rule in the brief, used something that's off limits, or the views didn't look genuine. The reason is shown on the clip. If you think we got it wrong, ask for a person to look again from the clip page.",
    },
    {
      q: 'Does it cost anything to join?',
      a: 'No. Clippers never pay to join or to submit a clip, and the platform fee is never taken from what you earn.',
    },
    {
      q: 'How do I start?',
      a: 'Sign up, pick a username and a picture, and you land in your dashboard. The Getting set up page there walks you through the rest: link the accounts you clip from, add a PayPal email and open a campaign you like.',
    },
    {
      q: 'Can I clip for more than one campaign at once?',
      a: 'Yes, as many as you like. Each clip is for one campaign. If you post the same moment for two campaigns, submit it to both, as long as each brief allows it.',
    },
    {
      q: 'What happens if a campaign runs out of budget?',
      a: 'Views are paid until the campaign budget is used up. When it is nearly gone you will see it on the campaign, and clips submitted after it ends are not paid.',
    },
    {
      q: 'Can I use music or footage from the campaign?',
      a: 'Use what the brief gives you and nothing it forbids. The campaign page lists what is provided and what is off limits. When in doubt, ask before you post.',
    },
    {
      q: 'Do I have to show my accounts on my profile?',
      a: 'No. You choose whether your clipping accounts are public. Brands only ever see the handle and the links of the clips you submit to their campaign.',
    },
    {
      q: 'What are badges?',
      a: 'Small marks beside your name for things you have done: your first clip, your first payday, a million views. Most are plain black and white. The legendary ones are gold and in colour, and only a few people will ever have them.',
    },
    {
      q: 'How long does a clip take to be checked?',
      a: 'Most are checked within seconds. Anything that needs a person is looked at as soon as we can, usually within a day. You are told when it is decided.',
    },
    {
      q: 'Can I delete a clip I submitted?',
      a: 'You can ask us to remove it from a campaign. Views already paid for stay paid. Contact us from the clip page and we will do it.',
    },
  ],
  Brands: [
    {
      q: 'How does a campaign work?',
      a: "You add money to your account once, then start a campaign with a brief, a rate per 1,000 views and a budget cap. Clippers join, post and submit. We check their clips and views, and you only pay for what's verified. The money comes out of your account balance as clippers earn it.",
    },
    {
      q: 'What does logoless cost?',
      a: `There's no subscription. Clippers keep everything a campaign pays them. Brands pay our ${fee}% fee on top of what clippers earn, so $1,000 of payouts costs $${example}. We also pay PayPal's fees on your deposit, so every dollar you add is a dollar you can spend. The pricing page has the full breakdown.`,
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
      q: 'How do I add money?',
      a: "Open Balance in your dashboard and press Add funds. Pay with PayPal and the whole amount lands in your account straight away. It is one balance for all your campaigns, not a pot per campaign.",
    },
    {
      q: 'Can I get unspent money back?',
      a: 'Yes. Money you have not spent stays in your balance, and you can ask for it back at any time. See the refund policy for how it works.',
    },
    {
      q: 'Do I have to fund each campaign separately?',
      a: "No. You keep one balance and every campaign draws from it as clippers earn. Each campaign has a budget cap, so one campaign can never spend more than you decided.",
    },
    {
      q: 'Can I pause a campaign?',
      a: 'Yes, any time, from the Campaigns page. A paused campaign stops accepting clips and stops spending. Start it again when you are ready. Nothing is lost.',
    },
    {
      q: 'Can I move money between campaigns?',
      a: 'Yes. Raise the budget cap on one campaign and lower it on another. The money was never locked into a campaign, so there is nothing to transfer, just caps to change.',
    },
    {
      q: 'What happens if my balance runs out?',
      a: 'Your campaigns pause by themselves before they would overspend, and we tell you. Add funds and start them again. Clippers are never left unpaid for clips we already approved.',
    },
    {
      q: 'How fast can I launch?',
      a: 'Write the brief, set the rate and the cap, and press start. If your balance covers it and the brief is fine, it can be live in minutes. A person reads every new brief first.',
    },
    {
      q: 'Who owns the clips?',
      a: 'The clippers post them on their own accounts. You get the right to use the clips for the campaign as the brand terms describe. The brand terms page has the details.',
    },
    {
      q: 'Will I get an invoice?',
      a: 'Every deposit and every spend is listed in your balance history, and PayPal sends its own receipt for each deposit. Ask us if you need a formal invoice.',
    },
  ],
  Money: [
    {
      q: 'Who pays PayPal fees?',
      a: "We do. PayPal charges for taking a payment and for sending one. We cover both, in full, on every deposit and every withdrawal. Brands are credited what they add, and clippers receive what they withdraw.",
    },
    {
      q: `What is the ${fee}% fee?`,
      a: `It is how logoless is paid. Brands pay ${fee}% on top of what clippers earn, so $1,000 of payouts costs $${example}. It is never taken out of a clipper's earnings.`,
    },
    {
      q: 'How long until I can withdraw?',
      a: `Earnings are available the moment they are confirmed, and you can withdraw once your balance reaches $${SITE.minPayoutUsd}.`,
    },
    {
      q: 'Can I be paid to more than one PayPal email?',
      a: 'Yes. Add as many emails as you like under Earnings and pick the one to send each withdrawal to.',
    },
    {
      q: 'Which currency is used?',
      a: 'Everything is in US dollars. If your PayPal account uses another currency, PayPal converts it when it arrives.',
    },
    {
      q: 'Why was my withdrawal held for review?',
      a: 'Large withdrawals, or ones that look unusual, are checked by a person first. It is a safety step to protect everyone. You are told when it is sent.',
    },
    {
      q: 'What if I typed the wrong PayPal email?',
      a: 'Write to us straight away. If the payment has not been sent we can stop it. Once PayPal has sent it we cannot get it back, so check the address before you press withdraw.',
    },
    {
      q: 'Do you handle taxes?',
      a: 'You are responsible for the tax on your earnings. We may collect tax details and report payments where the law requires it.',
    },
    {
      q: 'Is my money safe?',
      a: 'Payments and payouts go through PayPal, so we never see your card or bank details. Every movement is recorded in a ledger. The balance you see on logoless is our record of what you have added and earned: it is not a bank account and it is not insured. The Payments & Payouts policy has the details.',
    },
  ],
  Account: [
    {
      q: 'How do I sign in?',
      a: 'With Google, Discord, or your email and a password. For email sign-in we send a six digit code the first time to prove the address is yours.',
    },
    {
      q: 'Why do I need to verify a code?',
      a: 'It proves the address or account is really yours, so nobody can sign up as you or take over your earnings. Signing in with Discord counts as verified already.',
    },
    {
      q: 'How do I change my username or picture?',
      a: 'Open your dashboard, then Profile. Change the picture, banner, colours and name there. Your username can be changed from the same page.',
    },
    {
      q: 'Can I be a clipper and a brand with one account?',
      a: 'Yes. Your account can open both dashboards, the clipper one and the brand one. Your earnings and your brand balance are kept apart.',
    },
    {
      q: 'How do I delete my account?',
      a: 'Open Settings in your dashboard and choose delete account. You have a few days to change your mind. Money you are owed has to be withdrawn first, and records we are required to keep stay without your name.',
    },
    {
      q: 'What happens to my data?',
      a: 'We keep only what we need to run your account and to pay you. The privacy policy lists it all, and you can ask us for a copy or for removal.',
    },
    {
      q: 'How do I report someone or something?',
      a: 'Use the report page. You can pick a ready-made reason or write your own. It goes straight to a person on the team, no email needed.',
    },
    {
      q: 'How do I contact you?',
      a: 'Send a message from the contact page. It reaches the team inside the site, and we answer there and by notification. You can also email us if you prefer.',
    },
    {
      q: 'Why was my account restricted?',
      a: "Usually because something looked like fake views or a broken rule. You will be told why. If you think it's a mistake, tell us and a person will look at it.",
    },
    {
      q: 'I signed up with Discord and have no email. Can you still reach me?',
      a: 'If you connect Discord, the logoless bot can send your notifications to you there as messages.',
    },
  ],
}
