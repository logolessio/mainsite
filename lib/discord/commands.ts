import { BADGE_BY_ID } from '../badges-defs'
import { liveCampaigns } from '../campaigns-db'
import { db, nowSec } from '../db'
import { FAQ } from '../faq'
import { HttpError } from '../http'
import { createInquiry, clean as cleanText } from '../inquiries'
import { balances } from '../ledger'
import { feeFor } from '../ledger-math'
import { notify } from '../notify'
import { profileStats } from '../profile'
import { rolesForEmail } from '../roles'
import { submitClip } from '../submit-clip'
import { abs, explainDiscord, type Message, siteUrl, postMessage } from './api'
import * as k from './cards'
import { getStartedMessage, rulesMessage, siteMessage, statusMessage, supportPanel } from './panels'
import { SAMPLES, SAMPLE_BY_ID } from './samples'
import { go as goBtn, goTarget, tidy } from './ui'
import { applyWording } from '../wording'
import { addUserReply, closeTicket, openTicket } from './tickets'
import { getDiscordConfig } from './config'
import { announceCampaign, logToDiscord, postTo, refreshStatus } from './outbound'
import { getInquiry, saveInquiry } from '../inquiries'
import { getCaps } from '../campaign-caps'
import { artistChannel, campaignChanged } from './campaigns'
import { evaluateBadges } from '../badges'
import { publicStats } from '../public-stats'
import { runHealth } from '../health'
import { setDmEnabled, unlinkDiscord, userByDiscord } from './link'
import { syncRoles } from './roles'

// ---------- Discord's shapes (only the parts we use) ----------
type DUser = { id: string; username: string; global_name?: string | null; avatar?: string | null }
type Option = { name: string; type: number; value?: string | number | boolean; options?: Option[]; focused?: boolean }
export type Interaction = {
  id: string
  application_id: string
  type: number
  token: string
  guild_id?: string
  channel_id?: string
  member?: { user: DUser; roles?: string[]; permissions?: string }
  user?: DUser
  data?: {
    name?: string
    custom_id?: string
    options?: Option[]
    resolved?: { users?: Record<string, DUser> }
    components?: { components: { custom_id: string; value: string }[] }[]
  }
  message?: { id: string }
}
export type Reply = { type: number; data?: Record<string, unknown> }
export type Env = { appId: string; defer: (work: () => Promise<Message>) => Reply }

// ---------- small helpers ----------
const EPHEMERAL = 64
const NO_EMBEDS = 4
export const say = (m: Message | string, ephemeral = true): Reply => {
  const data: Message = tidy(typeof m === 'string' ? { content: m } : m)
  return { type: 4, data: { ...data, allowed_mentions: data.allowed_mentions ?? { parse: [] }, ...(ephemeral ? { flags: EPHEMERAL } : {}) } }
}
const fail = (text: string) => say(k.problem(text))
const ok = (text: string, title?: string) => say(k.done(text, title))
const usd = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const modal = (id: string, title: string, inputs: { id: string; label: string; style: 1 | 2; min?: number; max?: number; required?: boolean; placeholder?: string }[]): Reply => ({
  type: 9,
  data: { custom_id: id, title, components: inputs.map((i) => ({ type: 1, components: [{ type: 4, custom_id: i.id, label: i.label, style: i.style, min_length: i.min ?? 1, max_length: i.max ?? 400, required: i.required ?? true, placeholder: i.placeholder }] })) },
})

const whoami = (i: Interaction): DUser => (i.member?.user ?? i.user) as DUser
const opt = (i: Interaction, name: string): string | number | boolean | undefined => {
  const walk = (list?: Option[]): Option | undefined => {
    for (const o of list ?? []) {
      if (o.name === name && o.value !== undefined) return o
      const deep = walk(o.options)
      if (deep) return deep
    }
    return undefined
  }
  return walk(i.data?.options)?.value
}
const sub = (i: Interaction) => i.data?.options?.[0]?.name ?? ''

type Me = { id: string; email: string; handle: string; name: string }
async function me(discordId: string): Promise<Me | null> {
  const userId = await userByDiscord(discordId)
  if (!userId) return null
  const d = await db()
  const r = await d.prepare("SELECT u.id, u.email, u.status, COALESCE(p.handle, '') AS handle, COALESCE(p.display_name, u.name, '') AS name FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?1").bind(userId).first<{ id: string; email: string; status: string; handle: string; name: string }>()
  if (!r || r.status !== 'active') return null
  return { id: r.id, email: r.email, handle: r.handle, name: r.name }
}
const notLinked = () => say(k.notLinkedCard())
const isTeam = async (m: Me) => (await rolesForEmail(m.email)).includes('admin')

// ---------- the commands, as Discord wants them for registration ----------
const S = 3 // string option
const U = 6 // user option
const choices = (...v: string[]) => v.map((x) => ({ name: x, value: x }))
const RAW_COMMANDS = [
  { name: 'help', description: 'What this bot can do', type: 1 },
  { name: 'link', description: 'Connect your logoless account to Discord', type: 1 },
  { name: 'unlink', description: 'Disconnect your logoless account from Discord', type: 1 },
  { name: 'profile', description: 'Show a logoless profile', type: 1, options: [{ type: U, name: 'member', description: 'Someone else in the server (leave empty for you)', required: false }] },
  { name: 'stats', description: 'Your submissions, views and earnings', type: 1 },
  { name: 'balance', description: 'What you can withdraw, and what is still clearing', type: 1 },
  { name: 'submissions', description: 'Your latest submissions and where they stand', type: 1 },
  { name: 'badges', description: 'Your badges, or someone else’s', type: 1, options: [{ type: U, name: 'member', description: 'Someone else in the server', required: false }] },
  { name: 'campaigns', description: 'Campaigns you can join right now', type: 1 },
  { name: 'campaign', description: 'All the details of one campaign', type: 1, options: [{ type: S, name: 'name', description: 'Which campaign', required: true, autocomplete: true }] },
  {
    name: 'submit',
    description: 'Send your content to a campaign',
    type: 1,
    options: [
      { type: S, name: 'campaign', description: 'Which campaign', required: true, autocomplete: true },
      { type: S, name: 'platform', description: 'Where you posted it', required: true, choices: choices('tiktok', 'youtube', 'instagram') },
      { type: S, name: 'url', description: 'The link to your post', required: true, max_length: 300 },
    ],
  },
  { name: 'leaderboard', description: 'Who is bringing in the most views', type: 1, options: [{ type: S, name: 'period', description: 'How far back', required: false, choices: choices('30 days', 'all time') }] },
  { name: 'earn', description: 'Work out what some views are worth', type: 1, options: [{ type: 4, name: 'views', description: 'How many views', required: true, min_value: 1, max_value: 1_000_000_000 }, { type: S, name: 'campaign', description: 'Which campaign’s rate to use', required: false, autocomplete: true }] },
  { name: 'faq', description: 'Answers to common questions', type: 1, options: [{ type: S, name: 'question', description: 'What you want to know', required: true, autocomplete: true }] },
  { name: 'support', description: 'Open a private ticket with the logoless team', type: 1, options: [{ type: S, name: 'message', description: 'What you need', required: true, max_length: 1000 }] },
  { name: 'status', description: 'Is everything at logoless working?', type: 1 },
  { name: 'rules', description: 'Post the server rules in this channel (team only)', type: 1, default_member_permissions: '8' },
  { name: 'site', description: 'Post the logoless site card in this channel (team only)', type: 1, default_member_permissions: '8' },
  {
    name: 'report',
    description: 'Report a submission, a campaign or a person',
    type: 1,
    options: [
      { type: S, name: 'what', description: 'What kind of problem', required: true, choices: [{ name: 'Fake or inflated views', value: 'fake-views' }, { name: 'Stolen content', value: 'copyright' }, { name: 'Scam or misleading', value: 'scam' }, { name: 'Harassment', value: 'abuse' }, { name: 'Pretending to be someone', value: 'impersonation' }, { name: 'Something else', value: 'custom' }] },
      { type: S, name: 'where', description: 'A link, a @handle or a campaign name', required: true, max_length: 200 },
      { type: S, name: 'details', description: 'What happened', required: false, max_length: 1000 },
    ],
  },
  { name: 'notifications', description: 'Get your logoless notifications as Discord messages', type: 1, options: [{ type: S, name: 'mode', description: 'On or off', required: true, choices: choices('on', 'off') }] },
  { name: 'sync', description: 'Refresh your roles in this server', type: 1 },
  { name: 'ping', description: 'Is the bot awake?', type: 1 },
  {
    name: 'admin',
    description: 'For the logoless team',
    type: 1,
    default_member_permissions: '8',
    options: [
      { type: 1, name: 'stats', description: 'The site at a glance' },
      { type: 1, name: 'queue', description: 'How many submissions are waiting, and for which campaigns' },
      { type: 1, name: 'lookup', description: 'Look someone up', options: [{ type: S, name: 'who', description: 'A @handle or an email', required: true }] },
      { type: 1, name: 'announce', description: 'Post an announcement in #news', options: [{ type: S, name: 'title', description: 'Headline', required: true, max_length: 200 }, { type: S, name: 'text', description: 'The message', required: true, max_length: 1500 }] },
      { type: 1, name: 'update', description: 'Post a product update in #updates', options: [{ type: S, name: 'title', description: 'Headline', required: true, max_length: 200 }, { type: S, name: 'text', description: 'What changed', required: true, max_length: 1500 }] },
      { type: 1, name: 'campaign', description: 'Pause, start or announce a campaign', options: [{ type: S, name: 'campaign', description: 'Which one', required: true, autocomplete: true }, { type: S, name: 'action', description: 'What to do', required: true, choices: choices('pause', 'resume', 'announce') }] },
      { type: 1, name: 'sync-all', description: 'Refresh everyone’s roles' },
      { type: 1, name: 'panel', description: 'Post a panel in this channel', options: [{ type: S, name: 'which', description: 'Which panel', required: true, choices: [{ name: 'Get started', value: 'start' }, { name: 'Support tickets', value: 'support' }, { name: 'Live status', value: 'status' }] }] },
      { type: 1, name: 'test', description: 'Show any message the bot can send, with made-up data', options: [{ type: S, name: 'which', description: 'Which message', required: true, autocomplete: true }] },
    ],
  },
]

// the site's wording is used in every description Discord shows (clip is submission or content, clipper is creator)
const localize = <T,>(v: T): T => {
  if (Array.isArray(v)) return v.map(localize) as T
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([key, val]) => [key, key === 'description' && typeof val === 'string' ? applyWording(val) : localize(val)])) as T
  return v
}
export const COMMANDS = localize(RAW_COMMANDS)

// ---------- the answers ----------
/** `/link`: connecting is done on logoless.io with Discord's own approval page (see connect.ts), so there is no code to type. */
async function cmdLink(i: Interaction): Promise<Reply> {
  const m = await me(whoami(i).id)
  return m ? ok('Your Discord is already connected to your logoless account.', 'Connected') : notLinked()
}

async function profileData(userId: string): Promise<k.ProfileData | null> {
  const d = await db()
  const p = await d.prepare('SELECT p.handle, p.display_name, p.bio, p.avatar_key, p.banner_kind, p.banner_value, p.badges_json, p.show_json, u.created_at FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?1').bind(userId).first<{ handle: string; display_name: string; bio: string; avatar_key: string | null; banner_kind: string; banner_value: string; badges_json: string; show_json: string; created_at: number }>()
  if (!p) return null
  const show = (() => {
    try {
      const j = JSON.parse(p.show_json) as Record<string, boolean>
      return { submissions: j.clips === true || j.submissions === true, views: j.views === true, earnings: j.earnings === true }
    } catch {
      return {}
    }
  })()
  const s = await profileStats(userId)
  const badges = (() => {
    try {
      return (JSON.parse(p.badges_json) as string[]).map((id) => BADGE_BY_ID[id]?.name).filter(Boolean) as string[]
    } catch {
      return []
    }
  })()
  return {
    name: p.display_name,
    handle: p.handle,
    bio: p.bio,
    avatar: p.avatar_key ? abs(`/api/img/${p.avatar_key}`) : undefined,
    banner: p.banner_kind === 'image' ? abs(`/api/img/${p.banner_value}`) : undefined,
    show,
    stats: { submissions: s.clips, views: s.views, earnedCents: s.earnedCents },
    badges,
    since: new Date(p.created_at * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
  }
}

async function cmdProfile(i: Interaction): Promise<Reply> {
  const target = opt(i, 'member') as string | undefined
  const id = target ?? whoami(i).id
  const userId = await userByDiscord(id)
  if (!userId) return target ? fail('That person has not linked a logoless account.') : notLinked()
  const p = await profileData(userId)
  return p ? say(k.profileCard(p), false) : fail('No profile yet.')
}

async function cmdStats(i: Interaction): Promise<Reply> {
  const m = await me(whoami(i).id)
  if (!m) return notLinked()
  const [s, b] = await Promise.all([profileStats(m.id), balances(m.id)])
  const d = await db()
  const week = await d.prepare('SELECT COALESCE(SUM(net_cents), 0) AS c FROM earnings WHERE clipper_user_id = ?1 AND created_at > ?2').bind(m.id, nowSec() - 7 * 86400).first<{ c: number }>()
  return say(k.statsCard({ name: m.name || m.handle, earnedCents: s.earnedCents, weekCents: week?.c ?? 0, availableCents: b.available, views: s.views, submissions: s.clips, campaigns: s.campaigns }))
}

async function cmdBalance(i: Interaction): Promise<Reply> {
  const m = await me(whoami(i).id)
  if (!m) return notLinked()
  const b = await balances(m.id)
  return say(k.balanceCard({ availableCents: b.available, pendingCents: b.pending, withdrawnCents: b.withdrawn, brandCents: b.brand }))
}

async function cmdSubmissions(i: Interaction): Promise<Reply> {
  const m = await me(whoami(i).id)
  if (!m) return notLinked()
  const d = await db()
  const rows = (await d.prepare('SELECT s.status, s.views_verified, s.earned_cents, s.platform, c.title FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1 ORDER BY s.created_at DESC LIMIT 8').bind(m.id).all<{ status: string; views_verified: number; earned_cents: number; platform: string; title: string }>()).results
  return say(k.submissionsCard(rows.map((r) => ({ status: r.status, title: r.title, platform: r.platform, views: r.views_verified, earnedCents: r.earned_cents }))))
}

async function cmdBadges(i: Interaction): Promise<Reply> {
  const target = opt(i, 'member') as string | undefined
  const userId = target ? await userByDiscord(target) : (await me(whoami(i).id))?.id
  if (!userId) return target ? fail('That person has not linked a logoless account.') : notLinked()
  const d = await db()
  const rows = (await d.prepare('SELECT badge_id FROM badges_unlocked WHERE user_id = ?1 ORDER BY unlocked_at').bind(userId).all<{ badge_id: string }>()).results
  const list = rows.map((r) => BADGE_BY_ID[r.badge_id]).filter(Boolean)
  return say(k.badgesCard(list.map((b) => ({ name: b.name, how: b.how, rarity: b.rarity })), Object.keys(BADGE_BY_ID).length))
}

async function cmdCampaigns(ephemeral = false): Promise<Reply> {
  const list = (await liveCampaigns()).slice(0, 10)
  return say(k.campaignsCard(list.map((c) => ({ id: c.id, title: c.title, creator: c.creator, ratePer1k: c.ratePer1k, leftPct: c.budgetLeftPct ?? 100, platforms: c.platforms }))), ephemeral)
}

async function cmdCampaign(i: Interaction): Promise<Reply> {
  const id = String(opt(i, 'name') ?? '')
  const c = (await liveCampaigns()).find((x) => x.id === id || x.title.toLowerCase() === id.toLowerCase())
  if (!c) return fail('I could not find a live campaign by that name.')
  return say(
    k.campaignDetailCard({
      id: c.id,
      title: c.title,
      creator: c.creator,
      summary: c.summary,
      cover: abs(c.cover),
      ratePer1k: c.ratePer1k,
      leftPct: c.budgetLeftPct ?? 100,
      platforms: c.platforms,
    }),
    false,
  )
}

async function cmdSubmit(i: Interaction, env: Env): Promise<Reply> {
  const m = await me(whoami(i).id)
  if (!m) return notLinked()
  const campaign = String(opt(i, 'campaign') ?? '')
  const platform = String(opt(i, 'platform') ?? '')
  const url = String(opt(i, 'url') ?? '')
  // the first look at a link can take a few seconds, longer than Discord waits for an answer, so say "thinking" and follow up
  return env.defer(async () => {
    try {
      const all = await liveCampaigns()
      const c = all.find((x) => x.id === campaign || x.title.toLowerCase() === campaign.toLowerCase())
      if (!c) return k.problem('I could not find a live campaign by that name.')
      const r = await submitClip({ id: m.id, email: m.email }, c.id, platform, url)
      return k.submitCard({ status: r.status === 'approved' ? 'approved' : r.status === 'declined' ? 'declined' : 'pending', campaign: r.campaign, reason: r.reason, checks: r.checks.map((x) => ({ label: x.label, state: x.state === 'pass' ? 'pass' : x.state === 'fail' ? 'fail' : 'skip' })) })
    } catch (e) {
      return k.problem(e instanceof HttpError ? e.message : 'Something went wrong. Please try again.')
    }
  })
}

async function cmdLeaderboard(i: Interaction): Promise<Reply> {
  const all = String(opt(i, 'period') ?? '30 days') === 'all time'
  const since = all ? 0 : nowSec() - 30 * 86400
  const d = await db()
  const rows = (
    await d
      .prepare(
        `SELECT p.handle, p.display_name, p.show_json, SUM(s.views_verified) AS views, COUNT(*) AS clips
         FROM submissions s JOIN profiles p ON p.user_id = s.user_id JOIN users u ON u.id = s.user_id
         WHERE s.status = 'approved' AND s.views_verified > 0 AND s.created_at >= ?1 AND u.status = 'active'
         GROUP BY s.user_id ORDER BY views DESC LIMIT 40`,
      )
      .bind(since)
      .all<{ handle: string; display_name: string; show_json: string; views: number; clips: number }>()
  ).results.filter((r) => {
    try {
      return JSON.parse(r.show_json).views === true // only people who chose to show their views
    } catch {
      return false
    }
  })
  return say(k.leaderboardCard(rows.map((r) => ({ name: r.display_name, handle: r.handle, views: r.views, submissions: r.clips })), all ? 'all time' : 'last 30 days'), false)
}

async function cmdEarn(i: Interaction): Promise<Reply> {
  const views = Number(opt(i, 'views') ?? 0)
  const camp = String(opt(i, 'campaign') ?? '')
  const live = await liveCampaigns()
  const c = camp ? live.find((x) => x.id === camp || x.title.toLowerCase() === camp.toLowerCase()) : null
  const rate = c ? c.ratePer1k : live.length ? live.reduce((a, x) => a + x.ratePer1k, 0) / live.length : 2.5
  return say(k.earnCard({ views, rate, campaign: c?.title, earnCents: Math.floor((views / 1000) * rate * 100), feePct: feeFor(10000) / 100 }))
}

const FLAT = Object.entries(FAQ).flatMap(([group, list]) => list.map((f) => ({ ...f, group })))
async function cmdFaq(i: Interaction): Promise<Reply> {
  const q = String(opt(i, 'question') ?? '').toLowerCase()
  const hit = FLAT.find((f) => f.q.toLowerCase() === q) ?? FLAT.find((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
  if (!hit) return fail('I do not have an answer for that. Try `/support` and a person will help.')
  return say(k.faqCard({ q: hit.q, a: hit.a, group: hit.group }), false)
}

async function cmdSupport(i: Interaction, textIn: string, kind: 'contact' | 'report' = 'contact', extra?: { topic: string; target: string }): Promise<Reply> {
  const u = whoami(i)
  const m = await me(u.id)
  const message = cleanText(textIn, 1500)
  if (message.length < 3) return fail('Tell us a little more.')
  if (kind === 'contact') {
    const r = await openTicket({ discordId: u.id, discordName: u.global_name ?? u.username, user: m ? { id: m.id, handle: m.handle, name: m.name } : null, subject: message.split('\n')[0].slice(0, 70), message })
    if (!r.ok) return fail(r.message)
    return say(k.ticketOpenedCard({ ref: r.inquiry.id, channelId: r.channelId, linked: Boolean(m) }))
  }
  const inq = await createInquiry({
    kind,
    topic: extra?.topic ?? 'discord',
    subject: 'Report from Discord',
    message: `${message}\n\n(sent from Discord by ${u.global_name ?? u.username}, id ${u.id})`,
    name: m?.name || u.global_name || u.username,
    userId: m?.id ?? null,
    handle: m?.handle ?? null,
    target: extra?.target ?? '',
  })
  const { notifyAdmins } = await import('../notify')
  await notifyAdmins({ title: 'New report from Discord', body: message.slice(0, 120), href: `/admin/inbox/${inq.id}`, dedupe: `inq-discord:${inq.id}` })
  await logToDiscord(`Report from <@${u.id}>: ${message.slice(0, 200)}`, 'mail')
  return say(k.reportSentCard({ ref: inq.id, linked: Boolean(m) }))
}

// Staff for the bot: a Discord administrator, or someone whose linked logoless account is an admin.
async function isStaff(i: Interaction): Promise<boolean> {
  try {
    if (BigInt(i.member?.permissions ?? '0') & BigInt(8)) return true
  } catch {
    /* no permissions field */
  }
  const m = await me(whoami(i).id)
  return Boolean(m && (await isTeam(m)))
}

async function cmdSync(i: Interaction): Promise<Reply> {
  const m = await me(whoami(i).id)
  if (!m) return notLinked()
  const r = await syncRoles(m.id)
  const text = r.ok ? (r.added.length || r.removed.length ? `Roles updated: ${r.added.length} added, ${r.removed.length} removed.` : (r.note ?? 'Your roles are already right.')) : (r.note ?? 'Could not update your roles.')
  return r.ok ? ok(text, 'Roles') : fail(text)
}

// ---------- the team's commands ----------
async function siteNow(): Promise<k.SiteNow> {
  const d = await db()
  const r = await d
    .prepare(
      `SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM users WHERE last_seen_at > ?1 - 300) AS now,
         (SELECT COUNT(*) FROM users WHERE created_at > ?1 - 86400) AS new24,
         (SELECT COUNT(*) FROM campaigns WHERE status = 'live') AS live, (SELECT COUNT(*) FROM campaigns WHERE status = 'requested') AS requests,
         (SELECT COUNT(*) FROM submissions WHERE status = 'pending') AS clips, (SELECT COUNT(*) FROM payouts WHERE status = 'review') AS payouts,
         (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger WHERE account = 'brand') AS brands, (SELECT COALESCE(SUM(amount_cents), 0) FROM ledger WHERE account = 'clipper') AS owed,
         (SELECT COALESCE(SUM(fee_cents), 0) FROM earnings) AS fees`,
    )
    .bind(nowSec())
    .first<Record<string, number>>()
  return { users: r?.users ?? 0, newToday: r?.new24 ?? 0, online: r?.now ?? 0, live: r?.live ?? 0, requests: r?.requests ?? 0, toReview: r?.clips ?? 0, held: r?.payouts ?? 0, brandCents: r?.brands ?? 0, owedCents: r?.owed ?? 0, feesCents: r?.fees ?? 0 }
}

async function queueRows() {
  // only a count per campaign: submissions are reviewed on the dashboard, never in Discord
  const d = await db()
  return (await d.prepare("SELECT c.title, COUNT(*) AS n FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.status = 'pending' AND c.id NOT LIKE 'mock-%' GROUP BY c.id ORDER BY n DESC, c.title LIMIT 20").all<{ title: string; n: number }>()).results
}

async function admin(i: Interaction): Promise<Reply> {
  const m = await me(whoami(i).id)
  if (!m || !(await isTeam(m))) return fail('This is for the logoless team. Connect your admin account on logoless.io first.')
  const d = await db()
  switch (sub(i)) {
    case 'stats':
      return say(k.siteNowCard(await siteNow()))
    case 'queue':
      return say(k.queueCard(await queueRows()))
    case 'lookup': {
      const who = String(opt(i, 'who') ?? '').trim().replace(/^@/, '').toLowerCase()
      const r = await d.prepare('SELECT u.id FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE lower(u.email) = ?1 OR p.handle = ?1 LIMIT 1').bind(who).first<{ id: string }>()
      if (!r) return fail('Nobody found.')
      const p = await profileData(r.id)
      if (!p) return fail('That person has no profile yet.')
      const msg = k.profileCard(p)
      return say({ ...msg, components: [{ type: 1, components: [goBtn('Manage', `https://owner.logoless.io/admin/people/${r.id}`), goBtn('Open profile', `/@${p.handle}`)] }] })
    }
    case 'announce':
    case 'update': {
      const where = sub(i) === 'announce' ? 'news' : 'updates'
      const posted = await postTo(where, { title: String(opt(i, 'title')), text: String(opt(i, 'text')) })
      return posted ? ok(`Posted in #${where}.`) : fail(`Could not post. Set the ${where} channel in the admin area, and check the bot can post there.`)
    }
    case 'campaign': {
      const id = String(opt(i, 'campaign') ?? '')
      const action = String(opt(i, 'action'))
      const c = await d.prepare('SELECT id, title, status FROM campaigns WHERE id = ?1 OR lower(title) = lower(?1)').bind(id).first<{ id: string; title: string; status: string }>()
      if (!c) return fail('No campaign by that name.')
      if (action === 'announce') {
        await announceCampaign(c.id)
        return ok(`Announced **${c.title}**.`)
      }
      if (action === 'pause' && c.status === 'live') await d.prepare("UPDATE campaigns SET status = 'paused', updated_at = ?2 WHERE id = ?1").bind(c.id, nowSec()).run()
      else if (action === 'resume' && c.status === 'paused') await d.prepare("UPDATE campaigns SET status = 'live', updated_at = ?2 WHERE id = ?1").bind(c.id, nowSec()).run()
      else return fail(`${c.title} is ${c.status}, so it cannot be ${action}d.`)
      if (action === 'pause') await d.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?1, 'admin', ?2) ON CONFLICT(key) DO UPDATE SET value = 'admin', updated_at = excluded.updated_at").bind(`paused-by:${c.id}`, nowSec()).run()
      else await d.prepare('DELETE FROM settings WHERE key = ?1').bind(`paused-by:${c.id}`).run()
      const { audit } = await import('../chain')
      await audit({ id: m.id, email: m.email }, `campaign.${action}`, c.id, 'from Discord')
      await logToDiscord(`${m.name || m.handle} ${action}d **${c.title}** from Discord.`, 'shield')
      return ok(`${c.title} is now ${action === 'pause' ? 'paused' : 'live'}.`)
    }
    case 'sync-all': {
      const users = (await d.prepare("SELECT value FROM settings WHERE key LIKE 'discord-user:%' LIMIT 60").all<{ value: string }>()).results
      let n = 0
      for (const u of users) {
        const r = await syncRoles(u.value)
        if (r.ok && (r.added.length || r.removed.length)) n++
      }
      return ok(`Checked ${users.length} linked members. ${n} had roles changed.`, 'Roles')
    }
    case 'panel': {
      const which = String(opt(i, 'which'))
      const cfg = await getDiscordConfig()
      const msg = which === 'start' ? getStartedMessage(cfg) : which === 'support' ? supportPanel() : statusMessage(await runHealth())
      const res = await postMessage(i.channel_id!, msg)
      return res.ok ? ok('Posted it here.') : fail(explainDiscord(res, 'this channel'))
    }
    case 'test': {
      const sample = SAMPLE_BY_ID[String(opt(i, 'which') ?? '')]
      return sample ? say(sample.build()) : fail('I do not have a sample by that name. Start typing and pick one from the list.')
    }
  }
  return fail('Unknown admin command.')
}

// ---------- joining a campaign ----------
/**
 * The Join campaign button. It saves the campaign to the person's favourites (which is what makes the site tell them when its budget
 * runs low, or it pauses or ends), sends them the brief and how to start, and counts them on the live card.
 */
async function joinCampaign(i: Interaction, campaignId: string): Promise<Reply> {
  const m = await me(whoami(i).id)
  if (!m) return notLinked()
  const d = await db()
  const c = await d.prepare("SELECT id, title, creator, rate_cents, summary, clip_this_json, off_limits_json, platforms_json, status FROM campaigns WHERE id = ?1").bind(campaignId).first<{ id: string; title: string; creator: string; rate_cents: number; summary: string; clip_this_json: string; off_limits_json: string; platforms_json: string; status: string }>()
  if (!c || c.status !== 'live') return fail('That campaign is not taking submissions right now.')
  const had = await d.prepare('SELECT 1 AS x FROM favorites WHERE user_id = ?1 AND campaign_id = ?2').bind(m.id, c.id).first()
  const count = await d.prepare('SELECT COUNT(*) AS n FROM favorites WHERE user_id = ?1').bind(m.id).first<{ n: number }>()
  if (!had && (count?.n ?? 0) >= 200) return fail('You have joined a lot of campaigns already. Remove some on the site first.')
  await d.prepare('INSERT OR IGNORE INTO favorites (user_id, campaign_id, created_at) VALUES (?1, ?2, ?3)').bind(m.id, c.id, nowSec()).run()
  if (!had) {
    await notify(m.id, { kind: 'campaign', title: `You joined ${c.title}`, body: 'We will tell you when its budget runs low, or it pauses or ends. Send your first piece of content any time.', href: `/campaign/${c.id}`, dedupe: `joined:${c.id}` })
    await evaluateBadges(m.id)
    await campaignChanged(c.id)
  }
  const channel = await artistChannel(c.creator, false)
  const cfg = await getDiscordConfig()
  return say(k.joinedCard({ id: c.id, title: c.title, already: Boolean(had), rateCents: c.rate_cents, channelId: channel && cfg.guildId ? channel : null, guildId: cfg.guildId }))
}

// ---------- buttons, forms and autocomplete ----------
async function component(i: Interaction): Promise<Reply> {
  const id = i.data?.custom_id ?? ''
  // "Open this" buttons: answer with the address, so the button itself is not a link (those always show an arrow)
  if (id.startsWith('go:')) {
    const t = goTarget(id, i.guild_id ?? (await getDiscordConfig()).guildId)
    return t ? { type: 4, data: { content: `[${t.label}](${t.url})`, flags: EPHEMERAL | NO_EMBEDS, allowed_mentions: { parse: [] } } } : fail('That button is out of date.')
  }
  // buttons that run a command for you
  if (id === 'cmd:stats') return cmdStats(i)
  if (id === 'cmd:balance') return cmdBalance(i)
  if (id === 'cmd:submissions') return cmdSubmissions(i)
  if (id === 'cmd:campaigns' || id === 'panel:campaigns') return cmdCampaigns(true)
  if (id === 'cmd:queue') return admin({ ...i, data: { ...i.data, options: [{ name: 'queue', type: 1 }] } })
  if (id === 'panel:link') return notLinked() // buttons on older messages
  if (id.startsWith('camp:join:')) return joinCampaign(i, id.split(':')[2])
  if (id === 'panel:support' || id === 'ticket:open') return modal('modal:ticket', 'Open a ticket', [{ id: 'subject', label: 'What is it about?', style: 1, min: 3, max: 80, placeholder: 'e.g. My withdrawal has not arrived' }, { id: 'text', label: 'Tell us what happened', style: 2, min: 3, max: 1000 }])
  if (id.startsWith('ticket:reply:')) {
    const inq = await getInquiry(id.split(':')[2])
    if (!inq?.discord) return fail('That ticket is closed.')
    return modal(`modal:ticketreply:${inq.id}`, 'Reply', [{ id: 'text', label: 'Your message', style: 2, min: 1, max: 1000 }])
  }
  if (id.startsWith('ticket:close:')) {
    const inq = await getInquiry(id.split(':')[2])
    if (!inq?.discord) return fail('That ticket is already closed.')
    const u = whoami(i)
    if (u.id !== inq.discord.userId && !(await isStaff(i))) return fail('Only the person who opened it, or the team, can close it.')
    await closeTicket(inq, u.global_name ?? u.username)
    return { type: 6 }
  }
  return fail('That button is out of date.')
}

async function modalSubmit(i: Interaction): Promise<Reply> {
  const id = i.data?.custom_id ?? ''
  const value = (name: string) => i.data?.components?.flatMap((r) => r.components).find((c) => c.custom_id === name)?.value ?? ''
  if (id === 'modal:support') return cmdSupport(i, value('text'))
  if (id === 'modal:ticket') {
    const u = whoami(i)
    const m = await me(u.id)
    const r = await openTicket({ discordId: u.id, discordName: u.global_name ?? u.username, user: m ? { id: m.id, handle: m.handle, name: m.name } : null, subject: value('subject'), message: value('text') })
    if (!r.ok) return fail(r.message)
    return say(k.ticketOpenedCard({ ref: r.inquiry.id, channelId: r.channelId, linked: Boolean(m) }))
  }
  if (id.startsWith('modal:ticketreply:')) {
    const inq = await getInquiry(id.split(':')[2])
    if (!inq?.discord) return fail('That ticket is closed.')
    const u = whoami(i)
    const text = value('text')
    if (u.id === inq.discord.userId) {
      const t = await addUserReply(inq, text)
      return say(k.memberReplyCard({ text: t }), false)
    }
    if (!(await isStaff(i))) return fail('Only the person who opened it, or the team, can reply here.')
    // a team member answering from Discord: the same as answering in the dashboard
    const m = await me(u.id)
    inq.replies.push({ by: 'admin', text: cleanText(text, 1500), at: nowSec() })
    inq.status = 'open'
    inq.adminSeen = true
    await saveInquiry(inq)
    if (inq.userId) await notify(inq.userId, { kind: 'account', title: `We replied: ${inq.subject}`.slice(0, 120), body: text.slice(0, 200), href: `/inquiry/${inq.id}`, dedupe: `inq-reply-user:${inq.id}:${inq.replies.length}` })
    return say(k.teamReplyCard({ text, ref: inq.id }), false)
  }
  return fail('That form is out of date.')
}

async function autocomplete(i: Interaction): Promise<Reply> {
  const focused = i.data?.options?.flatMap((o) => (o.options ? o.options : [o])).find((o) => o.focused)
  const q = String(focused?.value ?? '').toLowerCase()
  let list: { name: string; value: string }[] = []
  if (focused?.name === 'question') list = FLAT.filter((f) => !q || f.q.toLowerCase().includes(q)).map((f) => ({ name: f.q.slice(0, 100), value: f.q.slice(0, 100) }))
  else if (focused?.name === 'which') list = SAMPLES.filter((x) => !q || x.label.toLowerCase().includes(q) || x.group.toLowerCase().includes(q) || x.id.includes(q)).map((x) => ({ name: `${x.group}: ${x.label}`.slice(0, 100), value: x.id }))
  else list = (await liveCampaigns()).filter((c) => !q || c.title.toLowerCase().includes(q) || c.creator.toLowerCase().includes(q)).map((c) => ({ name: `${c.title} · ${c.creator}`.slice(0, 100), value: c.id }))
  return { type: 8, data: { choices: list.slice(0, 25) } }
}

/** One interaction in, one reply out. Every slow thing goes through `env.defer`. */
export async function handleInteraction(i: Interaction, env: Env): Promise<Reply> {
  try {
    if (i.type === 4) return await autocomplete(i)
    if (i.type === 3) return await component(i)
    if (i.type === 5) return await modalSubmit(i)
    const name = i.data?.name
    switch (name) {
      case 'help': return say(k.helpCard())
      case 'ping': return ok('Pong. I am awake.', 'Ping')
      case 'link': return await cmdLink(i)
      case 'unlink': {
        const m = await me(whoami(i).id)
        if (!m) return notLinked()
        await unlinkDiscord(m.id)
        return ok('Disconnected. You can connect again any time on logoless.io.', 'Unlinked')
      }
      case 'profile': return await cmdProfile(i)
      case 'stats': return await cmdStats(i)
      case 'balance': return await cmdBalance(i)
      case 'submissions':
      case 'clips': return await cmdSubmissions(i)
      case 'badges': return await cmdBadges(i)
      case 'campaigns': return await cmdCampaigns()
      case 'campaign': return await cmdCampaign(i)
      case 'submit': return await cmdSubmit(i, env)
      case 'leaderboard': return await cmdLeaderboard(i)
      case 'earn': return await cmdEarn(i)
      case 'faq': return await cmdFaq(i)
      case 'support': return await cmdSupport(i, String(opt(i, 'message') ?? ''))
      case 'report': {
        const what = String(opt(i, 'what') ?? 'custom')
        const where = String(opt(i, 'where') ?? '')
        return await cmdSupport(i, `${String(opt(i, 'details') ?? '')}\n\nAbout: ${where}`, 'report', { topic: what, target: where })
      }
      case 'notifications': {
        const m = await me(whoami(i).id)
        if (!m) return notLinked()
        const on = String(opt(i, 'mode')) === 'on'
        await setDmEnabled(m.id, on)
        return ok(on ? 'Your notifications will arrive as messages from me.' : 'I will stop sending you notifications. You still get them on the site.', 'Notifications')
      }
      case 'sync': return await cmdSync(i)
      case 'status': {
        const h = await runHealth()
        void refreshStatus(false)
        return say(statusMessage(h), true)
      }
      case 'rules': {
        if (!(await isStaff(i))) return fail('Only the team can post the rules.')
        const res = await postMessage(i.channel_id!, rulesMessage(await getDiscordConfig()))
        return res.ok ? ok('Posted the rules here.') : fail(explainDiscord(res, 'this channel'))
      }
      case 'site': {
        if (!(await isStaff(i))) return fail('Only the team can post the site card.')
        const stats = await publicStats()
        const res = await postMessage(i.channel_id!, siteMessage(stats))
        return res.ok ? ok('Posted the site card here.') : fail(explainDiscord(res, 'this channel'))
      }
      case 'admin': return await admin(i)
    }
    return fail('I do not know that command yet. Try `/help`.')
  } catch (e) {
    console.error('discord command failed', e instanceof Error ? e.message : e)
    return fail('Something went wrong on our side. Please try again in a moment.')
  }
}
