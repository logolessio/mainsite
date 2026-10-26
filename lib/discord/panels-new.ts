import type { Message } from './api'
import { chan } from './ui'
import { BETA_ONBOARDING } from '../beta-host'
import { LEGAL_LINKS } from '../site'
import { item, panel, pbtn, plink } from './look'
import { FAQ_PICKS, REASONS } from './support-menu'
import { selectRow } from './v2'

/**
 * The welcome and setup messages in the site's look (see look.ts): the rules, the get-started message, the accounts and payments panels, the support card and the
 * answer to the Get started button. `notice` is the line that says the service is not live yet (null once it is), so a panel posted before the launch carries it.
 * No emoji: the picture in front of each heading is one of the gradient icons.
 */

export function rulesPanel(links: { rules: string; support: string; getStarted: string; guildId: string }): Message {
  const ask = links.guildId && links.support ? `<#${links.support}>` : 'a ticket'
  return panel({
    banner: true,
    icon: 'scroll',
    title: 'Server rules',
    sub: `By joining you agree to follow these rules. Breaking them can lead to a warning, a mute, a kick or a ban. Not sure about something? Ask a staff member or open a ticket in ${ask}.`,
    blocks: [
      item('users', 'Be decent', 'No harassment, hate or threats.'),
      item('shield', 'Keep views real', 'No botting, buying or faking views.'),
      item('book', 'Follow each campaign’s brief', 'The brief is the rule for that campaign.'),
      item('flag', 'No spam, ads or scams', 'The team never DMs you first.'),
      item('lock', 'Keep private things private', 'Other people’s details stay theirs.'),
      item('hash', 'Use the right channel', 'Problems go in a ticket.'),
      item('scroll', 'Staff decisions stand', 'Think we got it wrong? Open a ticket and we will look again.\n-# Discord’s Terms of Service and Community Guidelines apply too.'),
    ],
    buttons: [plink('Terms', LEGAL_LINKS[0].href, 'scroll'), plink('Campaign rules', LEGAL_LINKS[4].href, 'book'), ...(links.guildId && links.support ? [plink('Support', chan(links.guildId, links.support), 'help')] : [])],
  })
}

/** The message in #get-started: the one thing a new member can see. While the site is closed it leads to the sign-up; once it is open, to the first steps. */
export function welcomePanel(links: { rules: string; guildId: string }, notice: string | null): Message {
  if (notice) {
    return panel({
      banner: true,
      icon: 'logo',
      title: 'Welcome to logoless',
      sub: 'Get paid for the views your edits earn. Artists and brands post campaigns here first, so be here early.',
      notice,
      blocks: [
        item('user', 'Sign up', 'Sign in with Discord, add your name and username, and your PayPal if you like. It takes about a minute.'),
        item('verified', 'Get verified', 'You come back here as a Verified member, and the rest of the server opens up.'),
        item('founder', 'Founding member', 'Everyone who signs up before we open is a founding member, and keeps that status for good.'),
        item('link', 'Link your accounts', 'Prove your TikTok, YouTube or Instagram with a code in your bio. Verified creators are picked first for campaigns.'),
      ],
      buttons: [plink('Sign up', BETA_ONBOARDING, 'arrow'), plink('Terms', LEGAL_LINKS[0].href, 'scroll'), plink('Privacy', LEGAL_LINKS[1].href, 'lock')],
    })
  }
  const rules = links.guildId && links.rules ? [plink('Rules', chan(links.guildId, links.rules), 'scroll')] : []
  return panel({
    banner: true,
    icon: 'logo',
    title: 'Welcome to logoless',
    sub: 'Join campaigns from artists, streamers and brands. Post your content and get paid for every 1,000 verified views.',
    blocks: [
      item('link', 'Link your accounts', 'Connect the TikTok, YouTube or Instagram you post from, and prove it is yours with a code in your bio.'),
      item('wallet', 'Add PayPal', 'Tell us where to pay you. We cover PayPal’s fees.'),
      item('campaign', 'Join campaigns', 'Pick a campaign, post your edit and submit the link. You are paid for every 1,000 verified views.'),
    ],
    buttons: [pbtn('Get started', 'start:go', 'green', 'sparkles'), ...rules],
  })
}

/** What the Get started button answers while the site is closed. `member` is set once the person has finished the sign-up (or is waiting for a look). */
export function preLaunchPanel(end: number | null, member?: { n: number | null; held: boolean; founding?: boolean }): Message {
  if (member?.n) {
    return panel({
      icon: 'verified',
      title: member.founding === false ? 'You are verified' : `You are founding member #${member.n}`,
      sub: 'The rest of the server is open to you.',
      blocks: [item('link', 'Link an account', 'Prove your TikTok, YouTube or Instagram, so verified creators like you are picked first when campaigns start.')],
      buttons: [pbtn('Link an account', 'acct:link', 'green', 'link'), pbtn('Add PayPal', 'pay:link', 'grey', 'wallet')],
    })
  }
  if (member?.held) {
    return panel({
      icon: 'clock',
      title: 'Your sign-up is being checked',
      sub: 'We look at a few sign-ups by hand to keep bots out.',
      blocks: [item('verified', 'What happens next', 'You get the Verified role, and a message from us here, as soon as yours is cleared.')],
      buttons: [plink('Open my sign-up', BETA_ONBOARDING, 'arrow')],
    })
  }
  return panel({
    icon: 'door',
    title: end ? 'logoless opens soon' : 'You are early',
    sub: end ? `The doors open <t:${end}:F> (<t:${end}:R>). There are no campaigns yet: we are gathering our founding members first.` : 'The site opens soon. There are no campaigns yet: we are gathering our founding members first.',
    blocks: [
      item('user', 'Sign up', 'Sign in with Discord, add a profile and, if you like, your PayPal.'),
      item('verified', 'Get verified', 'You come straight back here as a Verified member, and the server opens.'),
      item('link', 'Link your accounts', 'Prove your TikTok, YouTube or Instagram. Verified creators come first.'),
    ],
    buttons: [plink('Sign up', BETA_ONBOARDING, 'arrow'), pbtn('Link an account', 'acct:link', 'grey', 'link'), pbtn('Add PayPal', 'pay:link', 'grey', 'wallet')],
  })
}

export const accountsPanel = (notice: string | null): Message =>
  panel({
    icon: 'users',
    title: 'Manage your accounts',
    sub: 'Set up the accounts you post from, and check or remove them any time.',
    notice,
    blocks: [
      item('user', notice ? 'Sign up' : 'Make an account', notice ? 'No account yet? Sign up on the site: it takes about a minute, and you come back here verified.' : 'No account yet? Make one here with an emailed code.'),
      item('link', 'Link an account', 'Connect your TikTok, YouTube or Instagram, and prove it is yours with a code in your bio.'),
      item('book', 'Manage accounts', 'See what you have linked, check it or remove it.'),
    ],
    buttons: [pbtn('Link an account', 'acct:link', 'green', 'link'), pbtn('Manage accounts', 'acct:manage', 'grey', 'book'), notice ? plink('Sign up', BETA_ONBOARDING, 'arrow') : pbtn('Make an account', 'acct:join', 'grey', 'user')],
  })

export const paymentsPanel = (notice: string | null): Message =>
  notice
    ? panel({
        icon: 'wallet',
        title: 'Manage your payment details',
        sub: 'Add the PayPal email you want to be paid at, so you are ready from your very first campaign.',
        notice,
        blocks: [
          item('paypal', 'Link a payment method', 'Add your PayPal email. A new address is confirmed with a code we email to your account, so nobody else can add one.'),
          item('book', 'Manage payment methods', 'View and remove the PayPal emails you can be paid at. There is nothing to withdraw until campaigns start.'),
        ],
        buttons: [pbtn('Link a payment method', 'pay:link', 'green', 'paypal'), pbtn('Manage payment methods', 'pay:manage', 'grey', 'book')],
      })
    : panel({
        icon: 'wallet',
        title: 'Manage your payment details',
        sub: 'Add PayPal, check your balance and withdraw. A new PayPal address is confirmed with a code we email to your account, so nobody else can add one.',
        notice,
        blocks: [
          item('paypal', 'Link a payment method', 'Add your PayPal email.'),
          item('book', 'Manage payment methods', 'View and remove the PayPal emails you can be paid at.'),
          item('money', 'Check your balance', 'See what you can withdraw.'),
          item('wallet', 'Withdraw', 'Send your earnings to your PayPal.'),
        ],
        buttons: [pbtn('Link a payment method', 'pay:link', 'green', 'paypal'), pbtn('Manage payment methods', 'pay:manage', 'grey', 'book'), pbtn('Check balance', 'pay:balance', 'blurple', 'money'), pbtn('Withdraw', 'wd:start', 'grey', 'wallet')],
      })

/** What /campaigns and the Live campaigns button answer when there is nothing live. */
export const noCampaignsPanel = (notice: string | null): Message =>
  panel({
    icon: 'campaign',
    title: 'No campaigns yet',
    sub: notice ? 'The first campaigns are not live yet. They will be announced here the moment they are, and the creators who set up first will be ready.' : 'There are no live campaigns right now. New ones are announced here as soon as they start.',
    notice,
    blocks: [],
    bar: !notice,
    buttons: notice ? [plink('Sign up', BETA_ONBOARDING, 'arrow'), pbtn('Link an account', 'acct:link', 'grey', 'link')] : [pbtn('Get started', 'start:go', 'green', 'sparkles')],
  })

/** The support panel: one menu to read an answer, one to open a ticket for a reason. The answers and the tickets are private to the person who picks. */
export const supportPanelNew = (): Message =>
  panel({
    banner: true,
    icon: 'help',
    title: 'Support',
    sub: 'Find an answer in a few seconds, or talk to a person.',
    blocks: [
      item('book', 'Read an answer', 'Pick a question. Only you see the answer. More are one `/faq` away.'),
      item('ticket', 'Open a ticket', 'Pick what it is about and tell us what happened. Only you and the team can see a ticket.'),
    ],
    after: {
      0: [selectRow('faq:pick', 'Pick a question', FAQ_PICKS.map((f) => ({ label: f.q, value: String(f.index), description: f.group })))],
      1: [selectRow('ticket:reason', 'What is it about?', REASONS.map((r) => ({ label: r.label, value: r.key, description: r.description, icon: r.icon })))],
    },
    buttons: [plink('All the questions', '/faq', 'help'), pbtn('Open a ticket', 'ticket:open', 'grey', 'ticket')],
  })

/** A role as the server shows it: a mention (it wears the role's colour) when the role exists, otherwise its name in bold. */
const role = (id: string | undefined, name: string) => (id ? `<@&${id}>` : `**${name}**`)

/** #roles: what each role means and how you get it. The roles are mentioned, so they appear in their own colours (nobody is pinged: the message allows no mentions). */
export const rolesPanel = (r?: { founding: string; verified: string; unverified: string; linked: string; clipper: string; creator: string; brand: string; developer: string; team: string; tiers: { minUsd: number; role: string }[] }): Message =>
  panel({
    banner: true,
    icon: 'users',
    title: 'Roles',
    sub: 'What each role means, and how you get it. Most of them come by themselves.',
    blocks: [
      item('founder', 'Founding member', `${role(r?.founding, 'L | Founding Member')} signed up before we opened. It stays on your account for good.`),
      item('verified', 'Verified', `${role(r?.verified, 'L | Verified')} means you finished the sign-up. It opens the whole server.`),
      item('lock', 'Unverified', `${role(r?.unverified, 'L | Unverified')} is everyone who has joined but not signed up yet: you only see #get-started until you do.`),
      item('link', 'Member', `${role(r?.linked, 'L | Member')} is given when your Discord is linked to your logoless account.`),
      item('clip', 'Clipper', `${role(r?.clipper, 'L | Clipper')} is for people who make edits and clips for campaigns.`),
      item('music', 'Artist and brand', `${role(r?.creator, 'L | Artist')} for artists and streamers with campaigns here, ${role(r?.brand, 'L | Brand')} for brands that run them.`),
      item('trophy', 'Earner roles', `${(r?.tiers?.length ? r.tiers.map((t) => `<@&${t.role}>`) : ['**L | $100 Earner**', '**L | $1K Earner**', '**L | $10K Earner**']).join(', ')} are given by themselves as you earn.\n-# Your roles follow your account: run /sync if one looks out of date.`),
      item('shield', 'The team', `${role(r?.team, 'L | Founders')} runs logoless. Ask them anything in #support.`),
    ],
    buttons: [pbtn('Refresh my roles', 'cmd:sync', 'grey', 'verified')],
  })

/** #how-it-works: the five steps from sign-up to payout. `notice` is the "not live yet" line while the site is shut. */
export const howItWorksPanel = (notice: string | null): Message =>
  panel({
    banner: true,
    icon: 'sparkles',
    title: 'How logoless works',
    sub: 'Artists, streamers and brands post campaigns. You make edits, post them, and get paid for the views.',
    notice,
    blocks: [
      item('user', '1. Sign up', 'Sign in with Discord, add your name and username, and your PayPal if you like. You come back here verified.'),
      item('link', '2. Link your accounts', 'Prove your TikTok, YouTube or Instagram with a code in your bio (`/verify`). Verified creators are picked first.'),
      item('campaign', '3. Pick a campaign', 'Every campaign has a brief, a song or video to edit with, and a rate. See what is live with `/campaigns`.'),
      item('video', '4. Post and submit', 'Post your edit on your own account, then send the link with `/submit` (or the Submit button on the campaign).'),
      item('wallet', '5. Get paid', 'You earn for every 1,000 verified views, straight to your PayPal. `/balance` shows what is clearing and `/withdraw` sends it.'),
    ],
    buttons: [plink('Sign up', BETA_ONBOARDING, 'arrow'), plink('Questions', '/faq', 'help')],
  })
