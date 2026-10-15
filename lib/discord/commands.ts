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
import { abs, type Embed, type Message, RED, siteUrl, GREEN, WHITE, postMessage } from './api'
import { getStartedMessage, rulesMessage, siteMessage, statusMessage, supportPanel } from './panels'
import { addUserReply, closeTicket, openTicket } from './tickets'
import { getDiscordConfig } from './config'
import { announceCampaign, logToDiscord, postTo, refreshStatus } from './outbound'
import { getInquiry, saveInquiry } from '../inquiries'
import { getCaps } from '../campaign-caps'
import { artistChannel, campaignChanged } from './campaigns'
import { evaluateBadges } from '../badges'
import { publicStats } from '../public-stats'
import { runHealth } from '../health'
import { consumeLinkCode, linkDiscord, setDmEnabled, unlinkDiscord, userByDiscord } from './link'
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
export const say = (m: Message | string, ephemeral = true): Reply => {
  const data: Message = typeof m === 'string' ? { content: m } : m
  return { type: 4, data: { ...data, allowed_mentions: { parse: [] }, ...(ephemeral ? { flags: EPHEMERAL } : {}) } }
}
const embedReply = (e: Embed, ephemeral = true, components?: Message['components']) => say({ embeds: [e], components }, ephemeral)
const fail = (text: string) => embedReply({ description: text, color: RED })
const usd = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const num = (n: number) => n.toLocaleString('en-US')
const link = (label: string, url: string) => ({ type: 1 as const, components: [{ type: 2 as const, style: 5 as const, label, url }] })
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
const notLinked = () =>
  embedReply({ title: 'Link your account first', description: `Open **Settings** on logoless.io, press **Connect Discord** and you get a code. Then type \`/link\` here with it.\n\nIf you signed in with Discord, you are already linked.`, color: WHITE, url: `${siteUrl}/dashboard/settings` })
const isTeam = async (m: Me) => (await rolesForEmail(m.email)).includes('admin')

// ---------- the commands, as Discord wants them for registration ----------
const S = 3 // string option
const U = 6 // user option
const choices = (...v: string[]) => v.map((x) => ({ name: x, value: x }))
export const COMMANDS = [
  { name: 'help', description: 'What this bot can do', type: 1 },
  { name: 'link', description: 'Connect your logoless account to Discord', type: 1, options: [{ type: S, name: 'code', description: 'The code from Settings on logoless.io', required: true, min_length: 6, max_length: 12 }] },
  { name: 'unlink', description: 'Disconnect your logoless account from Discord', type: 1 },
  { name: 'profile', description: 'Show a logoless profile', type: 1, options: [{ type: U, name: 'member', description: 'Someone else in the server (leave empty for you)', required: false }] },
  { name: 'stats', description: 'Your clips, views and earnings', type: 1 },
  { name: 'balance', description: 'What you can withdraw, and what is still clearing', type: 1 },
  { name: 'clips', description: 'Your latest clips and where they stand', type: 1 },
  { name: 'badges', description: 'Your badges, or someone else’s', type: 1, options: [{ type: U, name: 'member', description: 'Someone else in the server', required: false }] },
  { name: 'campaigns', description: 'Campaigns you can clip right now', type: 1 },
  { name: 'campaign', description: 'All the details of one campaign', type: 1, options: [{ type: S, name: 'name', description: 'Which campaign', required: true, autocomplete: true }] },
  {
    name: 'submit',
    description: 'Submit a clip to a campaign',
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
    description: 'Report a clip, a campaign or a person',
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
      { type: 1, name: 'queue', description: 'Clips waiting for a decision, with buttons' },
      { type: 1, name: 'lookup', description: 'Look someone up', options: [{ type: S, name: 'who', description: 'A @handle or an email', required: true }] },
      { type: 1, name: 'announce', description: 'Post an announcement in #news', options: [{ type: S, name: 'title', description: 'Headline', required: true, max_length: 200 }, { type: S, name: 'text', description: 'The message', required: true, max_length: 1500 }] },
      { type: 1, name: 'update', description: 'Post a product update in #updates', options: [{ type: S, name: 'title', description: 'Headline', required: true, max_length: 200 }, { type: S, name: 'text', description: 'What changed', required: true, max_length: 1500 }] },
      { type: 1, name: 'campaign', description: 'Pause, start or announce a campaign', options: [{ type: S, name: 'campaign', description: 'Which one', required: true, autocomplete: true }, { type: S, name: 'action', description: 'What to do', required: true, choices: choices('pause', 'resume', 'announce') }] },
      { type: 1, name: 'sync-all', description: 'Refresh everyone’s roles' },
      { type: 1, name: 'panel', description: 'Post a panel in this channel', options: [{ type: S, name: 'which', description: 'Which panel', required: true, choices: [{ name: 'Get started', value: 'start' }, { name: 'Support tickets', value: 'support' }, { name: 'Live status', value: 'status' }] }] },
    ],
  },
]

// ---------- the answers ----------
const helpText = () =>
  embedReply({
    title: 'logoless bot',
    description: 'Clip campaigns, your numbers and your payouts, right here in Discord.',
    color: WHITE,
    fields: [
      { name: 'Get started', value: '`/link` connect your account\n`/profile` `/stats` `/balance` `/badges`' },
      { name: 'Earn', value: '`/campaigns` what is live\n`/campaign` the brief\n`/submit` send a clip\n`/clips` where your clips stand\n`/earn` what views are worth' },
      { name: 'Community', value: '`/leaderboard` `/faq`\n`/support` `/report`' },
      { name: 'You', value: '`/notifications` DMs on or off\n`/sync` refresh your roles\n`/unlink`' },
    ],
    footer: { text: 'logoless.io' },
  })

async function cmdLink(i: Interaction, codeIn: string): Promise<Reply> {
  const u = whoami(i)
  const userId = await consumeLinkCode(codeIn)
  if (!userId) return fail('That code is not right, or it has expired. Get a new one in **Settings** on logoless.io.')
  try {
    await linkDiscord(userId, u.id)
  } catch (e) {
    return fail(e instanceof HttpError ? e.message : 'Could not link that.')
  }
  const m = await me(u.id)
  await notify(userId, { kind: 'account', title: 'Discord connected', body: `Linked to ${u.global_name ?? u.username}. You will get your notifications there too.`, href: '/dashboard/settings', dedupe: `discord-linked:${u.id}:${nowSec()}` })
  const synced = await syncRoles(userId)
  return embedReply({ title: 'You are linked', description: `Connected to **${m?.name || m?.handle || 'your account'}**${m?.handle ? ` (@${m.handle})` : ''}.${synced.added.length ? `\nRoles added: ${synced.added.length}.` : ''}\n\nTry \`/stats\`, \`/campaigns\` or \`/submit\`.`, color: GREEN })
}

async function profileEmbed(userId: string): Promise<Embed | null> {
  const d = await db()
  const p = await d.prepare('SELECT p.handle, p.display_name, p.bio, p.avatar_key, p.banner_kind, p.banner_value, p.accent, p.badges_json, p.show_json, u.created_at FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?1').bind(userId).first<{ handle: string; display_name: string; bio: string; avatar_key: string | null; banner_kind: string; banner_value: string; accent: string; badges_json: string; show_json: string; created_at: number }>()
  if (!p) return null
  const show = (() => {
    try {
      return JSON.parse(p.show_json) as Record<string, boolean>
    } catch {
      return {}
    }
  })()
  const s = await profileStats(userId)
  const badges = (() => {
    try {
      return (JSON.parse(p.badges_json) as string[]).map((id) => BADGE_BY_ID[id]?.name).filter(Boolean)
    } catch {
      return []
    }
  })()
  const fields: { name: string; value: string; inline: boolean }[] = []
  if (show.clips) fields.push({ name: 'Clips', value: num(s.clips), inline: true })
  if (show.views) fields.push({ name: 'Views', value: num(s.views), inline: true })
  if (show.earnings) fields.push({ name: 'Earned', value: usd(s.earnedCents), inline: true })
  if (badges.length) fields.push({ name: 'Badges', value: badges.join(' · '), inline: false })
  const color = /^#[0-9a-f]{6}$/i.test(p.accent) ? parseInt(p.accent.slice(1), 16) : WHITE
  return {
    title: p.display_name,
    url: `${siteUrl}/@${p.handle}`,
    description: [`@${p.handle}`, p.bio].filter(Boolean).join('\n'),
    color,
    thumbnail: p.avatar_key ? { url: abs(`/api/img/${p.avatar_key}`)! } : undefined,
    image: p.banner_kind === 'image' ? { url: abs(`/api/img/${p.banner_value}`)! } : undefined,
    fields,
    footer: { text: `Member since ${new Date(p.created_at * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` },
  }
}

async function cmdProfile(i: Interaction): Promise<Reply> {
  const target = opt(i, 'member') as string | undefined
  const id = target ?? whoami(i).id
  const userId = await userByDiscord(id)
  if (!userId) return target ? fail('That person has not linked a logoless account.') : notLinked()
  const e = await profileEmbed(userId)
  return e ? embedReply(e, false, [link('Open profile', e.url!)]) : fail('No profile yet.')
}

async function cmdStats(i: Interaction): Promise<Reply> {
  const m = await me(whoami(i).id)
  if (!m) return notLinked()
  const [s, b] = await Promise.all([profileStats(m.id), balances(m.id)])
  const d = await db()
  const week = await d.prepare("SELECT COALESCE(SUM(net_cents), 0) AS c FROM earnings WHERE clipper_user_id = ?1 AND created_at > ?2").bind(m.id, nowSec() - 7 * 86400).first<{ c: number }>()
  return embedReply({
    title: `${m.name || m.handle}'s numbers`,
    color: WHITE,
    fields: [
      { name: 'Clips', value: num(s.clips), inline: true },
      { name: 'Verified views', value: num(s.views), inline: true },
      { name: 'Campaigns', value: num(s.campaigns), inline: true },
      { name: 'Earned in total', value: usd(s.earnedCents), inline: true },
      { name: 'Earned this week', value: usd(week?.c ?? 0), inline: true },
      { name: 'Ready to withdraw', value: usd(b.available), inline: true },
    ],
    url: `${siteUrl}/dashboard`,
  })
}

async function cmdBalance(i: Interaction): Promise<Reply> {
  const m = await me(whoami(i).id)
  if (!m) return notLinked()
  const b = await balances(m.id)
  const fields = [
    { name: 'Ready to withdraw', value: usd(b.available), inline: true },
    { name: 'Still clearing', value: usd(b.pending), inline: true },
    { name: 'Withdrawn so far', value: usd(b.withdrawn), inline: true },
  ]
  if (b.brand > 0) fields.push({ name: 'Brand balance', value: usd(b.brand), inline: true })
  return embedReply({ title: 'Your balance', color: WHITE, fields, description: 'Withdraw from **Earnings** on logoless.io. We pay PayPal’s fees, so the whole amount arrives.', url: `${siteUrl}/dashboard/earnings` })
}

async function cmdClips(i: Interaction): Promise<Reply> {
  const m = await me(whoami(i).id)
  if (!m) return notLinked()
  const d = await db()
  const rows = (await d.prepare('SELECT s.status, s.views_verified, s.earned_cents, s.platform, c.title FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1 ORDER BY s.created_at DESC LIMIT 8').bind(m.id).all<{ status: string; views_verified: number; earned_cents: number; platform: string; title: string }>()).results
  if (!rows.length) return embedReply({ description: 'No clips yet. Pick a campaign with `/campaigns` and send your first with `/submit`.', color: WHITE })
  const mark = { approved: '🟢', pending: '🟡', rejected: '🔴' } as Record<string, string>
  return embedReply({ title: 'Your latest clips', color: WHITE, url: `${siteUrl}/dashboard/submissions`, description: rows.map((r) => `${mark[r.status] ?? '⚪'} **${r.title}** · ${r.platform} · ${num(r.views_verified)} views · ${usd(r.earned_cents)}`).join('\n') })
}

async function cmdBadges(i: Interaction): Promise<Reply> {
  const target = opt(i, 'member') as string | undefined
  const userId = target ? await userByDiscord(target) : (await me(whoami(i).id))?.id
  if (!userId) return target ? fail('That person has not linked a logoless account.') : notLinked()
  const d = await db()
  const rows = (await d.prepare('SELECT badge_id FROM badges_unlocked WHERE user_id = ?1 ORDER BY unlocked_at').bind(userId).all<{ badge_id: string }>()).results
  const list = rows.map((r) => BADGE_BY_ID[r.badge_id]).filter(Boolean)
  if (!list.length) return embedReply({ description: 'No badges yet. The first one is one clip away.', color: WHITE })
  const mark = { common: '◽', rare: '🔹', epic: '🔶', legendary: '✨' } as const
  return embedReply({ title: `${list.length} of ${Object.keys(BADGE_BY_ID).length} badges`, color: WHITE, description: list.map((b) => `${mark[b.rarity]} **${b.name}** — ${b.how}`).join('\n').slice(0, 4000), url: `${siteUrl}/dashboard/achievements` })
}

async function cmdCampaigns(): Promise<Reply> {
  const list = (await liveCampaigns()).slice(0, 10)
  if (!list.length) return embedReply({ description: 'Nothing is live right now. Check back soon.', color: WHITE })
  return embedReply(
    {
      title: 'Live campaigns',
      color: WHITE,
      url: siteUrl,
      description: list.map((c) => `**[${c.title}](${siteUrl}/campaign/${c.id})** · ${c.creator}\n$${c.ratePer1k.toFixed(2)} per 1,000 views · ${c.budgetLeftPct ?? 100}% of budget left · ${c.platforms.join(', ')}`).join('\n\n'),
      footer: { text: 'Use /campaign for the brief, /submit to send a clip' },
    },
    false,
  )
}

async function cmdCampaign(i: Interaction): Promise<Reply> {
  const id = String(opt(i, 'name') ?? '')
  const c = (await liveCampaigns()).find((x) => x.id === id || x.title.toLowerCase() === id.toLowerCase())
  if (!c) return fail('I could not find a live campaign by that name.')
  const capText = [c.capPerPost ? `$${c.capPerPost.toLocaleString('en-US')} per clip` : '', c.capPerUser ? `$${c.capPerUser.toLocaleString('en-US')} per clipper` : ''].filter(Boolean).join(' · ')
  return embedReply(
    {
      title: c.title,
      url: `${siteUrl}/campaign/${c.id}`,
      description: c.summary,
      color: WHITE,
      thumbnail: { url: abs(c.cover)! },
      fields: [
        { name: 'Pays', value: `$${c.ratePer1k.toFixed(2)} per 1,000 views`, inline: true },
        { name: 'Budget left', value: `${c.budgetLeftPct ?? 100}%`, inline: true },
        { name: 'Platforms', value: c.platforms.join(', '), inline: true },
        ...(capText ? [{ name: 'Limits', value: `Up to ${capText}`, inline: false }] : []),
        ...(c.clipThis.length ? [{ name: 'Clip this', value: c.clipThis.map((x) => `• ${x}`).join('\n').slice(0, 1000), inline: false }] : []),
        ...(c.offLimits.length ? [{ name: 'Off limits', value: c.offLimits.map((x) => `• ${x}`).join('\n').slice(0, 1000), inline: false }] : []),
      ],
      footer: { text: c.creator },
    },
    false,
    [link('Open the campaign', `${siteUrl}/campaign/${c.id}`)],
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
      if (!c) return { embeds: [{ description: 'I could not find a live campaign by that name.', color: RED }] }
      const r = await submitClip({ id: m.id, email: m.email }, c.id, platform, url)
      const checks = r.checks.map((k) => `${k.state === 'pass' ? '✅' : k.state === 'fail' ? '⚠️' : '➖'} ${k.label}`).join('\n')
      const head = r.status === 'approved' ? 'Clip approved' : r.status === 'declined' ? 'Clip not approved' : 'Clip sent for review'
      const body = r.status === 'approved' ? 'Our team confirms the views before you are paid.' : r.status === 'declined' ? (r.reason ?? '') : 'A person will look at it soon. You will get a message here when it is decided.'
      return { embeds: [{ title: `${head}: ${r.campaign}`, description: `${body}\n\n${checks}`, color: r.status === 'declined' ? RED : r.status === 'approved' ? GREEN : WHITE, url: `${siteUrl}/dashboard/submissions` }] }
    } catch (e) {
      return { embeds: [{ description: e instanceof HttpError ? e.message : 'Something went wrong. Please try again.', color: RED }] }
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
  if (!rows.length) return embedReply({ description: 'Nobody is on the board yet.', color: WHITE }, false)
  const medal = ['🥇', '🥈', '🥉']
  return embedReply(
    { title: `Top clippers, ${all ? 'all time' : 'last 30 days'}`, color: WHITE, url: `${siteUrl}/leaderboard`, description: rows.slice(0, 10).map((r, n) => `${medal[n] ?? `**${n + 1}.**`} [${r.display_name}](${siteUrl}/@${r.handle}) · ${num(r.views)} views · ${r.clips} clips`).join('\n'), footer: { text: 'Only people who show their views are listed' } },
    false,
  )
}

async function cmdEarn(i: Interaction): Promise<Reply> {
  const views = Number(opt(i, 'views') ?? 0)
  const camp = String(opt(i, 'campaign') ?? '')
  const live = await liveCampaigns()
  const c = camp ? live.find((x) => x.id === camp || x.title.toLowerCase() === camp.toLowerCase()) : null
  const rate = c ? c.ratePer1k : live.length ? live.reduce((a, x) => a + x.ratePer1k, 0) / live.length : 2.5
  const earn = Math.floor((views / 1000) * rate * 100)
  return embedReply({
    title: `${num(views)} views ≈ ${usd(earn)}`,
    description: `At **$${rate.toFixed(2)} per 1,000 views**${c ? ` on **${c.title}**` : ' (the average of live campaigns)'}. You keep all of it: the brand pays our ${feeFor(10000) / 100}% fee on top, and we cover PayPal’s fees.`,
    color: WHITE,
  })
}

const FLAT = Object.entries(FAQ).flatMap(([group, list]) => list.map((f) => ({ ...f, group })))
async function cmdFaq(i: Interaction): Promise<Reply> {
  const q = String(opt(i, 'question') ?? '').toLowerCase()
  const hit = FLAT.find((f) => f.q.toLowerCase() === q) ?? FLAT.find((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
  if (!hit) return fail('I do not have an answer for that. Try `/support` and a person will help.')
  return embedReply({ title: hit.q, description: hit.a.slice(0, 3900), color: WHITE, url: `${siteUrl}/faq`, footer: { text: hit.group } }, false)
}

async function cmdSupport(i: Interaction, textIn: string, kind: 'contact' | 'report' = 'contact', extra?: { topic: string; target: string }): Promise<Reply> {
  const u = whoami(i)
  const m = await me(u.id)
  const message = cleanText(textIn, 1500)
  if (message.length < 3) return fail('Tell us a little more.')
  if (kind === 'contact') {
    const r = await openTicket({ discordId: u.id, discordName: u.global_name ?? u.username, user: m ? { id: m.id, handle: m.handle, name: m.name } : null, subject: message.split('\n')[0].slice(0, 70), message })
    if (!r.ok) return fail(r.message)
    return embedReply({ title: 'Ticket opened', description: r.channelId ? `Your private channel is <#${r.channelId}>. The team answers there and you will be pinged.` : `The team has it (reference \`${r.inquiry.id}\`). ${m ? 'We will answer in your logoless notifications, and here if you have DMs on.' : 'Link your account with `/link` to get the answer here.'}`, color: GREEN })
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
  await logToDiscord(`📨 Report from <@${u.id}>: ${message.slice(0, 200)}`)
  return embedReply({ title: 'Report sent', description: `The team has it (reference \`${inq.id}\`). ${m ? 'We will answer in your logoless notifications, and here if you have DMs on.' : 'Link your account with `/link` if you want the answer here.'}`, color: GREEN })
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
  return embedReply({ description: r.ok ? (r.added.length || r.removed.length ? `Roles updated: ${r.added.length} added, ${r.removed.length} removed.` : (r.note ?? 'Your roles are already right.')) : (r.note ?? 'Could not update your roles.'), color: r.ok ? GREEN : RED })
}

// ---------- the team's commands ----------
async function admin(i: Interaction): Promise<Reply> {
  const m = await me(whoami(i).id)
  if (!m || !(await isTeam(m))) return fail('This is for the logoless team. Link your admin account with `/link` first.')
  const d = await db()
  switch (sub(i)) {
    case 'stats': {
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
      return embedReply({
        title: 'The site right now',
        color: WHITE,
        fields: [
          { name: 'Members', value: `${num(r?.users ?? 0)} (${r?.new24 ?? 0} new today)`, inline: true },
          { name: 'Online now', value: num(r?.now ?? 0), inline: true },
          { name: 'Live campaigns', value: `${r?.live ?? 0} (${r?.requests ?? 0} requests)`, inline: true },
          { name: 'Clips to review', value: num(r?.clips ?? 0), inline: true },
          { name: 'Withdrawals held', value: num(r?.payouts ?? 0), inline: true },
          { name: 'Brand balances', value: usd(r?.brands ?? 0), inline: true },
          { name: 'Owed to clippers', value: usd(r?.owed ?? 0), inline: true },
          { name: 'Fees earned', value: usd(r?.fees ?? 0), inline: true },
        ],
        url: 'https://owner.logoless.io/admin',
      })
    }
    case 'queue': {
      const rows = (await d.prepare("SELECT s.id, s.platform, s.url, c.title, p.handle FROM submissions s JOIN campaigns c ON c.id = s.campaign_id LEFT JOIN profiles p ON p.user_id = s.user_id WHERE s.status = 'pending' ORDER BY s.created_at LIMIT 5").all<{ id: string; platform: string; url: string; title: string; handle: string | null }>()).results
      if (!rows.length) return embedReply({ description: 'No clips are waiting. 🎉', color: GREEN })
      // one message per clip, each with its own buttons
      const cfg = await getDiscordConfig()
      const channel = i.channel_id ?? cfg.channels.clips
      for (const r of rows) {
        await postMessage(channel, {
          embeds: [{ title: r.title, url: r.url, description: `${r.platform} · ${r.handle ? `@${r.handle}` : 'someone'}\n${r.url}`, color: WHITE }],
          components: [{ type: 1, components: [{ type: 2, style: 3, label: 'Approve', custom_id: `adm:clip:approve:${r.id}` }, { type: 2, style: 4, label: 'Decline', custom_id: `adm:clip:reject:${r.id}` }] }],
        })
      }
      return embedReply({ description: `Posted ${rows.length} clip${rows.length > 1 ? 's' : ''} for review.`, color: GREEN })
    }
    case 'lookup': {
      const who = String(opt(i, 'who') ?? '').trim().replace(/^@/, '').toLowerCase()
      const r = await d.prepare('SELECT u.id FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE lower(u.email) = ?1 OR p.handle = ?1 LIMIT 1').bind(who).first<{ id: string }>()
      if (!r) return fail('Nobody found.')
      const e = await profileEmbed(r.id)
      return embedReply({ ...(e ?? { title: who }), url: `https://owner.logoless.io/admin/people/${r.id}`, footer: { text: 'Open to manage' } })
    }
    case 'announce':
    case 'update': {
      const where = sub(i) === 'announce' ? 'news' : 'updates'
      const ok = await postTo(where, { title: String(opt(i, 'title')), text: String(opt(i, 'text')) })
      return ok ? embedReply({ description: `Posted in #${where}.`, color: GREEN }) : fail(`Could not post. Set the ${where} channel in the admin area, and check the bot can post there.`)
    }
    case 'campaign': {
      const id = String(opt(i, 'campaign') ?? '')
      const action = String(opt(i, 'action'))
      const c = await d.prepare('SELECT id, title, status FROM campaigns WHERE id = ?1 OR lower(title) = lower(?1)').bind(id).first<{ id: string; title: string; status: string }>()
      if (!c) return fail('No campaign by that name.')
      if (action === 'announce') {
        await announceCampaign(c.id)
        return embedReply({ description: `Announced **${c.title}**.`, color: GREEN })
      }
      if (action === 'pause' && c.status === 'live') await d.prepare("UPDATE campaigns SET status = 'paused', updated_at = ?2 WHERE id = ?1").bind(c.id, nowSec()).run()
      else if (action === 'resume' && c.status === 'paused') await d.prepare("UPDATE campaigns SET status = 'live', updated_at = ?2 WHERE id = ?1").bind(c.id, nowSec()).run()
      else return fail(`${c.title} is ${c.status}, so it cannot be ${action}d.`)
      if (action === 'pause') await d.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?1, 'admin', ?2) ON CONFLICT(key) DO UPDATE SET value = 'admin', updated_at = excluded.updated_at").bind(`paused-by:${c.id}`, nowSec()).run()
      else await d.prepare('DELETE FROM settings WHERE key = ?1').bind(`paused-by:${c.id}`).run()
      const { audit } = await import('../chain')
      await audit({ id: m.id, email: m.email }, `campaign.${action}`, c.id, 'from Discord')
      await logToDiscord(`🔧 ${m.name || m.handle} ${action}d **${c.title}** from Discord.`)
      return embedReply({ description: `${c.title} is now ${action === 'pause' ? 'paused' : 'live'}.`, color: GREEN })
    }
    case 'sync-all': {
      const users = (await d.prepare("SELECT value FROM settings WHERE key LIKE 'discord-user:%' LIMIT 60").all<{ value: string }>()).results
      let n = 0
      for (const u of users) {
        const r = await syncRoles(u.value)
        if (r.ok && (r.added.length || r.removed.length)) n++
      }
      return embedReply({ description: `Checked ${users.length} linked members. ${n} had roles changed.`, color: GREEN })
    }
    case 'panel': {
      const which = String(opt(i, 'which'))
      const cfg = await getDiscordConfig()
      const msg = which === 'start' ? getStartedMessage(cfg) : which === 'support' ? supportPanel() : statusMessage(await runHealth())
      const res = await postMessage(i.channel_id!, msg)
      return res.ok ? embedReply({ description: 'Posted it here.', color: GREEN }) : fail('Discord would not take it. Does the bot have permission to post in this channel?')
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
  if (!c || c.status !== 'live') return fail('That campaign is not taking clips right now.')
  const had = await d.prepare('SELECT 1 AS x FROM favorites WHERE user_id = ?1 AND campaign_id = ?2').bind(m.id, c.id).first()
  const count = await d.prepare('SELECT COUNT(*) AS n FROM favorites WHERE user_id = ?1').bind(m.id).first<{ n: number }>()
  if (!had && (count?.n ?? 0) >= 200) return fail('You have joined a lot of campaigns already. Remove some on the site first.')
  await d.prepare('INSERT OR IGNORE INTO favorites (user_id, campaign_id, created_at) VALUES (?1, ?2, ?3)').bind(m.id, c.id, nowSec()).run()
  if (!had) {
    await notify(m.id, { kind: 'campaign', title: `You joined ${c.title}`, body: 'We will tell you when its budget runs low, or it pauses or ends. Send your first clip any time.', href: `/campaign/${c.id}`, dedupe: `joined:${c.id}` })
    await evaluateBadges(m.id)
    await campaignChanged(c.id)
  }
  const list = (j: string) => {
    try {
      return (JSON.parse(j) as string[]).slice(0, 5).map((x) => `• ${x}`).join('\n')
    } catch {
      return ''
    }
  }
  const [caps, channel] = await Promise.all([getCaps(c.id), artistChannel(c.creator, false)])
  const cfg = await getDiscordConfig()
  const limits = [caps.perPostCents ? `${usd(caps.perPostCents)} per clip` : '', caps.perUserCents ? `${usd(caps.perUserCents)} per clipper` : ''].filter(Boolean).join(' · ')
  const clipThis = list(c.clip_this_json)
  const off = list(c.off_limits_json)
  return embedReply(
    {
      title: had ? `You are already in: ${c.title}` : `You joined ${c.title}`,
      description: `${c.summary.slice(0, 400)}${c.summary.length > 400 ? '…' : ''}`,
      color: GREEN,
      fields: [
        { name: 'Pays', value: `${usd(c.rate_cents)} per 1,000 views${limits ? `\nUp to ${limits}` : ''}`, inline: false },
        ...(clipThis ? [{ name: 'Clip this', value: clipThis, inline: true }] : []),
        ...(off ? [{ name: 'Off limits', value: off, inline: true }] : []),
        { name: 'Next', value: `**1.** Make a clip and post it on your own account.\n**2.** Send it with \`/submit campaign:${c.title}\`.\n**3.** Approved views turn into money.${channel ? `\n\nFollow the live numbers in <#${channel}>.` : ''}\n\nYou will get its updates in your notifications${cfg.dm ? ' here and on the site' : ''}.`, inline: false },
      ],
    },
    true,
    [{ type: 1, components: [{ type: 2, style: 5, label: 'Open campaign', url: `${siteUrl}/campaign/${c.id}` }, { type: 2, style: 5, label: 'Rules', url: `${siteUrl}/legal/campaign-rules` }, ...(channel && cfg.guildId ? [{ type: 2 as const, style: 5 as const, label: 'Artist channel', url: `https://discord.com/channels/${cfg.guildId}/${channel}` }] : [])] }],
  )
}

// ---------- buttons, forms and autocomplete ----------
async function component(i: Interaction): Promise<Reply> {
  const id = i.data?.custom_id ?? ''
  if (id === 'panel:link') return modal('modal:link', 'Link your logoless account', [{ id: 'code', label: 'The code from Settings on logoless.io', style: 1, min: 6, max: 12, placeholder: 'ABCD2345' }])
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
  if (id === 'panel:campaigns') return cmdCampaigns()
  if (id.startsWith('adm:clip:')) {
    const [, , action, clipId] = id.split(':')
    const m = await me(whoami(i).id)
    if (!m || !(await isTeam(m))) return fail('This is for the logoless team.')
    if (action === 'reject') return modal(`modal:clipreject:${clipId}`, 'Decline this clip', [{ id: 'reason', label: 'Why? The clipper will see this.', style: 2, min: 3, max: 200 }])
    const d = await db()
    const s = await d.prepare("SELECT s.user_id, c.title FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.id = ?1 AND s.status = 'pending'").bind(clipId).first<{ user_id: string; title: string }>()
    if (!s) return { type: 7, data: { content: 'Already decided.', embeds: [], components: [] } }
    await d.prepare("UPDATE submissions SET status = 'approved', reviewed_by = ?2, reviewed_at = ?3 WHERE id = ?1 AND status = 'pending'").bind(clipId, m.email, nowSec()).run()
    await notify(s.user_id, { kind: 'submission', title: `Clip approved (${s.title})`, body: 'It is now earning.', href: '/dashboard/submissions', dedupe: `sub-approved:${clipId}` })
    return { type: 7, data: { content: `✅ Approved by ${m.name || m.handle}.`, embeds: [], components: [] } }
  }
  return fail('That button is out of date.')
}

async function modalSubmit(i: Interaction): Promise<Reply> {
  const id = i.data?.custom_id ?? ''
  const value = (name: string) => i.data?.components?.flatMap((r) => r.components).find((c) => c.custom_id === name)?.value ?? ''
  if (id === 'modal:link') return cmdLink(i, value('code'))
  if (id === 'modal:support') return cmdSupport(i, value('text'))
  if (id === 'modal:ticket') {
    const u = whoami(i)
    const m = await me(u.id)
    const r = await openTicket({ discordId: u.id, discordName: u.global_name ?? u.username, user: m ? { id: m.id, handle: m.handle, name: m.name } : null, subject: value('subject'), message: value('text') })
    if (!r.ok) return fail(r.message)
    return embedReply({ title: 'Ticket opened', description: r.channelId ? `Your private channel is <#${r.channelId}>. The team answers there and you will be pinged.` : `The team has it (reference \`${r.inquiry.id}\`). Link your account with \`/link\` to get the answer here.`, color: GREEN })
  }
  if (id.startsWith('modal:ticketreply:')) {
    const inq = await getInquiry(id.split(':')[2])
    if (!inq?.discord) return fail('That ticket is closed.')
    const u = whoami(i)
    const text = value('text')
    if (u.id === inq.discord.userId) {
      const t = await addUserReply(inq, text)
      return say({ embeds: [{ description: t, color: WHITE, author: { name: u.global_name ?? u.username } }] }, false)
    }
    if (!(await isStaff(i))) return fail('Only the person who opened it, or the team, can reply here.')
    // a team member answering from Discord: the same as answering in the dashboard
    const m = await me(u.id)
    inq.replies.push({ by: 'admin', text: cleanText(text, 1500), at: nowSec() })
    inq.status = 'open'
    inq.adminSeen = true
    await saveInquiry(inq)
    if (inq.userId) await notify(inq.userId, { kind: 'account', title: `We replied: ${inq.subject}`.slice(0, 120), body: text.slice(0, 200), href: `/inquiry/${inq.id}`, dedupe: `inq-reply-user:${inq.id}:${inq.replies.length}` })
    return say({ content: `<@${inq.discord.userId}>`, embeds: [{ description: text, color: GREEN, author: { name: `${m?.name || u.global_name || u.username} · logoless team` } }], allowed_mentions: { users: [inq.discord.userId] } }, false)
  }
  if (id.startsWith('modal:clipreject:')) {
    const clipId = id.split(':')[2]
    const m = await me(whoami(i).id)
    if (!m || !(await isTeam(m))) return fail('This is for the logoless team.')
    const d = await db()
    const s = await d.prepare("SELECT s.user_id, s.views_verified, c.title FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.id = ?1 AND s.status = 'pending'").bind(clipId).first<{ user_id: string; views_verified: number; title: string }>()
    if (!s) return fail('Already decided.')
    const reason = cleanText(value('reason'), 200)
    await d.prepare("UPDATE submissions SET status = 'rejected', reject_reason = ?2, reviewed_by = ?3, reviewed_at = ?4 WHERE id = ?1").bind(clipId, reason, m.email, nowSec()).run()
    await notify(s.user_id, { kind: 'submission', title: `A clip was not approved (${s.title})`, body: reason, href: '/dashboard/submissions', dedupe: `sub-rejected:${clipId}` })
    return say(`❌ Declined: ${reason}`)
  }
  return fail('That form is out of date.')
}

async function autocomplete(i: Interaction): Promise<Reply> {
  const focused = i.data?.options?.flatMap((o) => (o.options ? o.options : [o])).find((o) => o.focused)
  const q = String(focused?.value ?? '').toLowerCase()
  let list: { name: string; value: string }[] = []
  if (focused?.name === 'question') list = FLAT.filter((f) => !q || f.q.toLowerCase().includes(q)).map((f) => ({ name: f.q.slice(0, 100), value: f.q.slice(0, 100) }))
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
      case 'help': return helpText()
      case 'ping': return say('Pong. I am awake.')
      case 'link': return await cmdLink(i, String(opt(i, 'code') ?? ''))
      case 'unlink': {
        const m = await me(whoami(i).id)
        if (!m) return notLinked()
        await unlinkDiscord(m.id)
        return embedReply({ description: 'Unlinked. You can link again any time with a new code.', color: GREEN })
      }
      case 'profile': return await cmdProfile(i)
      case 'stats': return await cmdStats(i)
      case 'balance': return await cmdBalance(i)
      case 'clips': return await cmdClips(i)
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
        return embedReply({ description: on ? 'Done. Your notifications will arrive as messages from me.' : 'Done. I will stop sending you notifications. You still get them on the site.', color: GREEN })
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
        return res.ok ? embedReply({ description: 'Posted the rules here.', color: GREEN }) : fail('Discord would not take it. Does the bot have permission to post in this channel?')
      }
      case 'site': {
        if (!(await isStaff(i))) return fail('Only the team can post the site card.')
        const stats = await publicStats()
        const res = await postMessage(i.channel_id!, siteMessage(stats))
        return res.ok ? embedReply({ description: 'Posted the site card here.', color: GREEN }) : fail('Discord would not take it. Does the bot have permission to post in this channel?')
      }
      case 'admin': return await admin(i)
    }
    return fail('I do not know that command yet. Try `/help`.')
  } catch (e) {
    console.error('discord command failed', e instanceof Error ? e.message : e)
    return fail('Something went wrong on our side. Please try again in a moment.')
  }
}
