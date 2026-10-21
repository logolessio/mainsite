import type { Component, Embed, Message } from './api'
import { big, btn, card, chan, chip, dot, go, join, num, row, small, usd, SITE_URL } from './ui'

/**
 * The messages added with the bigger bot: the one-button get started, the next steps and the rundown, the payouts and submissions
 * channels, the new campaign card, and the answers to the newer commands. Like cards.ts, built from plain data only (nothing reads
 * the database or calls Discord), so the admin area can preview every one of them. One or two buttons per message, never more.
 */
const quiet = { parse: [] as string[] }
const msg = (embeds: Embed[], components?: Component[]): Message => ({ embeds, components, allowed_mentions: quiet })
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

// ---------- small helpers, exported so they can be tested ----------
/** Half of a name hidden: "emile" becomes "em***". Short names keep at least one star. */
export function censor(name: string): string {
  const s = [...name.trim().replace(/^@/, '')]
  if (s.length === 0) return '***'
  const shown = s.length <= 1 ? 0 : Math.floor(s.length / 2)
  return s.slice(0, shown).join('') + '*'.repeat(Math.max(1, s.length - shown))
}
/** The same, safe inside Discord's markdown (a bare star would start italics). */
export const censorMd = (name: string) => censor(name).replace(/\*/g, '\\*')

/** A long bar for a percentage, made of blocks Discord draws the same everywhere. */
export function bar(pct: number, width = 16) {
  const p = Math.max(0, Math.min(100, pct))
  const filled = Math.round((p / 100) * width)
  return `${'█'.repeat(filled)}${'░'.repeat(width - filled)}`
}
export const pctLeft = (budgetCents: number, paidCents: number) => (budgetCents > 0 ? Math.max(0, Math.min(100, Math.round(((budgetCents - paidCents) / budgetCents) * 100))) : 100)
const PLATFORM: Record<string, string> = { tiktok: 'TikTok', youtube: 'YouTube', instagram: 'Instagram' }
export const platformName = (p: string) => PLATFORM[p] ?? p
/** The link that opens a campaign straight on its submit step. */
export const submitUrl = (campaignId: string) => `${SITE_URL}/campaign/${encodeURIComponent(campaignId)}?submit=1`
/** The address of a picture card made by the site (see app/api/discord/card). `v` changes when the picture should change, so Discord fetches it again. */
export const cardImage = (kind: 'payout' | 'campaign', id: string, v?: string | number) => `${SITE_URL}/api/discord/card/${kind}/${encodeURIComponent(id)}${v !== undefined ? `?v=${encodeURIComponent(String(v))}` : ''}`

// ---------- get started ----------
/** The message in #get-started: one button. It answers with a link only that person sees (see welcome.ts). */
export const startCard = (): Message =>
  msg(
    [
      card({
        icon: 'spark',
        label: 'Welcome',
        title: 'Get paid for the views you bring',
        text: join(
          'Artists, streamers and brands post campaigns here. You post content for them on your own TikTok, YouTube or Instagram, and you are paid for every 1,000 verified views.',
          '',
          small('One button: make your account, link your Discord, and you are in.'),
        ),
        thumb: `${SITE_URL}/logo-lg.png`,
      }),
    ],
    [row(btn('Get started', 'start:go'))],
  )

export type StartState = 'new' | 'unfinished' | 'ready'
/** The answer to the Get started button, only for the person who pressed it. One link button. */
export const startReplyCard = (state: StartState, url: string): Message =>
  state === 'ready'
    ? msg([card({ icon: 'check', label: 'Already set up', text: 'Your account and your Discord are linked. Here is what to do next.' })])
    : msg(
        [
          card({
            icon: 'spark',
            label: state === 'new' ? 'Step 1 of 2' : 'Almost there',
            title: state === 'new' ? 'Make your account' : 'Finish setting up',
            text: join(
              state === 'new' ? 'It takes about a minute. The last step links this Discord account.' : 'This Discord is linked to your account. Finish setting up your profile, it takes a minute.',
              small('Come back here when you are done: a message only you can see will tell you what to do next.'),
            ),
          }),
        ],
        [row(go(state === 'new' ? 'Start on logoless.io' : 'Finish setting up', url))],
      )

export type NextData = { name: string; guildId?: string; campaignsChannel?: string; supportChannel?: string; brand: boolean; live: number }
/** The second message in #get-started, only for that person: what to do right now. */
export const nextStepsCard = (n: NextData): Message =>
  msg(
    [
      card({
        icon: 'check',
        label: 'You are in',
        title: `Welcome, ${n.name}`,
        text: n.brand
          ? join('**1.** Start a campaign on logoless.io: set the rate, the budget and the brief.', '**2.** It is posted in its own channel here the moment it goes live.', '**3.** Watch the submissions and the numbers come in, live.', '', small('The full rundown is in your direct messages.'))
          : join(
              `**1.** Pick a campaign.${n.live ? ` ${n.live} ${n.live === 1 ? 'is' : 'are'} live right now.` : ''}${n.guildId && n.campaignsChannel ? ` They are announced in <#${n.campaignsChannel}>.` : ''}`,
              '**2.** Post your content on your own account.',
              '**3.** Press Submit on the campaign, or type `/submit` here.',
              '**4.** You are paid for every 1,000 verified views. `/balance` shows it.',
              '',
              small('The full rundown is in your direct messages.'),
            ),
      }),
    ],
    [row(n.brand ? go('Start a campaign', '/brand') : btn('Live campaigns', 'cmd:campaigns'), go('Dashboard', n.brand ? '/brand' : '/dashboard'))],
  )

/** The direct message with everything, once someone has an account and a linked Discord. */
export const rundownDm = (n: NextData & { commands: [string, string][] }): Message => ({
  embeds: [
    card({
      icon: 'logo',
      label: 'logoless',
      title: `You are all set, ${n.name}`,
      url: SITE_URL,
      text: n.brand
        ? 'Your logoless account and this Discord are linked. Here is how campaigns run, and what the server does for you.'
        : 'Your logoless account and this Discord are linked. Here is everything, in one place, so you can start earning today.',
      thumb: `${SITE_URL}/logo-lg.png`,
    }),
    card({
      icon: 'book',
      label: 'How it works',
      text: n.brand
        ? join(
            '**Launch.** Set a rate per 1,000 views and a budget. Creators see it the moment it is live, here and on the site.',
            '**Watch.** Every submission is posted with the video and its numbers. Views are checked again and again by the site.',
            '**Pay only for views.** Creators are paid for verified views, out of your budget. When the budget is used, the campaign ends.',
          )
        : join(
            '**1. Choose.** Every live campaign has a card in its artist\'s channel with the rate, what is left of the budget and the brief.',
            '**2. Post.** Make your content and post it on your own TikTok, YouTube or Instagram.',
            '**3. Submit.** Press Submit on the card, or `/submit` here. Most are checked in seconds.',
            '**4. Get paid.** The site checks your views again and again. Every 1,000 verified views pays the campaign\'s rate.',
            '**5. Withdraw.** To PayPal, from your dashboard. We pay the PayPal fee.',
          ),
    }),
    card({
      icon: 'help',
      label: 'Commands',
      text: join(n.commands.map(([c, d]) => `\`/${c}\` ${d}`).join('\n'), '', small('Type / in any channel to see them all.')),
    }),
    card({
      icon: 'users',
      label: 'In the server',
      text: join(
        '**Artist channels.** One per artist, with a live card for each campaign.',
        '**Payouts.** Every earning, as it happens. Names are half hidden.',
        '**Submissions.** Every submission with its video and numbers.',
        `**Support.** ${n.supportChannel ? `<#${n.supportChannel}>` : '`/support`'} opens a private ticket. The team never messages you first.`,
      ),
    }),
  ],
  components: [row(go('Open dashboard', n.brand ? '/brand' : '/dashboard'), go('Live campaigns', '/'))],
  allowed_mentions: quiet,
})

// ---------- payouts channel ----------
export type PayoutPost = { earningId: string; name: string; cents: number; campaign: string; campaignId?: string | null; views?: number | null; rateCents?: number | null; at: number }
export const payoutPostCard = (p: PayoutPost): Message =>
  msg(
    [
      card({
        icon: 'money',
        label: 'Paid',
        title: `${censor(p.name)} earned ${usd(p.cents)}`,
        url: p.campaignId ? `${SITE_URL}/campaign/${p.campaignId}` : undefined,
        text: join(`On **${p.campaign}**`, small(dot(p.views ? `${num(p.views)} more verified views` : '', p.rateCents ? `${usd(p.rateCents)} per 1,000 views` : '', `<t:${p.at}:R>`))),
        image: cardImage('payout', p.earningId),
      }),
    ],
    p.campaignId ? [row(go('Earn on this campaign', submitUrl(p.campaignId)))] : undefined,
  )

export const withdrawalPostCard = (p: { name: string; cents: number; at: number }): Message =>
  msg([card({ icon: 'wallet', label: 'Withdrawn', title: `${censor(p.name)} withdrew ${usd(p.cents)}`, text: small(dot('Sent to PayPal', `<t:${p.at}:R>`)) })])

// ---------- submissions channel ----------
export type SubmissionPost = {
  id: string
  url: string
  platform: string
  status: string
  reason?: string | null
  campaign: string
  campaignId: string
  handle: string
  name: string
  at: number
  verifiedViews: number
  earnedCents: number
  rateCents: number
  video: { title?: string; author?: string; authorUrl?: string; thumb?: string; views?: number; likes?: number; comments?: number; shares?: number; postedAt?: number }
}
const SUB_STATUS: Record<string, string> = { pending: 'In review', approved: 'Approved', rejected: 'Not approved' }
/**
 * A submission: the link goes in the message itself, which is what makes Discord show the video (YouTube plays in place, TikTok
 * shows its preview), and the card under it has every number.
 */
export const submissionPostCard = (s: SubmissionPost): Message => {
  const v = s.video
  const stat = (label: string, x: number | undefined) => (x === undefined ? [] : [{ name: label, value: num(x), inline: true }])
  return {
    content: s.url,
    embeds: [
      card({
        icon: 'clip',
        label: `New submission · ${platformName(s.platform)}`,
        title: v.title ? cut(v.title, 200) : `For ${s.campaign}`,
        url: s.url,
        mute: s.status === 'rejected',
        text: join(
          `${chip(SUB_STATUS[s.status] ?? s.status)} for **[${s.campaign}](${SITE_URL}/campaign/${s.campaignId})**`,
          `By [@${s.handle}](${SITE_URL}/@${s.handle})${v.author ? ` · posted as ${v.authorUrl ? `[${v.author}](${v.authorUrl})` : v.author}` : ''}`,
          s.status === 'rejected' && s.reason ? small(cut(s.reason, 200)) : '',
        ),
        thumb: v.thumb,
        fields: [
          ...stat('Views', v.views),
          ...stat('Likes', v.likes),
          ...stat('Comments', v.comments),
          ...stat('Shares', v.shares),
          { name: 'Verified views', value: num(s.verifiedViews), inline: true },
          { name: 'Earned', value: usd(s.earnedCents), inline: true },
          { name: 'Pays', value: `${usd(s.rateCents)} per 1,000`, inline: true },
          ...(v.postedAt ? [{ name: 'Posted', value: `<t:${v.postedAt}:R>`, inline: true }] : []),
        ],
        foot: 'Numbers update as it is reviewed and earns',
        time: s.at,
      }),
    ],
    components: [row(go('Submit to this campaign', submitUrl(s.campaignId)))],
    allowed_mentions: quiet,
  }
}

// ---------- the campaign card ----------
export type CampaignPost = {
  id: string
  title: string
  creator: string
  status: string
  summary: string
  cover?: string
  rateCents: number
  budgetCents: number
  paidCents: number
  platforms: string[]
  approved: number
  views: number
  joined: number
  endsOn?: string | null
  clipThis: string[]
  imageVersion: string
}
const CAMP_STATUS: Record<string, string> = { live: 'Live', paused: 'Paused', ended: 'Ended' }
/** The card in an artist's channel: a picture with the cover and the budget bar, the brief, the numbers, and Submit. */
export const campaignPostCard = (c: CampaignPost): Message => {
  const left = pctLeft(c.budgetCents, c.paidCents)
  const live = c.status === 'live'
  return msg(
    [
      card({
        icon: 'campaign',
        label: `${c.creator} · ${CAMP_STATUS[c.status] ?? c.status}`,
        title: c.title,
        url: `${SITE_URL}/campaign/${c.id}`,
        mute: !live,
        text: join(
          big(`${usd(c.rateCents)} per 1,000 views`, dot(c.platforms.map(platformName).join(', ') || 'Any platform', c.endsOn ? `ends ${c.endsOn}` : '')),
          cut(c.summary, 280),
          c.clipThis.length ? `\n**What to make**\n${c.clipThis.slice(0, 3).map((x) => `• ${cut(x, 120)}`).join('\n')}` : '',
          '',
          `**Budget left** ${left}%`,
          `\`${bar(left, 24)}\``,
          small(`${usd(Math.max(0, c.budgetCents - c.paidCents))} of ${usd(c.budgetCents)} left`),
        ),
        fields: [
          { name: 'Paid out', value: usd(c.paidCents), inline: true },
          { name: 'Approved', value: num(c.approved), inline: true },
          { name: 'Verified views', value: num(c.views), inline: true },
        ],
        image: cardImage('campaign', c.id, c.imageVersion),
        foot: live ? `Live numbers · ${num(c.joined)} joined` : 'This campaign is not taking submissions',
        time: true,
      }),
    ],
    live ? [row(go('Submit content', submitUrl(c.id)), btn('Join', `camp:join:${c.id}`))] : [row(go('See live campaigns', '/'))],
  )
}

// ---------- newer commands ----------
export type PayoutRow = { cents: number; status: string; at: number }
const PAYOUT_STATUS: Record<string, string> = { pending: 'Being sent', review: 'Being checked', sent: 'Sent', paid: 'Sent', failed: 'Failed, money returned', reversed: 'Returned' }
export const payoutStatusCard = (rows: PayoutRow[], availableCents: number): Message =>
  msg(
    [
      card({
        icon: 'wallet',
        label: 'Withdrawals',
        url: `${SITE_URL}/dashboard/earnings`,
        text: join(
          big(usd(availableCents), 'ready to withdraw now'),
          rows.length ? rows.map((r) => `${chip(PAYOUT_STATUS[r.status] ?? r.status)} **${usd(r.cents)}** · <t:${r.at}:R>`).join('\n') : 'No withdrawals yet.',
        ),
      }),
    ],
    [row(go('Withdraw', '/dashboard/earnings#withdraw'))],
  )

export const rankCard = (a: { place: number | null; of: number; views: number; next?: { name: string; gap: number } | null }): Message =>
  msg(
    [
      card({
        icon: 'trophy',
        label: 'Your rank',
        text: a.place
          ? join(big(`#${a.place}`, `of ${num(a.of)} creators, last 30 days`), `${num(a.views)} verified views.`, a.next ? small(`${num(a.next.gap)} more views to pass ${a.next.name}.`) : small('Nobody is ahead of you.'))
          : join('Not on the board yet.', small('Your first approved submission with verified views puts you on it.')),
      }),
    ],
    [row(btn('Leaderboard', 'cmd:leaderboard'))],
  )

export const rolesCard = (have: string[], why: string[]): Message =>
  msg([card({ icon: 'users', label: 'Your roles', text: join(have.length ? have.map((r) => `<@&${r}>`).join(' ') : 'None yet.', '', small(why.join(' · ') || 'Link your account to get roles.')) })], [row(btn('Refresh', 'cmd:sync'))])

export type BrandRow = { id: string; title: string; status: string; budgetCents: number; paidCents: number; submissions: number; views: number }
export const brandCard = (rows: BrandRow[]): Message =>
  rows.length === 0
    ? msg([card({ icon: 'campaign', label: 'Your campaigns', text: 'No campaigns yet.' })], [row(go('Start a campaign', '/brand'))])
    : msg(
        [
          card({
            icon: 'campaign',
            label: 'Your campaigns',
            url: `${SITE_URL}/brand`,
            text: rows
              .slice(0, 8)
              .map((r) => {
                const left = pctLeft(r.budgetCents, r.paidCents)
                return `${chip(CAMP_STATUS[r.status] ?? r.status)} **[${r.title}](${SITE_URL}/campaign/${r.id})**\n\`${bar(left, 12)}\` ${left}% left\n${small(dot(`${num(r.submissions)} submissions`, `${num(r.views)} verified views`, `${usd(r.paidCents)} paid`))}`
              })
              .join('\n\n'),
          }),
        ],
        [row(go('Brand dashboard', '/brand'))],
      )

export const devCard = (apps: { name: string; id: string }[]): Message =>
  msg(
    [card({ icon: 'link', label: 'Your apps', text: apps.length ? apps.map((a) => `**${a.name}** ${chip(a.id)}`).join('\n') : 'No apps yet. Register one to add Sign in with logoless to your site.' })],
    [row(go('Developer page', '/developers'), go('Docs', '/developers/docs'))],
  )

// ---------- fun ----------
const pick = <T,>(list: T[], seed = Math.random()) => list[Math.floor(seed * list.length) % list.length]
const EIGHT = ['It is certain.', 'Without a doubt.', 'Yes, and post it today.', 'Signs point to yes.', 'Ask again after your next 1,000 views.', 'The algorithm is thinking.', 'Better not tell you now.', 'Very doubtful.', 'My sources say no.', 'Outlook: viral.', 'Only if the hook lands in the first second.', 'Not with that thumbnail.']
export const eightBallCard = (question: string, seed?: number): Message => msg([card({ icon: 'spark', label: 'The 8 ball', text: join(small(cut(question, 200)), big(pick(EIGHT, seed))) })])
export const coinCard = (seed = Math.random()): Message => msg([card({ icon: 'spark', label: 'Coin flip', text: big(seed < 0.5 ? 'Heads' : 'Tails') })])
export const rollCard = (sides: number, seed = Math.random()): Message => msg([card({ icon: 'spark', label: `A ${sides}-sided die`, text: big(String(1 + Math.floor(seed * sides))) })])
export const chooseCard = (options: string[], seed?: number): Message => msg([card({ icon: 'spark', label: 'I choose', text: join(big(cut(pick(options, seed), 120)), small(`out of ${options.length}`)) })])
const HYPE = ['is about to have the best week of their life.', 'posts like the algorithm owes them money.', 'has hooks so good the first second gets a replay.', 'is one upload away from the leaderboard.', 'edits faster than the trend moves.', 'turns views into rent.']
export const hypeCard = (who: string, seed?: number): Message => ({ ...msg([card({ icon: 'star', label: 'Hype', text: big(`${who} ${pick(HYPE, seed)}`) })]), allowed_mentions: quiet })

/** A roast built from the video's real numbers. Playful, never about the person. */
export function roast(v: { title?: string; views?: number; likes?: number; comments?: number; shares?: number }, seed = Math.random()): string {
  const lines: string[] = []
  if (v.views !== undefined && v.likes !== undefined && v.views > 0) {
    const r = v.likes / v.views
    lines.push(r < 0.02 ? `${num(v.views)} people watched and ${num(v.likes)} liked it. The rest were checking the time.` : r > 0.12 ? `A ${Math.round(r * 100)}% like rate. Fine, that is annoyingly good.` : `${num(v.likes)} likes on ${num(v.views)} views. Solid, like a sensible pair of shoes.`)
  } else if (v.views !== undefined) lines.push(v.views < 1000 ? `${num(v.views)} views. Your mum, your other phone, and the algorithm by accident.` : `${num(v.views)} views. The algorithm noticed you, which is more than most.`)
  if (v.comments !== undefined) lines.push(v.comments === 0 ? 'Zero comments. Not even a bot wanted to talk about it.' : v.comments < 10 ? `${v.comments} comments. A cosy dinner party.` : `${num(v.comments)} comments. Someone started an argument and it worked.`)
  if (v.shares !== undefined && v.shares === 0) lines.push('Nobody shared it. It is a secret now.')
  if (v.title) lines.push(v.title.length > 80 ? 'That caption is longer than the video.' : !/[#]/.test(v.title) ? 'No hashtags. Brave. Possibly reckless.' : 'The hashtags are doing a lot of work here.')
  if (lines.length === 0) lines.push(pick(['I could not see the numbers, so I will assume it is perfect and you are perfect.', 'The platform would not tell me anything, which is the most private thing about it.'], seed))
  lines.push(pick(['Post another one. That is the whole secret.', 'Still: better than not posting.', 'Ten more like it and you are on the leaderboard.'], seed))
  return lines.join('\n')
}
export const roastCard = (url: string, v: Parameters<typeof roast>[0], seed?: number): Message =>
  msg([card({ icon: 'flag', label: 'Roast my submission', title: v.title ? cut(v.title, 200) : undefined, url, text: roast(v, seed) })])
