import type { Message } from './api'
import { chan } from './ui'
import { BETA_ONBOARDING } from '../beta-host'
import { LEGAL_LINKS } from '../site'
import { embedCard, embedMessage, panel, pbtn, plink } from './look'

/**
 * The welcome and setup messages in the new look (see look.ts): the rules, the welcome card, the accounts and payments panels, the support card and the
 * pre-launch answer. `notice` is the line that says the service is not live yet (null once it is), so a panel posted before the launch carries it.
 */

export function rulesPanel(links: { rules: string; support: string; getStarted: string; guildId: string }): Message {
  const ask = links.guildId && links.support ? `<#${links.support}>` : 'a ticket'
  return panel({
    title: '📜 Server rules',
    sub: 'By joining you agree to follow these rules. Breaking them may lead to a warning, a mute, a kick or a ban.',
    blocks: [
      `*Not sure about something? Ask a staff member or open a ticket in ${ask}.*`,
      '### 1. 🤝 Be decent\nNo harassment, hate or threats.',
      '### 2. ✅ Keep views real\nNo botting, buying or faking views.',
      '### 3. 📋 Follow each campaign’s brief\nThe brief is the rule for that campaign.',
      '### 4. 🚫 No spam, ads or scams\nThe team never DMs you first.',
      '### 5. 🔒 Keep private things private\nOther people’s details stay theirs.',
      '### 6. 💬 Use the right channel\nProblems go in a ticket.',
      '### 7. ⚖️ Staff decisions stand\nThink we got it wrong? Open a ticket and we will look again.\n-# Discord’s Terms of Service and Community Guidelines apply too.',
    ],
    buttons: [plink('Terms', LEGAL_LINKS[0].href, '📄'), plink('Campaign rules', LEGAL_LINKS[4].href, '📋'), ...(links.guildId && links.support ? [plink('Support', chan(links.guildId, links.support), '🎫')] : [])],
  })
}

const STEPS = [
  { name: '🔗 Link your accounts', value: 'Connect the TikTok, YouTube or Instagram you post from, and prove it is yours with a code in your bio.' },
  { name: '💸 Add PayPal', value: 'Tell us where to pay you. We cover PayPal’s fees.' },
  { name: '🎬 Join campaigns', value: 'Pick a campaign, post your edit and submit the link. You are paid for every 1,000 verified views.' },
]

/** The welcome card in #get-started. `oneButton` is the newer flow (see welcome.ts); both now carry the same card. */
export function welcomePanel(links: { rules: string; guildId: string }, notice: string | null): Message {
  const rules = links.guildId && links.rules ? [plink('Rules', chan(links.guildId, links.rules), '📜')] : []
  // while the site is closed (a notice is passed) there are no campaigns to join: the card is about becoming a founding member
  if (notice) {
    return embedMessage(
      embedCard({
        title: '👋 Welcome to logoless',
        text: 'logoless pays creators for the views their edits get. Artists and brands will post campaigns here first. Right now we are gathering our **founding members**, so be one of them.',
        notice,
        fields: [
          { name: '🏅 1. Become a founding member', value: 'Press the button below. Sign in with Discord, add a profile and, if you like, your PayPal. It takes about a minute.', inline: false },
          { name: '🔓 2. The community opens', value: 'You land straight back here with the **Founding member** role, which opens general chat and the other community channels.', inline: false },
          { name: '🔗 3. Prove your accounts', value: 'Link your TikTok, YouTube or Instagram with `/verify` and prove it with a code in your bio. Verified creators get picked first for campaigns.', inline: false },
        ],
      }),
      [plink('Become a founding member', BETA_ONBOARDING, '🏅'), ...rules],
    )
  }
  return embedMessage(embedCard({ title: '👋 Welcome to logoless', text: 'Join campaigns from artists, streamers and brands. Post your content and get paid for every 1,000 verified views.', notice, fields: STEPS.map((s) => ({ ...s, inline: false })) }), [pbtn('Get started', 'start:go', 'green', '🚀'), pbtn('Live campaigns', 'panel:campaigns', 'blurple', '🎬'), ...rules])
}

/** What the Get started button answers while the site is closed. `member` is set once the person has finished the sign-up (or is waiting for a look). */
export function preLaunchPanel(end: number | null, member?: { n: number | null; held: boolean }): Message {
  if (member?.n) {
    return embedMessage(
      embedCard({
        title: `🏅 You are founding member #${member.n}`,
        text: 'Your Founding member role is on, so the community channels are open. Link your TikTok, YouTube or Instagram next, so verified creators like you are picked first when campaigns start.',
      }),
      [pbtn('Link an account', 'acct:link', 'green', '🔗'), pbtn('Add PayPal', 'pay:link', 'grey', '💸')],
    )
  }
  if (member?.held) {
    return embedMessage(
      embedCard({ title: '⏳ Your sign-up is being checked', text: 'We look at a few sign-ups by hand to keep bots out. You will get the Founding member role, and a message from us here, as soon as yours is cleared.' }),
      [plink('Open my sign-up', BETA_ONBOARDING, '🏅')],
    )
  }
  return embedMessage(
    embedCard({
      title: end ? '🚧 logoless opens soon' : '🚧 You are early',
      text: [
        end ? `The doors open <t:${end}:F>, <t:${end}:R>. There are no campaigns yet: we are gathering our founding members first.` : 'The site opens soon. There are no campaigns yet: we are gathering our founding members first.',
        'Until then this server is the home of logoless. The first campaigns will be announced here.',
        '',
        '**1.** Press the button: sign in with Discord, add a profile and, if you like, your PayPal.',
        '**2.** You come straight back here with the **Founding member** role, which opens the community channels.',
        '**3.** Link your TikTok, YouTube or Instagram and prove it is yours. Verified creators come first.',
      ].join('\n'),
    }),
    [plink('Become a founding member', BETA_ONBOARDING, '🏅'), pbtn('Link an account', 'acct:link', 'grey', '🔗'), pbtn('Add PayPal', 'pay:link', 'grey', '💸')],
  )
}

export const accountsPanel = (notice: string | null): Message =>
  embedMessage(
    embedCard({
      title: '🧬 Manage your accounts',
      text: 'Use the buttons below to set up your accounts. You can make an account here, link the accounts you post from, and check or remove them any time.',
      notice,
      fields: [
        { name: '✨ Make an account', value: 'No account yet? Make one here with an emailed code.', inline: true },
        { name: '🔗 Link Account', value: 'Connect your TikTok, YouTube or Instagram.', inline: true },
        { name: '📋 Manage Accounts', value: 'View your linked accounts and verify them.', inline: true },
      ],
    }),
    [pbtn('Link Account', 'acct:link', 'green', '🔗'), pbtn('Manage Accounts', 'acct:manage', 'grey', '📋'), pbtn('Make an account', 'acct:join', 'blurple', '✨')],
  )

export const paymentsPanel = (notice: string | null): Message =>
  notice
    ? embedMessage(
        embedCard({
          title: '💸 Manage your payment details',
          text: 'Add the PayPal email you want to be paid at, so you are ready from your very first campaign. A new address is confirmed with a code we email to your account, so nobody else can add one. There is nothing to withdraw until campaigns start.',
          notice,
          fields: [
            { name: '🔗 Link Payment Method', value: 'Add your PayPal email.', inline: true },
            { name: '📋 Manage Payment Methods', value: 'View and remove the PayPal emails you can be paid at.', inline: true },
          ],
        }),
        [pbtn('Link Payment Method', 'pay:link', 'green', '🔗'), pbtn('Manage Payment Methods', 'pay:manage', 'grey', '📋')],
      )
    : embedMessage(
    embedCard({
      title: '💸 Manage your payment details',
      text: 'Use the buttons below to manage how you get paid. A new PayPal address is confirmed with a code we email to your account, so nobody else can add one.',
      notice,
      fields: [
        { name: '🔗 Link Payment Method', value: 'Add your PayPal email.', inline: true },
        { name: '📋 Manage Payment Methods', value: 'View and remove the PayPal emails you can be paid at.', inline: true },
        { name: '💰 Check Balance', value: 'See what you can withdraw.', inline: true },
        { name: '🏦 Withdraw', value: 'Send your earnings to your PayPal.', inline: true },
      ],
    }),
    [pbtn('Link Payment Method', 'pay:link', 'green', '🔗'), pbtn('Manage Payment Methods', 'pay:manage', 'grey', '📋'), pbtn('Check Balance', 'pay:balance', 'blurple', '💰'), pbtn('Withdraw', 'wd:start', 'grey', '🏦')],
  )

/** What /campaigns and the Live campaigns button answer when there is nothing live. */
export const noCampaignsPanel = (notice: string | null): Message =>
  embedMessage(
    embedCard({ title: '🎬 No campaigns yet', text: notice ? 'The first campaigns are not live yet. They will be announced here the moment they are, and the creators who set up first will be ready.' : 'There are no live campaigns right now. New ones are announced here as soon as they start.', notice, bar: !notice }),
    notice ? [pbtn('Make my account', 'acct:join', 'green', '✨'), pbtn('Link an account', 'acct:link', 'grey', '🔗')] : [pbtn('Get started', 'start:go', 'green', '🚀')],
  )

export const supportPanelNew = (): Message =>
  embedMessage(embedCard({ title: '🎫 Need a hand?', text: 'Open a private ticket. Only you and the team can see it.' }), [pbtn('Open a ticket', 'ticket:open', 'green', '🎫'), plink('Questions', '/faq', '❓')])
