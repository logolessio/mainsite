import { SITE } from './site'

export type Faq = { q: string; a: string }

const fee = SITE.platformFeePct
const example = (1000 + (1000 * fee) / 100).toLocaleString()

export const FAQ: Record<'Creators' | 'Brands' | 'Money' | 'Account', Faq[]> = {
  Creators: [
    {
      q: 'How do I get paid?',
      a: `Each campaign pays a set rate for every 1,000 views you content gets. Your earnings clear instantly, then you can withdraw them to your PayPal once your balance is $${SITE.minPayoutUsd} or more. Add your PayPal email in your dashboard to withdraw. We pay PayPal's transaction fees, so the full amount arrives straight into your pocket.`,
    },
    {
      q: 'Do I need a lot of followers?',
      a: "No. Campaigns pay for views, not audience size. A few campaigns add their own requirements, and they're listed in the brief. Of-course having followers will mean its easier to get views but everyone has to start somewhere and this is a great way to get paid even if you aren't that big at the moment.",
    },
    {
      q: 'Which platforms can I post on?',
      a: 'TikTok, YouTube (Shorts and longer videos) and Instagram Reels. Each campaign says which ones it accepts. We are also planning to add more platforms as this site develops (please remind me to update this if it becomes outdated, thx).',
    },
    {
      q: 'When do my views count?',
      a: "Once we've approved your clip against the description and requirements of the campaign, we look up its views on the platform and pay for the verified ones. We check again every 2 hours while the campaign is running, so a clip that keeps growing keeps earning. This also means you can submit your clip just after you post it (at zero views), if it gains views, we automatically check and you get paid for it (we will notify you).",
    },
    {
      q: 'How do I prove an account is mine?',
      a: "Add the account to your profile, press Verify, and put the short code we give you in that account's bio. We read its public page to see the code, or for a site that will not let us (Instagram, for example) a person on our team checks it by hand. A verified account gets a tick on your public page, and clips from it can be approved automatically. Clips from other accounts are looked at by a person. You can take the code out of your bio once you are verified.",
    },
    {
      q: 'Why was my submission rejected?',
      a: "Usually it broke a rule in the campaign rules or description, used something that's off limits, or the views didn't look genuine. The reason is shown on the clip. If you think we got it wrong, you can request for a member of staff to review it in your dashboard (in the 'submissions' page).",
    },
    {
      q: 'Does it cost anything to join?',
      a: "Of course not. Creators never pay to join or to submit a clip, and the platform fee is never taken from what you earn (that's what makes us awesome).",
    },
    {
      q: 'How do I start?',
      a: 'Sign up, pick a username and create your profile, and you land in your dashboard. The Getting set up page there walks you through the rest: linking the accounts you upload from, setting up payouts with PayPal and picking a campaign you like.',
    },
    {
      q: 'Can I clip for more than one campaign at once?',
      a: 'Yes, as many as you like. You can also submit as many times as you like for each campaign (some may have restrictions, please check). We encourage to join as many campaigns as you can as that will maximize your earnings.',
    },
    {
      q: 'What happens if a campaign runs out of budget?',
      a: "Views are paid until the campaign budget is used up. When it's nearly gone you will receive a notification, and submissions stop earning money once there is no more money left. You will receive a full summary of the campaign once it ends through your preferred method of contact (discord, email, etc...).",
    },
    {
      q: 'What music or footage do I use in my campaign?',
      a: "Use what the brief gives you and nothing it forbids. All details for what you should and shouldn't include in your submission can be seen in the campaign details. Also follow the general campaign rules.",
    },
    {
      q: 'Do I have to show my accounts on my profile?',
      a: 'No. You choose whether your linked accounts are public. Brands only ever see the handle and the links of the clips you submit to their campaign. You can choose what is seen on your profile within your dashboard.',
    },
    {
      q: 'What are badges?',
      a: 'These are the small icons next to your name on your profile. There are a variety of different ones you can get, ranging in rarity, quality and colour. You can view all your badges in your dashboard.',
    },
    {
      q: 'How long does a submission take to be checked?',
      a: 'Most are checked within seconds. Any submissions that need human review are usually accepted within a day or two. We try to be as quick as we can with these reviews but please be patient.',
    },
    {
      q: 'Can I delete a submission?',
      a: 'You can ask us to remove it from a campaign. Views already paid for stay paid. Contact us from the submissions page and we will do it.',
    },
  ],
  Brands: [
    {
      q: 'How does creating a campaign work?',
      a: "You add as much money to your account as you like, whenever you like, then start a campaign with rules and a description, a rate per 1,000 views and a budget cap. Creators join, post and submit. We check their clips and views through human and automatic processes, and you only pay for what's verified. The money comes out of your account balance as creators earn it.",
    },
    {
      q: 'What does logoless cost?',
      a: `There's no subscription or sign up fees for creators. Creators keep everything a campaign pays them. Brands pay our ${fee}% fee on top of what creators earn, so $1,000 of payouts costs $${example}. We also pay PayPal's fees on your deposit, so every dollar you add is a dollar you can actually spend. The pricing page has the full breakdown so check that out.`,
    },
    {
      q: 'How do we stop fake views?',
      a: "Our automatic system reviews every submission and checks the view count on the platform itself, then checks again while the campaign runs. Views that don't look genuine are rejected and never paid for. Creators do have the right to request a human opinion on rejected submissions.",
    },
    {
      q: 'Can I turn down submissions?',
      a: "Yes. If a submission isn't right for your campaign you can turn it down from your dashboard before it's paid. We handle the final approval and the payment.",
    },
    {
      q: 'How can I add funds to my account?',
      a: "Open Balance in your dashboard and press Add funds. Pay with PayPal and the whole amount lands in your account straight away. It is one balance for all your campaigns, not a pot per campaign. We cover submissions leaving Logoless, not entering.",
    },
    {
      q: 'Can I get unspent money back?',
      a: 'Yes. Money you have not spent stays in your balance, and you can ask for it back at any time. See the refund policy for how it works.',
    },
    {
      q: 'Do I have to fund each campaign separately?',
      a: "No. You keep one balance and every campaign draws from it as creators earn. Each campaign has a budget cap, so one campaign can never spend more than you decided.",
    },
    {
      q: 'Can I pause a campaign?',
      a: 'Yes, any time, from the Campaigns page. A paused campaign stops accepting submissions and stops spending and distributing money. Start it again when you are ready. No money is lost during this process.',
    },
    {
      q: 'Can I move money between campaigns?',
      a: 'Yes. Raise the budget cap on one campaign and lower it on another. Your money is never locked into a campaign, so there is nothing to transfer, just caps to change.',
    },
    {
      q: 'What happens if my balance runs out?',
      a: 'Your campaigns pause by themselves before they would overspend, and we tell you. Add funds and start them again. Creators are never left unpaid for clips we already approved.',
    },
    {
      q: 'How fast can I launch?',
      a: 'Write the brief, set the rate and the cap, and press start. If your balance covers it and the brief is fine, it can be live in minutes. A person reads every new brief and approves the campaign first.',
    },
    {
      q: 'Who owns the submissions?',
      a: 'The creators post them on their own accounts. You get the right to use the clips for the campaign as the brand terms describe. The brand terms page has the details.',
    },
    {
      q: 'Will I get an invoice?',
      a: 'Every deposit and every spend is listed in your balance history, and PayPal sends its own receipt for each deposit. Ask us if you need a formal invoice.',
    },
  ],
  Money: [
    {
      q: 'Who pays PayPal fees?',
      a: "We do. PayPal charges for taking a payment and for sending one. We cover both, in full, on every deposit and every withdrawal. Brands are credited what they add, and creators receive what they withdraw.",
    },
    {
      q: `What is the ${fee}% fee?`,
      a: `It is how Logoless is paid. Brands pay ${fee}% on top of what creators earn per withdraw, so $1,000 of payouts costs $${example}. It is never taken out of a creators earnings.`,
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
    {
      q: 'Can I use the site with a keyboard or a screen reader?',
      a: `Yes. Everything can be reached and used with a keyboard. Press ? on any page to see the shortcuts that work there, for example g then a letter to go to a page, j and k to move through lists, and / to search. In Settings, under Display, you can switch on less motion, larger text, higher contrast and underlined links. If something is hard to use, tell us at ${SITE.emails.support} and we will look at it. There is more on the Accessibility page.`,
    },
  ],
}
