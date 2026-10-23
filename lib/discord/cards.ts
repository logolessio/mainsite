import type { Health } from '../health'
import { LEGAL_LINKS, SITE } from '../site'
import type { Component, Embed, Message } from './api'
import { item, panel, pbtn, plink, prow } from './look'
import { container, gallery, section, sep, text, thumb, v2 } from './v2'
import {
  ACCENT, BANNER, BAR, big, btn, bullets, card, chan, chip, dot, go, ic, icon, INK, join, meter, num, row, small, usd, SITE_URL, OWNER_URL, type IconName,
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
  msg(
    [
      card({
        icon: 'help',
        label: 'Help',
        title: 'logoless bot',
        text: join(
          '`/join` `/verify` `/accounts` `/paypal` `/payments` `/withdraw`',
          '`/campaigns` `/campaign` `/submit` `/submissions` `/earn`',
          '`/stats` `/balance` `/profile` `/badges`',
          '`/leaderboard` `/faq` `/support` `/report`',
          '`/notifications` `/sync` `/unlink`',
          '`/next` `/payout` `/rank` `/roles` `/brand` `/dev`',
          '`/8ball` `/coinflip` `/roll` `/choose` `/hype` `/roast-my-clip`',
        ),
      }),
    ],
    [row(go('Open logoless.io', '/'))],
  )

export const notLinkedCard = (): Message =>
  msg(
    [card({ icon: 'lock', label: 'Not connected', title: 'Connect your Discord', text: 'It takes a few seconds on logoless.io, and unlocks your numbers, roles and notifications here.' })],
    [row(go('Connect Discord', '/api/discord/connect'))],
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
  /** What the picture card is drawn for. The handle, unless this says otherwise ("sample" in the admin previews). */
  imageFor?: string
}
/** One message: the picture card (their banner, picture, name in their colours, numbers they show and their badges as medals), one line of words under it, one button. */
export const profileCard = (p: ProfileData): Message =>
  msg(
    [
      card({
        icon: 'user',
        label: 'Profile',
        title: p.name,
        url: `${SITE_URL}/@${p.handle}`,
        text: join(`@${p.handle}`, p.bio && clip(p.bio, 200), p.badges.length > 0 && small(p.badges.slice(0, 5).join('  ·  '))),
        image: `${SITE_URL}/api/discord/card/profile/${encodeURIComponent(p.imageFor ?? p.handle)}`,
        foot: `Member since ${p.since}`,
      }),
    ],
    [row(go('Open profile', `/@${p.handle}`))],
  )

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
        text: join(big(usd(b.availableCents), 'ready to withdraw'), small('We pay PayPal’s fees, so the whole amount is sent.')),
        fields: [
          ...(b.pendingCents > 0 ? [{ name: 'Still being confirmed', value: usd(b.pendingCents), inline: true }] : []),
          { name: 'Withdrawn so far', value: usd(b.withdrawnCents), inline: true },
          ...(b.brandCents > 0 ? [{ name: 'Brand balance', value: usd(b.brandCents), inline: true }] : []),
        ],
      }),
    ],
    [row(pbtn('Withdraw', 'wd:start', 'green', 'wallet'), btn('My numbers', 'cmd:stats'))],
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
        text: clip(c.summary, 260),
        thumb: c.cover,
        fields: [
          { name: 'Pays', value: `$${c.ratePer1k.toFixed(2)} per 1,000 views`, inline: true },
          { name: 'Budget left', value: `${c.leftPct}%`, inline: true },
          { name: 'Platforms', value: c.platforms.join(', ') || 'Any', inline: true },
        ],
      }),
    ],
    [row(btn('Join campaign', `camp:join:${c.id}`), go('Open campaign', `/campaign/${c.id}`))],
  )

export type JoinData = { id: string; title: string; already: boolean; rateCents: number; channelId?: string | null; guildId?: string }
export const joinedCard = (j: JoinData): Message =>
  msg(
    [card({ icon: 'check', label: j.already ? 'Already in' : 'Joined', title: j.title, url: `${SITE_URL}/campaign/${j.id}`, text: `Pays ${usd(j.rateCents)} per 1,000 views. The brief and the rules are on the campaign page.` })],
    [row(go('Open campaign', `/campaign/${j.id}`), ...(j.channelId && j.guildId ? [go('Artist channel', chan(j.guildId, j.channelId))] : []))],
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
        text: join(`**${r.campaign}**`, r.status === 'declined' ? r.reason ?? '' : r.status === 'approved' ? 'Its views are checked while the campaign runs, and you are paid for the verified ones.' : 'You will get a message here when it is decided.', ...r.checks.filter((k) => k.state === 'fail').map((k) => `${chip('Failed')} ${k.label}`)),
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

export const faqCard = (a: { q: string; a: string; group: string }): Message => msg([card({ icon: 'help', label: 'FAQ', title: a.q, url: `${SITE_URL}/faq`, text: clip(a.a, 500) })], [row(go('Read more', '/faq'))])

// ---------- support ----------
// A ticket is plain text, like the team log: no embeds, no names. What a person or the team writes is posted as it is.
const plain = (content: string, extra: Partial<Message> = {}): Message => ({ content: clip(content, 1900), raw: true, allowed_mentions: quiet, ...extra })

export const ticketOpenedCard = (a: { ref: string; channelId: string | null; linked: boolean }): Message =>
  plain(a.channelId ? `Your ticket is open: <#${a.channelId}>` : `Got it. Reference ${a.ref}. ${a.linked ? 'We will answer in your logoless notifications.' : 'Connect Discord on logoless.io to get the answer here.'}`)

export const reportSentCard = (a: { ref: string; linked: boolean }): Message =>
  msg([card({ icon: 'flag', label: 'Report sent', text: join(`The team has it. Reference ${chip(a.ref)}.`, a.linked ? 'We will answer in your logoless notifications, and here if you have messages on.' : 'Connect Discord on logoless.io if you want the answer here.') })])

/** The first message in a ticket channel: the person's words, with the buttons to answer and to close. */
export const ticketThreadCard = (a: { ref: string; subject: string; text: string; pings: string; staffId?: string; userId: string }): Message =>
  plain(`${a.pings ? `${a.pings}\n` : ''}**${a.subject}**\n${a.text}`, {
    components: [row(btn('Reply', `ticket:reply:${a.ref}`), btn('Close ticket', `ticket:close:${a.ref}`))],
    allowed_mentions: { users: [a.userId], roles: a.staffId ? [a.staffId] : [] },
  })

/** An answer from the team: just the words, with one Reply button (the bot cannot read ordinary chat, so replies go through it). */
export const teamReplyCard = (a: { text: string; ref: string }): Message => plain(a.text, { components: [row(btn('Reply', `ticket:reply:${a.ref}`))] })

/** The person's answer: just the words. */
export const memberReplyCard = (a: { text: string }): Message => plain(a.text)

export const ticketClosedCard = (): Message => plain('Ticket closed.')

// ---------- the fixed channels ----------
export const rulesCard = (links: { rules: string; support: string; getStarted: string; guildId: string }): Message => {
  const ch = (id: string, label: string) => (links.guildId && id ? [go(label, chan(links.guildId, id))] : [])
  return msg(
    [
      card({
        icon: 'book',
        label: 'Rules',
        title: 'Server rules',
        text: join(
          '**1.** Be decent. No harassment, hate or threats.',
          '**2.** Keep views real. No botting, buying or faking.',
          '**3.** Follow each campaign’s brief.',
          '**4.** No spam, ads or scams. The team never DMs you first.',
          '**5.** Keep private things private.',
          '**6.** Use the right channel. Problems go in a ticket.',
          '**7.** Staff decisions stand. Think we got it wrong? Open a ticket.',
          '',
          small('Discord’s Terms and Guidelines apply too.'),
        ),
      }),
    ],
    [row(go('Terms', LEGAL_LINKS[0].href), go('Campaign rules', LEGAL_LINKS[4].href), ...ch(links.support, 'Support'))],
  )
}

export const siteCard = (stats?: { campaigns: number; paidCents: number }, community?: string): Message => {
  const numbers = stats && stats.campaigns > 0 ? [item('campaign', `${stats.campaigns} live ${stats.campaigns === 1 ? 'campaign' : 'campaigns'}`, 'Open to everyone, posted here first.'), ...(stats.paidCents > 0 ? [item('money', `$${Math.floor(stats.paidCents / 100).toLocaleString('en-US')} paid to creators`, 'For verified views, straight to PayPal.')] : [])] : community ? [small(community)] : []
  return panel({
    banner: true,
    icon: 'logo',
    title: 'Views have value.',
    sub: 'Campaigns from artists, streamers and brands. Get paid for every 1,000 verified views.',
    blocks: numbers,
    buttons: [plink('Open logoless.io', '/', 'globe'), plink('For creators', '/for-creators', 'user'), plink('For brands', '/for-brands', 'campaign')],
  })
}

export const getStartedCard = (links: { rules: string; guildId: string }): Message =>
  msg(
    [card({ icon: 'spark', label: 'Welcome', title: 'Welcome to logoless', text: 'Join campaigns from artists, streamers and brands. Post your content and get paid for every 1,000 verified views.', thumb: logoUrl })],
    [row(go('Get started', '/onboarding'), go('Log in', '/login'), btn('Live campaigns', 'panel:campaigns'), ...(links.guildId && links.rules ? [go('Rules', chan(links.guildId, links.rules))] : []))],
  )

export const supportPanelCard = (): Message =>
  msg([card({ icon: 'ticket', label: 'Support', title: 'Need a hand?', text: 'Open a private ticket. Only you and the team can see it.' })], [row(btn('Open a ticket', 'ticket:open'), go('Questions', '/faq'))])

const SERVICE: Record<string, string> = { database: 'Database', signin: 'Sign-in', payments: 'Payments (PayPal)', email: 'Email' }
export const statusCard = (h: Health): Message => {
  const line = (ok: boolean, name: string, note?: string) => `${ok ? ic('check') : ic('cross')} **${name}**${note ? ` · ${note}` : ''}`
  const lines = [line(true, 'Website', 'logoless.io'), ...h.checks.map((c) => line(c.ok, SERVICE[c.id] ?? c.label, c.ok ? (c.ms !== undefined ? `${c.ms} ms` : undefined) : 'not working right now')), line(true, 'Discord bot', 'answering')]
  const allOk = h.checks.every((c) => c.ok)
  return panel({
    accent: allOk ? ACCENT : 0xff1f38,
    icon: allOk ? 'check' : 'flag',
    title: allOk ? 'All systems working' : 'Some services need attention',
    sub: `Updated <t:${h.at}:R>`,
    blocks: [lines.join('\n')],
    buttons: [plink('Open logoless.io', '/', 'globe')],
  })
}

// ---------- announcements ----------
export const welcomeMemberCard = (a: { name: string; handle: string; bio: string; avatar?: string; banner?: string; member: number; brand: boolean; country?: string | null; platforms: string[]; niches: string[]; discordId?: string | null }): Message => ({
  ...v2(
    container(
      ACCENT,
      gallery({ url: a.banner ?? BANNER }),
      section(
        [
          `## Welcome, ${a.name}`,
          `${a.discordId ? `<@${a.discordId}> · ` : ''}**[@${a.handle}](${SITE_URL}/@${a.handle})** just joined logoless.`,
          small(dot(`Member #${a.member.toLocaleString('en-US')}`, a.brand ? 'A brand' : 'A creator', a.country, a.platforms.length ? `Posts on ${a.platforms.join(', ')}` : '', a.niches.length ? `Into ${a.niches.slice(0, 4).join(', ')}` : '')),
        ],
        thumb(a.avatar ?? logoUrl, a.name),
      ),
      ...(a.bio ? [sep(), text(`“${clip(a.bio, 240)}”`)] : []),
      gallery({ url: BAR }),
      prow(plink('View profile', `/@${a.handle}`, 'arrow')),
    ),
  ),
  allowed_mentions: a.discordId ? { users: [a.discordId] } : quiet,
})

export const shoutoutCard = (a: { name: string; handle: string; campaign: string; cents: number | null }): Message =>
  panel({
    icon: 'money',
    title: a.cents ? `${a.name} earned ${usd(a.cents)}` : `${a.name} got paid`,
    sub: `On **${a.campaign}**`,
    blocks: [],
    buttons: [plink('View profile', `/@${a.handle}`, 'arrow')],
  })

export const postCard = (a: { where: 'news' | 'updates'; title: string; text: string; url?: string; label?: string }): Message =>
  panel({
    banner: true,
    icon: a.where === 'news' ? 'megaphone' : 'sparkles',
    title: a.title,
    sub: `${a.where === 'news' ? 'News' : 'Product update'} · <t:${Math.floor(Date.now() / 1000)}:D>`,
    blocks: [clip(a.text, 3500)],
    buttons: a.url ? [plink(a.label ?? 'Read more', a.url, 'arrow')] : undefined,
  })

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
        text: join(`**${c.creator}** ${chip(STATUS[c.status] ?? c.status)}`, clip(c.summary, 200)),
        thumb: c.cover,
        fields: [
          { name: 'Pays', value: `${usd(c.rateCents)} per 1,000 views`, inline: true },
          { name: 'Joined', value: num(c.joined), inline: true },
          { name: 'Platforms', value: c.platforms.join(', ') || 'Any', inline: true },
          { name: 'Budget left', value: `${meter(c.leftPct)} **${c.leftPct}%**\n${small(`${usd(c.leftCents)} of ${usd(c.budgetCents)}`)}` },
          { name: 'Paid out', value: usd(c.paidCents), inline: true },
          { name: 'Approved', value: num(c.approved), inline: true },
          { name: 'Verified views', value: num(c.views), inline: true },
        ],
        foot: `Updates itself${c.endsOn ? ` · ends ${c.endsOn}` : ''}`,
        time: true,
      }),
    ],
    [row(...(live ? [btn('Join campaign', `camp:join:${c.id}`)] : []), go('Open campaign', `/campaign/${c.id}`), ...(c.guildId && c.getStartedChannel && !c.here ? [go('Get started', chan(c.guildId, c.getStartedChannel))] : []))],
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
  endsOn?: string | null
  channelId?: string | null
  joined: number
  guildId?: string
  getStartedChannel?: string
}
export const announceCard = (c: AnnounceData): Message => {
  const url = `${SITE_URL}/campaign/${c.id}`
  const head = [`## [${c.title}](${url})`, `-# ${ic('music')} ${c.creator} just launched a campaign`, ...(c.summary ? [clip(c.summary, 240)] : [])]
  return v2(
    container(
      ACCENT,
      c.cover ? section(head, thumb(c.cover, c.title)) : text(head.join('\n')),
      sep(),
      text(join('### ' + ic('book') + ' Campaign info', `${ic('money')} **Pays:** ${usd(c.rateCents)} per 1,000 views`, `${ic('wallet')} **Budget:** ${usd(c.budgetCents, true)}`, `${ic('globe')} **Platform:** ${c.platforms.join(', ') || 'Any'}`, c.endsOn ? `${ic('clock')} **Ends:** ${c.endsOn}` : '')),
      text(small(c.joined ? `${c.joined} joined already` : 'Be one of the first to join')),
      gallery({ url: BAR }),
      prow(pbtn('Join campaign', `camp:join:${c.id}`, 'green', 'plus'), plink('Open campaign', `/campaign/${c.id}`, 'arrow'), ...(c.channelId && c.guildId ? [plink('Artist channel', chan(c.guildId, c.channelId), 'hash')] : [])),
    ),
  )
}

// ---------- notifications and the team's log ----------
/** A site notification as a direct message: one small container (a line saying what it is and when, the title, the words, one button), not an embed. */
export const notificationCard = (n: { kind: string; title: string; body?: string; href?: string; icon: IconName }): Message =>
  v2(
    container(
      ACCENT,
      text(join(small(`${n.kind === 'campaign' ? 'Campaign' : n.kind === 'account' ? 'Account' : n.kind === 'earning' || n.kind === 'payout' ? 'Earnings' : 'logoless'} · <t:${Math.floor(Date.now() / 1000)}:R>`), `### ${ic(n.icon)} ${n.title}`, n.body ? clip(n.body, 600) : '')),
      gallery({ url: BAR }),
      ...(n.href ? [prow(plink('Open', n.href, 'arrow'))] : []),
    ),
  )

export const logCard = (a: { text: string }): Message => ({ content: clip(a.text, 1900), allowed_mentions: quiet })

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
