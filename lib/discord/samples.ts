import type { Health } from '../health'
import type { Message } from './api'
import * as k from './cards'
import * as m from './cards-more'
import { kindIcon } from './ui'

/**
 * One sample of every message the bot can send, with made-up data, so the team can see them all (and how they read on a phone)
 * without waiting for the real thing to happen. They go through exactly the same builders as the real messages.
 */
export type Sample = { id: string; label: string; group: string; build: () => Message }

const COVER = 'https://logoless.io/covers/01.jpg'
const camp: k.CampaignData = {
  id: 'red-room',
  title: 'Red Room, the new single',
  creator: 'Luna Ray',
  summary: 'Cut your favourite part of the new single and post it on your own account. Fan edits, lyric moments and reactions all count. Keep it under 60 seconds.',
  cover: COVER,
  ratePer1k: 2.5,
  leftPct: 64,
  platforms: ['TikTok', 'YouTube', 'Instagram'],
}
const tracker: k.TrackerData = {
  id: camp.id,
  title: camp.title,
  creator: camp.creator,
  status: 'live',
  summary: camp.summary,
  cover: COVER,
  rateCents: 250,
  budgetCents: 500000,
  platforms: camp.platforms,
  leftPct: 64,
  leftCents: 320000,
  paidCents: 180000,
  approved: 412,
  views: 720000,
  joined: 1284,
  endsOn: '14/12/2026',
}
const profile: k.ProfileData = {
  name: 'Luna Ray',
  handle: 'luna_ray',
  bio: 'Cutting clips since 2021. Mostly pop and late-night live sets.',
  show: { submissions: true, views: true, earnings: true },
  stats: { submissions: 42, views: 318400, earnedCents: 79600 },
  badges: ['First submission', 'Ten thousand views', 'Early member'],
  since: 'Mar 2026',
  imageFor: 'sample',
}
const health = (ok: boolean): Health => ({
  ok,
  at: Math.floor(Date.now() / 1000),
  checks: [
    { id: 'database', label: 'Database', ok: true, ms: 12 },
    { id: 'signin', label: 'Sign-in', ok: true },
    { id: 'payments', label: 'Payments', ok },
    { id: 'email', label: 'Email', ok: true },
  ],
})

export const SAMPLES: Sample[] = [
  // ---- commands
  { id: 'help', group: 'Commands', label: 'Help', build: () => k.helpCard() },
  { id: 'not-linked', group: 'Commands', label: 'Not linked yet', build: () => k.notLinkedCard() },
  { id: 'profile', group: 'Commands', label: 'Profile', build: () => k.profileCard(profile) },
  { id: 'stats', group: 'Commands', label: 'Your numbers', build: () => k.statsCard({ name: 'Luna Ray', earnedCents: 79600, weekCents: 12400, availableCents: 31050, views: 318400, submissions: 42, campaigns: 6 }) },
  { id: 'balance', group: 'Commands', label: 'Balance', build: () => k.balanceCard({ availableCents: 31050, pendingCents: 2500, withdrawnCents: 46000, brandCents: 0 }) },
  {
    id: 'submissions',
    group: 'Commands',
    label: 'Submissions',
    build: () =>
      k.submissionsCard([
        { status: 'approved', title: 'Red Room, the new single', platform: 'tiktok', views: 48200, earnedCents: 12050 },
        { status: 'pending', title: 'Night Shift live session', platform: 'youtube', views: 0, earnedCents: 0 },
        { status: 'rejected', title: 'Red Room, the new single', platform: 'instagram', views: 0, earnedCents: 0 },
      ]),
  },
  { id: 'submissions-empty', group: 'Commands', label: 'No submissions yet', build: () => k.submissionsCard([]) },
  {
    id: 'badges',
    group: 'Commands',
    label: 'Badges',
    build: () =>
      k.badgesCard(
        [
          { name: 'First submission', how: 'Send your first piece of content', rarity: 'common' },
          { name: 'Ten thousand views', how: 'Reach 10,000 verified views', rarity: 'rare' },
          { name: 'Top of the board', how: 'Reach the top ten of the leaderboard', rarity: 'epic' },
        ],
        24,
      ),
  },
  {
    id: 'campaigns',
    group: 'Commands',
    label: 'Live campaigns',
    build: () =>
      k.campaignsCard([
        { id: 'red-room', title: 'Red Room, the new single', creator: 'Luna Ray', ratePer1k: 2.5, leftPct: 64, platforms: ['tiktok', 'youtube'] },
        { id: 'night-shift', title: 'Night Shift live session', creator: 'Marlo', ratePer1k: 3, leftPct: 18, platforms: ['tiktok', 'instagram'] },
      ]),
  },
  { id: 'campaign', group: 'Commands', label: 'One campaign', build: () => k.campaignDetailCard(camp) },
  { id: 'joined', group: 'Commands', label: 'Joined a campaign', build: () => k.joinedCard({ id: camp.id, title: camp.title, already: false, rateCents: 250, channelId: null }) },
  {
    id: 'submit-approved',
    group: 'Commands',
    label: 'Submission approved',
    build: () => k.submitCard({ status: 'approved', campaign: camp.title, checks: [{ label: 'The post is public', state: 'pass' }, { label: 'It is on your own account', state: 'pass' }, { label: 'Not submitted before', state: 'pass' }] }),
  },
  {
    id: 'submit-review',
    group: 'Commands',
    label: 'Submission sent for review',
    build: () => k.submitCard({ status: 'pending', campaign: camp.title, checks: [{ label: 'The post is public', state: 'pass' }, { label: 'It is on your own account', state: 'skip' }] }),
  },
  {
    id: 'submit-declined',
    group: 'Commands',
    label: 'Submission not approved',
    build: () => k.submitCard({ status: 'declined', campaign: camp.title, reason: 'That post is private, so we cannot see the views. Make it public and send it again.', checks: [{ label: 'The post is public', state: 'fail' }] }),
  },
  {
    id: 'leaderboard',
    group: 'Commands',
    label: 'Leaderboard',
    build: () =>
      k.leaderboardCard(
        [
          { name: 'Luna Ray', handle: 'luna_ray', views: 318400, submissions: 42 },
          { name: 'Marlo', handle: 'marlo', views: 204000, submissions: 30 },
          { name: 'Jess', handle: 'jess', views: 98100, submissions: 17 },
        ],
        'last 30 days',
      ),
  },
  { id: 'earn', group: 'Commands', label: 'What views are worth', build: () => k.earnCard({ views: 100000, rate: 2.5, campaign: camp.title, earnCents: 25000, feePct: 15 }) },
  { id: 'faq', group: 'Commands', label: 'FAQ answer', build: () => k.faqCard({ q: 'When can I withdraw?', a: 'As soon as your earnings are confirmed. Add a PayPal email on the Earnings page and withdraw from $10. We pay PayPal’s fees, so the whole amount arrives.', group: 'Payments' }) },
  { id: 'ticket-opened', group: 'Commands', label: 'Ticket opened', build: () => k.ticketOpenedCard({ ref: 'a1b2c3', channelId: null, linked: true }) },
  { id: 'report-sent', group: 'Commands', label: 'Report sent', build: () => k.reportSentCard({ ref: 'd4e5f6', linked: false }) },
  { id: 'done', group: 'Commands', label: 'Done (generic)', build: () => k.done('Your notifications will arrive as messages from me.') },
  { id: 'problem', group: 'Commands', label: 'Problem (generic)', build: () => k.problem('That code is not right, or it has expired. Get a new one in **Settings** on logoless.io.') },

  // ---- the fixed channels
  { id: 'rules', group: 'Channels', label: 'Rules', build: () => k.rulesCard({ rules: '', support: '', getStarted: '', guildId: '' }) },
  { id: 'site', group: 'Channels', label: 'Site card', build: () => k.siteCard({ campaigns: 5, paidCents: 1840000 }) },
  { id: 'get-started', group: 'Channels', label: 'Get started', build: () => k.getStartedCard({ rules: '', guildId: '' }) },
  { id: 'support-panel', group: 'Channels', label: 'Support panel', build: () => k.supportPanelCard() },
  { id: 'status-ok', group: 'Channels', label: 'Status: all working', build: () => k.statusCard(health(true)) },
  { id: 'status-down', group: 'Channels', label: 'Status: a service is down', build: () => k.statusCard(health(false)) },
  { id: 'welcome', group: 'Channels', label: 'Welcome a new member', build: () => k.welcomeMemberCard({ name: 'Luna Ray', handle: 'luna_ray', bio: 'Cutting clips since 2021.', member: 1284, brand: false, country: 'United Kingdom', platforms: ['tiktok', 'youtube'], niches: ['Pop', 'Live sets'] }) },
  { id: 'shoutout', group: 'Channels', label: 'Big earnings shoutout', build: () => k.shoutoutCard({ name: 'Luna Ray', handle: 'luna_ray', campaign: camp.title, cents: 18500 }) },
  { id: 'news', group: 'Channels', label: 'News post', build: () => k.postCard({ where: 'news', title: 'Payouts are instant now', text: 'Earnings can be withdrawn the moment they are confirmed. No waiting.', url: 'https://logoless.io/faq', label: 'Read more' }) },
  { id: 'update', group: 'Channels', label: 'Product update', build: () => k.postCard({ where: 'updates', title: 'A goal for the month', text: 'Set an earnings goal on your dashboard and watch the bar fill as you earn.' }) },

  // ---- campaigns
  { id: 'tracker-live', group: 'Campaigns', label: 'Live tracker', build: () => k.trackerCard(tracker) },
  { id: 'tracker-ended', group: 'Campaigns', label: 'Tracker: ended', build: () => k.trackerCard({ ...tracker, status: 'ended', leftPct: 0, leftCents: 0, paidCents: 500000 }) },
  { id: 'announcement', group: 'Campaigns', label: 'New campaign announcement', build: () => k.announceCard({ id: camp.id, title: camp.title, creator: camp.creator, summary: camp.summary, cover: COVER, rateCents: 250, budgetCents: 500000, platforms: camp.platforms, endsOn: '14/12/2026', channelId: null, joined: 0 }) },

  // ---- tickets
  { id: 'ticket-thread', group: 'Tickets', label: 'Ticket opened (in its channel)', build: () => k.ticketThreadCard({ ref: 'a1b2c3', subject: 'My withdrawal has not arrived', text: 'I withdrew $50 on Monday and it still says in review.', pings: '<@0>', userId: '0' }) },
  { id: 'ticket-team', group: 'Tickets', label: 'Ticket: team reply', build: () => k.teamReplyCard({ text: 'Thanks for waiting. It was held for a quick check and has been sent. It should arrive within the hour.', ref: 'a1b2c3' }) },
  { id: 'ticket-member', group: 'Tickets', label: 'Ticket: member reply', build: () => k.memberReplyCard({ text: 'Got it, thank you!' }) },
  { id: 'ticket-closed', group: 'Tickets', label: 'Ticket closed', build: () => k.ticketClosedCard() },

  // ---- notifications that reach people as direct messages
  { id: 'dm-approved', group: 'Messages to members', label: 'A submission was approved', build: () => k.notificationCard({ kind: 'submission', icon: kindIcon('submission'), title: 'Approved: Red Room, the new single', body: 'Your submission was approved. We will confirm the views before you are paid.', href: '/dashboard/submissions' }) },
  { id: 'dm-earning', group: 'Messages to members', label: 'You earned money', build: () => k.notificationCard({ kind: 'earning', icon: kindIcon('earning'), title: 'You earned $42.50', body: 'On Red Room, the new single. It is ready to withdraw.', href: '/dashboard/earnings' }) },
  { id: 'dm-payout', group: 'Messages to members', label: 'A withdrawal was sent', build: () => k.notificationCard({ kind: 'payout', icon: kindIcon('payout'), title: 'Your withdrawal was sent', body: '$50.00 is on its way to your PayPal email.', href: '/dashboard/earnings' }) },
  { id: 'dm-ending', group: 'Messages to members', label: 'A campaign is about to end', build: () => k.notificationCard({ kind: 'campaign', icon: kindIcon('campaign'), title: 'Red Room, the new single is almost out of budget', body: '12% of the budget is left. Anything you post and submit soon still counts.', href: '/campaign/red-room' }) },
  { id: 'dm-ended', group: 'Messages to members', label: 'A campaign ended: your summary', build: () => k.notificationCard({ kind: 'campaign', icon: kindIcon('campaign'), title: 'Red Room, the new single has ended', body: 'You earned $65.00 from 3 submissions. Thank you for being part of it.', href: '/dashboard/earnings' }) },
  { id: 'dm-account', group: 'Messages to members', label: 'Something about your account', build: () => k.notificationCard({ kind: 'account', icon: kindIcon('account'), title: 'Discord connected', body: 'Linked to Luna Ray. You will get your notifications there too.', href: '/dashboard/settings' }) },

  // ---- the team
  { id: 'team-stats', group: 'Team', label: 'The site right now', build: () => k.siteNowCard({ users: 1284, newToday: 12, online: 31, live: 5, requests: 2, toReview: 7, held: 1, brandCents: 1840000, owedCents: 320000, feesCents: 276000 }) },
  { id: 'team-queue', group: 'Team', label: 'What is waiting', build: () => k.queueCard([{ title: 'Red Room, the new single', n: 5 }, { title: 'Night Shift live session', n: 2 }]) },
  { id: 'team-log', group: 'Team', label: 'A line in the team log', build: () => k.logCard({ text: 'New ticket from <@0>: My withdrawal has not arrived' }) },

  // ---- the bigger bot (cards-more.ts)
  { id: 'start', group: 'Get started', label: 'Get started (one button)', build: () => m.startCard() },
  { id: 'start-new', group: 'Get started', label: 'After pressing it: no account yet', build: () => m.startReplyCard('new', 'https://logoless.io/onboarding?ref=discord') },
  { id: 'start-unfinished', group: 'Get started', label: 'After pressing it: linked, profile not finished', build: () => m.startReplyCard('unfinished', 'https://logoless.io/onboarding?ref=discord') },
  { id: 'next-steps', group: 'Get started', label: 'Next steps (only they see it)', build: () => m.nextStepsCard({ name: 'Luna Ray', brand: false, live: 5 }) },
  { id: 'next-steps-brand', group: 'Get started', label: 'Next steps for a brand', build: () => m.nextStepsCard({ name: 'Acme Records', brand: true, live: 5 }) },
  { id: 'rundown', group: 'Get started', label: 'The rundown (direct message)', build: () => m.rundownDm({ name: 'Luna Ray', brand: false, live: 5, commands: [['campaigns', 'what is live right now'], ['submit', 'send your content to a campaign'], ['balance', 'what you can withdraw'], ['next', 'what to do next'], ['help', 'every command']] }) },
  { id: 'payout-post', group: 'Feeds', label: 'Payouts channel: an earning', build: () => m.payoutPostCard({ earningId: 'sample', name: 'emile', cents: 12450, campaign: camp.title, campaignId: camp.id, views: 49800, rateCents: 250, at: Math.floor(Date.now() / 1000) }) },
  { id: 'withdrawal-post', group: 'Feeds', label: 'Payouts channel: a withdrawal', build: () => m.withdrawalPostCard({ name: 'emile', cents: 5000, at: Math.floor(Date.now() / 1000) }) },
  {
    id: 'submission-post',
    group: 'Feeds',
    label: 'Submissions channel',
    build: () =>
      m.submissionPostCard({
        id: 'x', url: 'https://www.youtube.com/shorts/aqz-KE-bpKQ', platform: 'youtube', status: 'approved', campaign: camp.title, campaignId: camp.id, handle: 'luna_ray', name: 'Luna Ray', at: Math.floor(Date.now() / 1000), verifiedViews: 48200, earnedCents: 12050, rateCents: 250,
        video: { title: 'the chorus at 2am hits different #redroom', author: 'Luna Ray', thumb: COVER, views: 51340, likes: 6120, comments: 214, postedAt: Math.floor(Date.now() / 1000) - 86400 },
      }),
  },
  { id: 'campaign-card', group: 'Campaigns', label: 'New campaign card (live)', build: () => m.campaignPostCard({ id: 'sample', title: camp.title, creator: camp.creator, status: 'live', summary: camp.summary, cover: COVER, rateCents: 250, budgetCents: 500000, paidCents: 180000, platforms: ['tiktok', 'youtube', 'instagram'], approved: 412, views: 720000, joined: 1284, endsOn: '14/12/2026', clipThis: ['The chorus, with the lyrics on screen', 'Your reaction to the first listen'], offLimits: ['Sped-up or slowed versions of the track', 'Edits that cover the artwork'], soundUrl: 'https://open.spotify.com/track/sample', example: 'https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4', imageVersion: '1' }) },
  { id: 'campaign-card-ended', group: 'Campaigns', label: 'New campaign card (ended)', build: () => m.campaignPostCard({ id: 'sample', title: camp.title, creator: camp.creator, status: 'ended', summary: camp.summary, cover: COVER, rateCents: 250, budgetCents: 500000, paidCents: 500000, platforms: ['tiktok'], approved: 412, views: 720000, joined: 1284, clipThis: [], imageVersion: '2' }) },
  { id: 'payout-status', group: 'Commands', label: '/payout', build: () => m.payoutStatusCard([{ cents: 5000, status: 'sent', at: Math.floor(Date.now() / 1000) - 86400 }, { cents: 2500, status: 'pending', at: Math.floor(Date.now() / 1000) - 600 }], 3105) },
  { id: 'rank', group: 'Commands', label: '/rank', build: () => m.rankCard({ place: 7, of: 214, views: 98100, next: { name: 'Marlo', gap: 4200 } }) },
  { id: 'brand', group: 'Commands', label: '/brand', build: () => m.brandCard([{ id: camp.id, title: camp.title, status: 'live', budgetCents: 500000, paidCents: 180000, submissions: 512, views: 720000 }]) },
  { id: 'eight-ball', group: 'Fun', label: '/8ball', build: () => m.eightBallCard('Will my next post go viral?', 0.75) },
  { id: 'coinflip', group: 'Fun', label: '/coinflip', build: () => m.coinCard(0.2) },
  { id: 'roast', group: 'Fun', label: '/roast-my-clip', build: () => m.roastCard('https://www.tiktok.com/@luna/video/1', { title: 'pov: the chorus hits', views: 18400, likes: 210, comments: 3, shares: 0 }, 0.4) },
]

export const SAMPLE_BY_ID = Object.fromEntries(SAMPLES.map((s) => [s.id, s])) as Record<string, Sample>
export const sampleList = () => SAMPLES.map(({ id, label, group }) => ({ id, label, group }))
