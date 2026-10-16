import { db } from './db'
import { discordIdFor } from './discord/link'
import { SITE } from './site'
import { isVerified } from './verification'

/**
 * Everything a creator needs to be ready to earn, in the order to do it. One list, used by the overview (the next step) and by the
 * Getting set up guide (all of them, each with how to do it). Anything skipped during sign-up lands here.
 */
export type SetupStep = {
  id: string
  title: string
  short: string
  why: string
  /** The few plain steps to do it. */
  how: string[]
  done: boolean
  href?: string
  cta?: string
  /** Not needed to start earning: it does not count towards "all set". */
  optional?: boolean
}

export async function creatorSetup(user: { id: string; email: string }): Promise<SetupStep[]> {
  const d = await db()
  const [v, profile, pay, subs, paid, discord] = await Promise.all([
    isVerified(user.id, user.email),
    d.prepare('SELECT bio, avatar_key, links_json FROM profiles WHERE user_id = ?1').bind(user.id).first<{ bio: string; avatar_key: string | null; links_json: string }>(),
    d.prepare('SELECT 1 AS x FROM settings WHERE key = ?1').bind(`paypal:${user.id}`).first(),
    d.prepare('SELECT COUNT(*) AS n FROM submissions WHERE user_id = ?1').bind(user.id).first<{ n: number }>(),
    d.prepare("SELECT COUNT(*) AS n FROM payouts WHERE user_id = ?1 AND status = 'sent'").bind(user.id).first<{ n: number }>(),
    discordIdFor(user.id),
  ])
  return [
    {
      id: 'verify',
      title: 'Confirm it is you',
      short: 'We email you a six digit code.',
      why: 'It proves the account is really yours. It keeps your earnings safe and stops anyone signing up as you.',
      how: ['Press “Send me a code”.', 'Open the email we send you.', 'Type the six digits here.'],
      done: v.verified,
    },
    {
      id: 'profile',
      title: 'Make your profile yours',
      short: 'Add a picture, a banner and a line about you.',
      why: 'Brands and other creators see this page, so it is worth two minutes. You can pick a ready-made look, or upload your own.',
      how: ['Open Profile.', 'Choose a look, or upload a picture and a banner.', 'Write a line about you and press Save.'],
      done: Boolean(profile?.avatar_key) || Boolean(profile?.bio?.trim()),
      href: '/dashboard/profile',
      cta: 'Edit profile',
    },
    {
      id: 'accounts',
      title: 'Link your accounts',
      short: 'The TikTok, YouTube or Instagram accounts you post from.',
      why: 'Linking lets us match your submissions to you. You choose whether they show on your public page.',
      how: ['Open Profile, then Linked accounts.', 'Pick a platform and paste the link to your account.', 'Choose whether it shows on your public page.'],
      done: Boolean(profile && profile.links_json !== '[]'),
      href: '/dashboard/accounts',
      cta: 'Link accounts',
    },
    {
      id: 'paypal',
      title: 'Add a PayPal email',
      short: 'This is where your earnings are sent.',
      why: "You can add a few and pick one each time you withdraw. We pay PayPal's fees on the withdrawal, so the whole amount is sent.",
      how: ['Open Earnings.', 'Under Withdraw, add a PayPal email you can sign in to.', 'Check it twice: we cannot recover a payout sent to a wrong address.'],
      done: Boolean(pay),
      href: '/dashboard/earnings#withdraw',
      cta: 'Add PayPal',
    },
    {
      id: 'discord',
      title: 'Connect Discord',
      short: 'Optional. Get your roles and your notifications in the server.',
      why: 'It is not needed to earn. If you use Discord, connecting it adds you to the logoless server and lets us message you there.',
      how: ['Open Settings and press Connect Discord.', 'Approve it on Discord’s own page.', 'You are added to the server with your role.'],
      done: Boolean(discord),
      href: '/dashboard/settings',
      cta: 'Connect Discord',
      optional: true,
    },
    {
      id: 'submission',
      title: 'Send your first submission',
      short: 'Pick a campaign, post your content, paste the link.',
      why: 'Every campaign has a brief, a rate per 1,000 views and rules. Read what is allowed, post on your own account, then paste the link on the campaign. We look at it and you see the result on your Submissions page.',
      how: ['Find a campaign and read its brief.', 'Post on your own account.', 'Open the campaign and paste the link to your post.'],
      done: (subs?.n ?? 0) > 0,
      href: '/',
      cta: 'Browse campaigns',
    },
    {
      id: 'paid',
      title: 'Get paid',
      short: `Withdraw once you have $${SITE.minPayoutUsd} available.`,
      why: `Approved views are paid at the campaign's rate. Earnings can be withdrawn as soon as they are confirmed. Nothing is ever taken out of what you earn.`,
      how: ['Open Earnings.', `Choose a PayPal email and press Withdraw (from $${SITE.minPayoutUsd}).`, 'Follow it from the withdrawals list.'],
      done: (paid?.n ?? 0) > 0,
      href: '/dashboard/earnings',
      cta: 'See earnings',
    },
  ]
}

/** The same idea for a brand: verify, add funds, make a first campaign. */
export async function brandSetup(user: { id: string; email: string }): Promise<SetupStep[]> {
  const d = await db()
  const [v, funded, camp, discord] = await Promise.all([
    isVerified(user.id, user.email),
    d.prepare("SELECT 1 AS x FROM ledger WHERE user_id = ?1 AND account = 'brand' AND kind = 'topup' LIMIT 1").bind(user.id).first(),
    d.prepare('SELECT 1 AS x FROM campaigns WHERE brand_user_id = ?1 LIMIT 1').bind(user.id).first(),
    discordIdFor(user.id),
  ])
  return [
    {
      id: 'verify',
      title: 'Confirm it is you',
      short: 'We email you a six digit code.',
      why: 'It proves the account is really yours, and keeps your balance safe from anyone signing up as you.',
      how: ['Press “Send me a code”.', 'Open the email we send you.', 'Type the six digits here.'],
      done: v.verified,
    },
    {
      id: 'funds',
      title: 'Add funds',
      short: 'One balance pays for every campaign.',
      why: `Creators are paid out of your balance as they earn, up to each campaign's budget cap. A ${SITE.platformFeePct}% fee is added on top and shown before you start. You can add from $${SITE.minTopUpUsd}.`,
      how: ['Open Balance.', 'Press Add funds and choose an amount.', 'Pay with PayPal. The whole amount is credited to your balance.'],
      done: Boolean(funded),
      href: '/brand/balance',
      cta: 'Add funds',
    },
    {
      id: 'campaign',
      title: 'Make your first campaign',
      short: 'A brief, a rate per 1,000 views and a budget cap.',
      why: 'Say what you want made, which platforms count and what is off limits. A person on our team reads every new campaign before it goes live.',
      how: ['Open Campaigns and press New campaign.', 'Write the brief and set the rate and the budget cap.', 'Send it. Once it has been read and your balance covers the start, it goes live.'],
      done: Boolean(camp),
      href: '/brand/campaigns/new',
      cta: 'New campaign',
    },
    {
      id: 'discord',
      title: 'Connect Discord',
      short: 'Optional. Get your notifications in the server.',
      why: 'It is not needed to run a campaign. If you use Discord, connecting it adds you to the logoless server and lets us message you there.',
      how: ['Open Settings and press Connect Discord.', 'Approve it on Discord’s own page.', 'You are added to the server with your role.'],
      done: Boolean(discord),
      href: '/brand/settings',
      cta: 'Connect Discord',
      optional: true,
    },
  ]
}
