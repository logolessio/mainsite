import type { Health } from '../health'
import { LEGAL_LINKS, SITE } from '../site'
import type { Component, Embed, Message } from './api'
import {
  big, btn, bullets, card, chip, dot, go, icon, join, meter, num, row, small, usd, SITE_URL, OWNER_URL, type IconName,
} from './ui'

/**
 * Every message the bot sends, built from plain data. Nothing here reads the database or calls Discord, so the same builders
 * serve the real thing and the test messages in the admin area (see samples.ts).
 */
const quiet = { parse: [] as string[] }
const msg = (embeds: Embed[], components?: Component[]): Message => ({ embeds, components, allowed_mentions: quiet })
export const logoUrl = `${SITE_URL}/logo-lg.png`
const cmds = (list: [string, string][]) => list.map(([c, d]) => `\`/${c}\` ${d}`).join('\n')
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

// ---------- small answers ----------
export const done = (text: string, title?: string) => msg([card({ icon: 'check', label: title ?? 'Done', text })])
export const problem = (text: string) => msg([card({ icon: 'cross', label: 'Could not do that', text, mute: true })])

// ---------- help, linking ----------
export const helpCard = (): Message =>
  msg([
    card({
      icon: 'help',
      label: 'Help',
      title: 'logoless bot',
      text: 'Campaigns, your numbers and your payouts, right here in Discord.',
      fields: [
        { name: 'Start', value: cmds([['link', 'connect your account'], ['profile', 'your page'], ['stats', 'your numbers'], ['balance', 'what you can withdraw'], ['badges', 'what you have unlocked']]) },
        { name: 'Earn', value: cmds([['campaigns', 'what is live'], ['campaign', 'the brief'], ['submit', 'send your content'], ['submissions', 'where they stand'], ['earn', 'what views are worth']]) },
        { name: 'Community', value: cmds([['leaderboard', 'the top creators'], ['faq', 'quick answers'], ['support', 'talk to the team'], ['report', 'tell us about a problem']]) },
        { name: 'You', value: cmds([['notifications', 'messages from me on or off'], ['sync', 'refresh your roles'], ['unlink', 'disconnect']]) },
      ],
    }),
  ])

export const notLinkedCard = (): Message =>
  msg(
    [
      card({
        icon: 'lock',
        label: 'Not linked yet',
        title: 'Link your account first',
        text: join('Open **Settings** on logoless.io, press **Connect Discord** and copy the code.', 'Then type `/link` here and paste it.', small('Signed in with Discord on the site? You are already linked.')),
      }),
    ],
    [row(go('Open settings', '/dashboard/settings'))],
  )

export const linkedCard = (a: { name: string; handle: string; rolesAdded: number }): Message =>
  msg(
    [card({ icon: 'check', label: 'Account linked', title: 'You are linked', text: join(`Connected to **${a.name || 'your account'}**${a.handle ? ` (@${a.handle})` : ''}.`, a.rolesAdded > 0 && small(`${a.rolesAdded} ${a.rolesAdded === 1 ? 'role' : 'roles'} added`)) })],
    [row(btn('My numbers', 'cmd:stats'), btn('Live campaigns', 'cmd:campaigns'))],
  )

// ---------- you ----------
export type ProfileData = {
  name: string
  handle: string
  bio: string
  avatar?: string
  banner?: string
  show: { submissions?: boolean; views?: boolean; earnings?: boolean }
  stats: { submissions: number; views: number; earnedCents: number }
  badges: string[]
  since: string
}
export const profileCard = (p: ProfileData): Message => {
  const fields = [
    ...(p.show.submissions ? [{ name: 'Submissions', value: num(p.stats.submissions), inline: true }] : []),
    ...(p.show.views ? [{ name: 'Views', value: num(p.stats.views), inline: true }] : []),
    ...(p.show.earnings ? [{ name: 'Earned', value: usd(p.stats.earnedCents), inline: true }] : []),
    ...(p.badges.length ? [{ name: 'Badges', value: p.badges.slice(0, 8).join(', '), inline: false }] : []),
  ]
  return msg(
    [card({ icon: 'user', label: 'Profile', title: p.name, url: `${SITE_URL}/@${p.handle}`, text: join(`@${p.handle}`, p.bio && clip(p.bio, 300)), fields, thumb: p.avatar, image: p.banner, foot: `Member since ${p.since}` })],
    [row(go('Open profile', `/@${p.handle}`))],
  )
}

export type StatsData = { name: string; earnedCents: number; weekCents: number; availableCents: number; views: number; submissions: number; campaigns: number }
export const statsCard = (s: StatsData): Message =>
  msg(
    [
      card({
        icon: 'chart',
        label: 'Your numbers',
        title: s.name,
        url: `${SITE_URL}/dashboard`,
        text: big(usd(s.earnedCents), dot('earned in total', s.weekCents > 0 && `${usd(s.weekCents)} this week`)),
        fields: [
          { name: 'Ready to withdraw', value: usd(s.availableCents), inline: true },
          { name: 'Verified views', value: num(s.views), inline: true },
          { name: 'Submissions', value: `${num(s.submissions)} in ${num(s.campaigns)} ${s.campaigns === 1 ? 'campaign' : 'campaigns'}`, inline: true },
        ],
      }),
    ],
    [row(btn('Balance', 'cmd:balance'), btn('Submissions', 'cmd:submissions'), go('Open dashboard', '/dashboard'))],
  )

export type BalanceData = { availableCents: number; pendingCents: number; withdrawnCents: number; brandCents: number }
export const balanceCard = (b: BalanceData): Message =>
  msg(
    [
      card({
        icon: 'wallet',
        label: 'Balance',
        url: `${SITE_URL}/dashboard/earnings`,
        text: join(big(usd(b.availableCents), 'ready to withdraw'), small('We pay PayPal’s fees, so the whole amount arrives.')),
        fields: [
          ...(b.pendingCents > 0 ? [{ name: 'Still being confirmed', value: usd(b.pendingCents), inline: true }] : []),
          { name: 'Withdrawn so far', value: usd(b.withdrawnCents), inline: true },
          ...(b.brandCents > 0 ? [{ name: 'Brand balance', value: usd(b.brandCents), inline: true }] : []),
        ],
      }),
    ],
    [row(go('Withdraw', '/dashboard/earnings#withdraw'), btn('My numbers', 'cmd:stats'))],
  )

export type SubmissionRow = { status: string; title: string; platform: string; views: number; earnedCents: number }
const STATUS_LABEL: Record<string, string> = { approved: 'Approved', pending: 'In review', rejected: 'Declined', declined: 'Declined' }
export const submissionsCard = (rows: SubmissionRow[]): Message =>
  rows.length === 0
    ? msg([card({ icon: 'clip', label: 'Submissions', text: 'Nothing submitted yet. Pick a campaign with `/campaigns`, then send your first with `/submit`.' })], [row(btn('Live campaigns', 'cmd:campaigns'))])
    : msg(
        [
          card({
            icon: 'clip',
            label: 'Submissions',
            title: 'Your latest',
            url: `${SITE_URL}/dashboard/submissions`,
            text: rows.map((r) => `${chip(STATUS_LABEL[r.status] ?? r.status)} **${r.title}**\n${small(dot(r.platform, `${num(r.views)} views`, usd(r.earnedCents)))}`).join('\n\n'),
          }),
        ],
        [row(go('Open all of them', '/dashboard/submissions'), btn('Live campaigns', 'cmd:campaigns'))],
      )

export type BadgeRow = { name: string; how: string; rarity: string }
export const badgesCard = (list: BadgeRow[], total: number, whose?: string): Message =>
  list.length === 0
    ? msg([card({ icon: 'star', label: 'Badges', text: `${whose ?? 'No badges yet'}. The first one is one submission away.` })])
    : msg([card({ icon: 'star', label: 'Badges', title: `${list.length} of ${total}`, url: `${SITE_URL}/dashboard/achievements`, text: clip(list.map((b) => `**${b.name}**\n${small(dot(b.rarity[0].toUpperCase() + b.rarity.slice(1), b.how))}`).join('\n\n'), 3900) })])

// ---------- campaigns ----------
export type CampaignLine = { id: string; title: string; creator: string; ratePer1k: number; leftPct: number; platforms: string[] }
export const campaignsCard = (list: CampaignLine[]): Message =>
  list.length === 0
    ? msg([card({ icon: 'campaign', label: 'Live campaigns', text: 'Nothing is live right now. Check back soon.' })])
    : msg(
        [
          card({
            icon: 'campaign',
            label: 'Live campaigns',
            url: SITE_URL,
            text: join(list.map((c) => `**[${c.title}](${SITE_URL}/campaign/${c.id})** by ${c.creator}\n${small(dot(`$${c.ratePer1k.toFixed(2)} per 1,000 views`, `${c.leftPct}% left`, c.platforms.join(', ')))}`).join('\n\n'), '', small('`/campaign` for the brief, `/submit` to send your content')),
          }),
        ],
        [row(go('See them on the site', '/'))],
      )

export type CampaignData = {
  id: string
  title: string
  creator: string
  summary: string
  cover?: string
  ratePer1k: number
  leftPct: number
  platforms: string[]
  limits: string
  makeThis: string[]
  offLimits: string[]
}
export const limitsText = (perPostCents: number, perUserCents: number) => [perPostCents ? `${usd(perPostCents, true)} per post` : '', perUserCents ? `${usd(perUserCents, true)} per creator` : ''].filter(Boolean).join(' · ')
export const campaignDetailCard = (c: CampaignData): Message =>
  msg(
    [
      card({
        icon: 'campaign',
        label: c.creator,
        title: c.title,
        url: `${SITE_URL}/campaign/${c.id}`,
        text: clip(c.summary, 600),
        thumb: c.cover,
        fields: [
          { name: 'Pays', value: `$${c.ratePer1k.toFixed(2)} per 1,000 views`, inline: true },
          { name: 'Budget left', value: `${c.leftPct}%`, inline: true },
          { name: 'Platforms', value: c.platforms.join(', ') || 'Any', inline: true },
          ...(c.limits ? [{ name: 'Limits', value: `Up to ${c.limits}`, inline: false }] : []),
          ...(c.makeThis.length ? [{ name: 'Make this', value: bullets(c.makeThis).slice(0, 1000), inline: true }] : []),
          ...(c.offLimits.length ? [{ name: 'Not allowed', value: bullets(c.offLimits).slice(0, 1000), inline: true }] : []),
        ],
      }),
    ],
    [row(btn('Join campaign', `camp:join:${c.id}`), go('Open campaign', `/campaign/${c.id}`), go('Rules', LEGAL_LINKS[4].href))],
  )

export type JoinData = {
  id: string
  title: string
  summary: string
  already: boolean
  rateCents: number
  limits: string
  makeThis: string[]
  offLimits: string[]
  channelId?: string | null
  dm: boolean
}
export const joinedCard = (j: JoinData): Message =>
  msg(
    [
      card({
        icon: 'check',
        label: j.already ? 'Already in' : 'Joined',
        title: j.title,
        url: `${SITE_URL}/campaign/${j.id}`,
        text: join(clip(j.summary, 400), '', big(`${usd(j.rateCents)} per 1,000 views`, j.limits ? `Up to ${j.limits}` : undefined)),
        fields: [
          ...(j.makeThis.length ? [{ name: 'Make this', value: bullets(j.makeThis).slice(0, 1000), inline: true }] : []),
          ...(j.offLimits.length ? [{ name: 'Not allowed', value: bullets(j.offLimits).slice(0, 1000), inline: true }] : []),
          {
            name: 'Next',
            value: join('**1.** Make it and post it on your own account.', `**2.** Send it with \`/submit campaign:${j.title}\`.`, '**3.** Approved views turn into money.', j.channelId && `Live numbers: <#${j.channelId}>`, small(`Updates about it reach you ${j.dm ? 'here and on the site' : 'on the site'}.`)),
          },
        ],
      }),
    ],
    [row(go('Open campaign', `/campaign/${j.id}`), go('Rules', LEGAL_LINKS[4].href), ...(j.channelId ? [go('Artist channel', `#${j.channelId}`)] : []))],
  )

// ---------- submitting ----------
export type SubmitData = { status: 'approved' | 'declined' | 'pending'; campaign: string; reason?: string | null; checks: { label: string; state: 'pass' | 'fail' | 'skip' }[] }
const CHECK: Record<string, string> = { pass: 'Passed', fail: 'Failed', skip: 'Skipped' }
export const submitCard = (r: SubmitData): Message =>
  msg(
    [
      card({
        icon: r.status === 'declined' ? 'cross' : r.status === 'approved' ? 'check' : 'clock',
        label: 'Submission',
        title: r.status === 'approved' ? 'Approved' : r.status === 'declined' ? 'Not approved' : 'Sent for review',
        url: `${SITE_URL}/dashboard/submissions`,
        mute: r.status === 'declined',
        text: join(
          `**${r.campaign}**`,
          r.status === 'approved' ? 'Our team confirms the views before you are paid.' : r.status === 'declined' ? r.reason ?? '' : 'A person will look at it soon. You will get a message here when it is decided.',
          '',
          r.checks.map((k) => `${chip(CHECK[k.state])} ${k.label}`).join('\n'),
        ),
      }),
    ],
    [row(btn('Submissions', 'cmd:submissions'), go('Open dashboard', '/dashboard/submissions'))],
  )

// ---------- community ----------
export type BoardRow = { name: string; handle: string; views: number; submissions: number }
export const leaderboardCard = (rows: BoardRow[], period: string): Message =>
  rows.length === 0
    ? msg([card({ icon: 'trophy', label: 'Leaderboard', text: 'Nobody is on the board yet.' })])
    : msg(
        [
          card({
            icon: 'trophy',
            label: 'Leaderboard',
            title: `Top creators, ${period}`,
            url: `${SITE_URL}/leaderboard`,
            text: join(rows.slice(0, 10).map((r, n) => `**${n + 1}.** [${r.name}](${SITE_URL}/@${r.handle})\n${small(`${num(r.views)} views · ${num(r.submissions)} ${r.submissions === 1 ? 'submission' : 'submissions'}`)}`).join('\n\n'), '', small('Only people who show their views are listed')),
          }),
        ],
        [row(go('Open the leaderboard', '/leaderboard'))],
      )

export const earnCard = (a: { views: number; rate: number; campaign?: string; earnCents: number; feePct: number }): Message =>
  msg([
    card({
      icon: 'money',
      label: 'What views are worth',
      text: join(big(usd(a.earnCents), `for ${num(a.views)} views`), `At **$${a.rate.toFixed(2)} per 1,000 views**${a.campaign ? ` on **${a.campaign}**` : ', the average of live campaigns'}.`, small(`You keep all of it. The brand pays our ${a.feePct}% fee on top, and we cover PayPal’s fees.`)),
    }),
  ])

export const faqCard = (a: { q: string; a: string; group: string }): Message => msg([card({ icon: 'help', label: `FAQ · ${a.group}`, title: a.q, url: `${SITE_URL}/faq`, text: clip(a.a, 3900) })], [row(go('More questions', '/faq'))])

// ---------- support ----------
export const ticketOpenedCard = (a: { ref: string; channelId: string | null; linked: boolean }): Message =>
  msg([
    card({
      icon: 'ticket',
      label: 'Ticket opened',
      text: a.channelId ? `Your private channel is <#${a.channelId}>. The team answers there and you will be pinged.` : join(`The team has it. Reference ${chip(a.ref)}.`, a.linked ? 'We will answer in your logoless notifications, and here if you have messages on.' : 'Link your account with `/link` to get the answer here.'),
    }),
  ])

export const reportSentCard = (a: { ref: string; linked: boolean }): Message =>
  msg([card({ icon: 'flag', label: 'Report sent', text: join(`The team has it. Reference ${chip(a.ref)}.`, a.linked ? 'We will answer in your logoless notifications, and here if you have messages on.' : 'Link your account with `/link` if you want the answer here.') })])

export const ticketButtons = (id: string): Component[] => [row(btn('Reply', `ticket:reply:${id}`), btn('Close ticket', `ticket:close:${id}`))]

export const ticketThreadCard = (a: { ref: string; subject: string; text: string; who: string; pings: string; staffId?: string; userId: string }): Message => ({
  content: a.pings || undefined,
  embeds: [
    card({ icon: 'ticket', label: `Ticket · ${a.who}`, title: a.subject, text: clip(a.text, 3500), foot: `Ref ${a.ref} · the team answers here and in the dashboard` }),
    card({ icon: 'info', label: 'What happens next', text: 'A person will answer soon. Use **Reply** to add more, or **Close ticket** when you are done.' }),
  ],
  components: ticketButtons(a.ref),
  allowed_mentions: { users: [a.userId], roles: a.staffId ? [a.staffId] : [] },
})

export const teamReplyCard = (a: { who: string; text: string; ref: string; userId: string }): Message => ({
  content: `<@${a.userId}>`,
  embeds: [{ ...card({ icon: 'logo', label: `${a.who} · logoless team`, text: clip(a.text, 3800) }) }],
  components: ticketButtons(a.ref),
  allowed_mentions: { users: [a.userId] },
})

export const memberReplyCard = (a: { who: string; text: string }): Message => msg([card({ icon: 'user', label: a.who, text: clip(a.text, 3800) })])

export const ticketClosedCard = (by: string): Message =>
  msg([card({ icon: 'check', label: 'Ticket closed', text: join(`Closed by ${by}. This channel goes away in a few seconds.`, small('The conversation is kept in the dashboard, and you can open a new ticket any time.')) })])

// ---------- the fixed channels ----------
export const rulesCard = (links: { rules: string; support: string; getStarted: string; guildId: string }): Message => {
  const rules: [string, string][] = [
    ['1. Be decent', 'No harassment, hate, slurs or threats. Disagree without going after people.'],
    ['2. Keep views real', 'No bought, botted or faked views, and no trading or selling them. It gets submissions rejected and accounts banned.'],
    ['3. Follow the brief', 'Make what a campaign asks for and nothing it forbids. Read the campaign page before you post.'],
    ['4. No spam or ads', 'No unrelated links, server invites or promotion. Post things in the right channel.'],
    ['5. No scams', 'The team will never DM you first, or ask for a password, a code or money. Report anyone who does.'],
    ['6. Keep private things private', 'Do not share other people’s details, and do not leak campaign material before it is public.'],
    ['7. Use the right place', 'Questions in help, ideas in suggestions, payment or account problems in a support ticket.'],
    ['8. Staff decisions stand', 'If you think we got it wrong, open a ticket. Do not argue it out in the channels.'],
    ['9. Discord’s rules apply too', 'Discord’s Terms of Service and Community Guidelines are part of ours.'],
  ]
  const ch = (id: string, label: string) => (links.guildId && id ? [go(label, `#${id}`)] : [])
  return msg(
    [card({ icon: 'book', label: 'Rules', title: 'Server rules', text: 'Short and fair. Break them and the team will act.', fields: rules.map(([name, value]) => ({ name, value })), foot: 'By staying here you agree to these rules and to the logoless Terms of Service.' })],
    [row(go('Terms of Service', LEGAL_LINKS[0].href), go('Campaign rules', LEGAL_LINKS[4].href), go('Questions', '/faq'), ...ch(links.getStarted, 'Get started'), ...ch(links.support, 'Support'))],
  )
}

export const siteCard = (stats?: { campaigns: number; paidCents: number }): Message => {
  const live = stats && stats.campaigns > 0 ? dot(`${stats.campaigns} live ${stats.campaigns === 1 ? 'campaign' : 'campaigns'}`, stats.paidCents > 0 && `$${Math.floor(stats.paidCents / 100).toLocaleString('en-US')} paid to creators`) : 'New campaigns land here first'
  return msg(
    [
      card({
        icon: 'logo',
        label: 'logoless.io',
        title: 'Views have value.',
        url: SITE_URL,
        text: 'Campaigns from artists, streamers and brands. Post your content, and get paid for every 1,000 verified views.',
        image: logoUrl,
        fields: [
          { name: 'For creators', value: `Free to join. You keep everything you earn. Withdraw from $${SITE.minPayoutUsd} to any PayPal email.`, inline: true },
          { name: 'For brands', value: `One balance for every campaign. Pay only for verified views, plus a ${SITE.platformFeePct}% fee on top.`, inline: true },
          { name: 'We pay PayPal’s fees', value: 'Every deposit and every withdrawal, in full.' },
          { name: 'Right now', value: live },
        ],
      }),
    ],
    [row(go('Open logoless.io', '/'), go('For creators', '/for-clippers'), go('For brands', '/for-brands'), go('Pricing', '/pricing'), go('Questions', '/faq'))],
  )
}

export const getStartedCard = (links: { rules: string; guildId: string }): Message => {
  const steps: [string, string][] = [
    ['1. Make your account', 'Open **logoless.io/onboarding**. Choose creator or brand, pick a username and a picture. It asks for a code we email you (not needed if you sign in with Discord).'],
    ['2. Link Discord', 'On the site open **Settings**, press **Connect Discord**, then press **Link my account** below and paste the code. Linking unlocks the rest of the server, your roles and your notifications here.'],
    ['3. Add your PayPal email', 'Go to **Earnings** and add the PayPal email you want to be paid at. We pay PayPal’s fees, so the whole amount arrives.'],
    ['4. Link your accounts', 'Add the TikTok, YouTube or Instagram accounts you post from, in **Settings**. You choose whether they show on your profile.'],
    ['5. Pick a campaign', 'Use `/campaigns` here, or browse the site. Open one and read the brief and the rules before you start.'],
    ['6. Post and submit', 'Post on your own account, then send it with `/submit` or paste the link on the campaign page. We check it in seconds.'],
    ['7. Get paid', `Approved views turn into money. It is yours to withdraw as soon as it is confirmed, from $${SITE.minPayoutUsd}.`],
  ]
  return msg(
    [
      card({ icon: 'spark', label: 'Welcome', title: 'Welcome to logoless', text: 'Setting up takes about three minutes. Follow the steps in order, and open a ticket if you get stuck.', thumb: logoUrl }),
      card({ icon: 'check', label: 'Step by step', fields: steps.map(([name, value]) => ({ name, value })), foot: 'Brands: add funds once on your Balance page and every campaign draws from it.' }),
    ],
    [row(go('Create your account', '/onboarding'), btn('Link my account', 'panel:link'), btn('Live campaigns', 'panel:campaigns'), ...(links.guildId && links.rules ? [go('Rules', `#${links.rules}`)] : []))],
  )
}

export const supportPanelCard = (): Message =>
  msg(
    [card({ icon: 'ticket', label: 'Support', title: 'Need a hand?', text: join('Press the button to open a private ticket. Only you and the team can see it. We answer right there, and you will be pinged.', '', small('For quick answers, `/faq` is instant.')), thumb: logoUrl, foot: 'Payment problems, account problems, anything: open a ticket.' })],
    [row(btn('Open a ticket', 'ticket:open'), go('Questions', '/faq'))],
  )

const SERVICE: Record<string, string> = { database: 'Database', signin: 'Sign-in', payments: 'Payments (PayPal)', email: 'Email' }
export const statusCard = (h: Health): Message => {
  const line = (ok: boolean, name: string, note?: string) => `${chip(ok ? 'Working' : 'Down')} **${name}**${note ? ` · ${note}` : ''}`
  const lines = [line(true, 'Website', 'logoless.io'), ...h.checks.map((c) => line(c.ok, SERVICE[c.id] ?? c.label, c.ok ? (c.ms !== undefined ? `${c.ms} ms` : undefined) : 'not working right now')), line(true, 'Discord bot', 'answering')]
  const allOk = h.checks.every((c) => c.ok)
  return msg(
    [card({ icon: allOk ? 'check' : 'flag', label: 'Status', title: allOk ? 'All systems working' : 'Some services need attention', text: join(lines.join('\n'), '', small(`Updated <t:${h.at}:R>`)), mute: !allOk, time: h.at })],
    [row(go('Open logoless.io', '/'))],
  )
}

// ---------- announcements ----------
export const welcomeMemberCard = (a: { name: string; handle: string; bio: string; avatar?: string; banner?: string; member: number; brand: boolean; country?: string | null; platforms: string[]; niches: string[]; discordId?: string | null }): Message => ({
  content: a.discordId ? `Welcome <@${a.discordId}>` : undefined,
  embeds: [
    card({
      icon: 'users',
      label: 'New member',
      title: `Welcome, ${a.name}`,
      url: `${SITE_URL}/@${a.handle}`,
      text: join(`**@${a.handle}** just joined logoless.`, a.bio && `“${clip(a.bio, 200)}”`),
      thumb: a.avatar ?? logoUrl,
      image: a.banner,
      fields: [
        { name: 'Member', value: `#${a.member.toLocaleString('en-US')}`, inline: true },
        { name: 'Joined as', value: a.brand ? 'A brand' : 'A creator', inline: true },
        ...(a.country ? [{ name: 'From', value: a.country, inline: true }] : []),
        ...(a.platforms.length ? [{ name: 'Posts on', value: a.platforms.join(', '), inline: true }] : []),
        ...(a.niches.length ? [{ name: 'Into', value: a.niches.slice(0, 4).join(', '), inline: true }] : []),
      ],
    }),
  ],
  components: [row(go('View profile', `/@${a.handle}`))],
  allowed_mentions: a.discordId ? { users: [a.discordId] } : quiet,
})

export const shoutoutCard = (a: { name: string; handle: string; campaign: string; cents: number | null }): Message =>
  msg([card({ icon: 'money', label: 'Paid', url: `${SITE_URL}/@${a.handle}`, text: a.cents ? `**${a.name}** just earned **${usd(a.cents)}** on **${a.campaign}**.` : `**${a.name}** just got paid on **${a.campaign}**.` })])

export const postCard = (a: { where: 'news' | 'updates'; title: string; text: string; url?: string; label?: string }): Message =>
  msg([card({ icon: 'spark', label: a.where === 'news' ? 'News' : 'Update', title: a.title, url: a.url, text: clip(a.text, 3800), thumb: logoUrl, time: true })], a.url ? [row(go(a.label ?? 'Read more', a.url))] : undefined)

// ---------- campaign tracker and announcement ----------
export type TrackerData = {
  id: string
  title: string
  creator: string
  status: string
  summary: string
  cover?: string
  rateCents: number
  budgetCents: number
  platforms: string[]
  leftPct: number
  leftCents: number
  paidCents: number
  approved: number
  views: number
  joined: number
  limits: string
  makeThis: string[]
  offLimits: string[]
  endsOn?: string | null
  guildId?: string
  getStartedChannel?: string
  here?: boolean
}
const STATUS: Record<string, string> = { live: 'Live', paused: 'Paused', ended: 'Ended' }
export const trackerCard = (c: TrackerData): Message => {
  const live = c.status === 'live'
  return msg(
    [
      card({
        icon: 'campaign',
        label: 'Live tracker',
        title: c.title,
        url: `${SITE_URL}/campaign/${c.id}`,
        mute: c.status === 'ended',
        text: join(`**${c.creator}** ${chip(STATUS[c.status] ?? c.status)}`, clip(c.summary, 350)),
        image: c.cover,
        fields: [
          { name: 'Pays', value: `${usd(c.rateCents)} per 1,000 views`, inline: true },
          { name: 'Platforms', value: c.platforms.join(', ') || 'Any', inline: true },
          { name: 'Joined', value: num(c.joined), inline: true },
          { name: 'Budget left', value: `${meter(c.leftPct)} **${c.leftPct}%**\n${small(`${usd(c.leftCents)} of ${usd(c.budgetCents)}`)}` },
          { name: 'Paid out', value: usd(c.paidCents), inline: true },
          { name: 'Approved', value: num(c.approved), inline: true },
          { name: 'Verified views', value: num(c.views), inline: true },
          ...(c.limits ? [{ name: 'Limits', value: `Up to ${c.limits}` }] : []),
          ...(c.makeThis.length ? [{ name: 'Make this', value: bullets(c.makeThis).slice(0, 1000), inline: true }] : []),
          ...(c.offLimits.length ? [{ name: 'Not allowed', value: bullets(c.offLimits).slice(0, 1000), inline: true }] : []),
        ],
        foot: `Updates itself${c.endsOn ? ` · ends ${c.endsOn}` : ''}`,
        time: true,
      }),
    ],
    [
      row(
        ...(live ? [btn('Join campaign', `camp:join:${c.id}`)] : []),
        go('Open campaign', `/campaign/${c.id}`),
        go('How to start', '/for-clippers'),
        go('Rules', LEGAL_LINKS[4].href),
        ...(c.guildId && c.getStartedChannel && !c.here ? [go('Get started', `#${c.getStartedChannel}`)] : []),
      ),
    ],
  )
}

export type AnnounceData = {
  id: string
  title: string
  creator: string
  summary: string
  cover?: string
  rateCents: number
  budgetCents: number
  platforms: string[]
  limits: string
  endsOn?: string | null
  channelId?: string | null
  joined: number
  guildId?: string
  getStartedChannel?: string
}
export const announceCard = (c: AnnounceData): Message =>
  msg(
    [
      card({
        icon: 'campaign',
        label: 'New campaign',
        title: c.title,
        url: `${SITE_URL}/campaign/${c.id}`,
        text: join(`**${c.creator}** just launched a campaign. Make it, post it, get paid for every 1,000 verified views.`, '', clip(c.summary, 500)),
        image: c.cover,
        fields: [
          { name: 'Pays', value: `**${usd(c.rateCents)}** per 1,000 views`, inline: true },
          { name: 'Budget', value: usd(c.budgetCents, true), inline: true },
          { name: 'Platforms', value: c.platforms.join(', ') || 'Any', inline: true },
          ...(c.limits ? [{ name: 'Limits', value: `Up to ${c.limits}` }] : []),
          ...(c.endsOn ? [{ name: 'Ends', value: c.endsOn, inline: true }] : []),
          ...(c.channelId ? [{ name: 'Live tracker', value: `<#${c.channelId}>`, inline: true }] : []),
          { name: 'How to start', value: join('**1.** Press **Join campaign** below.', '**2.** Read the brief and the rules on the campaign page.', '**3.** Make it and post it on your own account.', '**4.** Send it with `/submit`, or paste the link on the campaign page.', `**5.** Approved views turn into money. Withdraw from $${SITE.minPayoutUsd}, and we pay PayPal’s fees.`) },
        ],
        foot: c.joined ? `${c.joined} joined already` : 'Be one of the first to join',
        time: true,
      }),
    ],
    [
      row(btn('Join campaign', `camp:join:${c.id}`), go('Open campaign', `/campaign/${c.id}`), ...(c.channelId && c.guildId ? [go('Artist channel', `#${c.channelId}`)] : []), go('Rules', LEGAL_LINKS[4].href), go('Questions', '/faq')),
      ...(c.guildId && c.getStartedChannel ? [row(go('New here? Get started', `#${c.getStartedChannel}`), go('Pricing', '/pricing'))] : []),
    ],
  )

// ---------- notifications and the team's log ----------
export const notificationCard = (n: { kind: string; title: string; body?: string; href?: string; icon: IconName }): Message =>
  msg(
    [card({ icon: n.icon, label: n.kind === 'campaign' ? 'Campaign' : n.kind === 'account' ? 'Account' : n.kind === 'earning' || n.kind === 'payout' ? 'Earnings' : 'logoless', title: n.title, url: n.href, text: n.body ? clip(n.body, 500) : undefined, time: true })],
    n.href ? [row(go('Open', n.href))] : undefined,
  )

export const logCard = (a: { icon: IconName; text: string }): Message => msg([card({ icon: a.icon, label: 'Team log', text: clip(a.text, 1900), time: true })])

// ---------- the team's own commands ----------
export type SiteNow = { users: number; newToday: number; online: number; live: number; requests: number; toReview: number; held: number; brandCents: number; owedCents: number; feesCents: number }
export const siteNowCard = (r: SiteNow): Message =>
  msg(
    [
      card({
        icon: 'chart',
        label: 'Team',
        title: 'The site right now',
        url: `${OWNER_URL}/admin`,
        text: big(usd(r.feesCents), 'fees earned'),
        fields: [
          { name: 'Members', value: `${num(r.users)} (${r.newToday} new today)`, inline: true },
          { name: 'Online now', value: num(r.online), inline: true },
          { name: 'Live campaigns', value: `${r.live} (${r.requests} requests)`, inline: true },
          { name: 'To review', value: num(r.toReview), inline: true },
          { name: 'Withdrawals held', value: num(r.held), inline: true },
          { name: 'Brand balances', value: usd(r.brandCents), inline: true },
          { name: 'Owed to creators', value: usd(r.owedCents), inline: true },
        ],
      }),
    ],
    [row(go('Open admin', `${OWNER_URL}/admin`), btn('Queue', 'cmd:queue'))],
  )

export const queueCard = (rows: { title: string; n: number }[]): Message => {
  const total = rows.reduce((a, r) => a + r.n, 0)
  return total === 0
    ? msg([card({ icon: 'check', label: 'Queue', text: 'Nothing is waiting.' })])
    : msg([card({ icon: 'clock', label: 'Queue', title: `${total} waiting`, url: `${OWNER_URL}/admin/submissions`, text: rows.map((r) => `**${r.title}** · ${r.n}`).join('\n'), foot: 'Review them on the dashboard' })], [row(go('Open the list', `${OWNER_URL}/admin/submissions`))])
}

export { icon }
