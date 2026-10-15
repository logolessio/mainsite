import { z } from 'zod'
import { campaignAction, campaignActionSchema, clipAction, clipActionSchema, inquiryReply, messageUser } from '@/lib/admin-ops'
import { counts, funds, health } from '@/lib/admin-stats'
import { type ApiKey, type ApiScope, authenticate } from '@/lib/adminapi'
import { db, nowSec } from '@/lib/db'
import { postTo } from '@/lib/discord/outbound'
import { getInquiry, listInquiries, newInquiryCount } from '@/lib/inquiries'
import { HttpError } from '@/lib/http'
import { balances } from '@/lib/ledger'
import { overview, RANGES, sinceFor, type Range } from '@/lib/log-stats'
import { profileStats } from '@/lib/profile'
import { roleHolders } from '@/lib/roles'
import { allSettings } from '@/lib/settings'

/**
 * The owner API. Everything is JSON, every call carries a key ("Authorization: Bearer lgk_…"), and every change is written to the
 * audit log as "api:<key name>". See Admin, System, API for how to make a key and what each scope allows.
 */
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type, x-api-key', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-max-age': '86400' }
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS } })
const num = (v: string | null, def: number, min: number, max: number) => Math.max(min, Math.min(max, Number.parseInt(v ?? '', 10) || def))
const actorOf = (k: ApiKey) => ({ id: null, email: `api:${k.name}` })
const like = (q: string) => `%${q.replace(/[%_]/g, '')}%`

type Ctx = { req: Request; url: URL; seg: string[]; method: string }
type Handler = (c: Ctx) => Promise<unknown>

async function bodyOf<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const text = await req.text()
  if (text.length > 16 * 1024) throw new HttpError(413, 'That request is too large.')
  const parsed = schema.safeParse(text ? JSON.parse(text) : {})
  if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'That request is not valid.')
  return parsed.data
}

// ---------- reading ----------
const overviewH: Handler = async () => {
  const [c, f, h, st, inbox] = await Promise.all([counts(), funds(), health(), allSettings(), newInquiryCount()])
  return {
    people: { total: c.users, onlineNow: c.activeNow, activeToday: c.active24h, newToday: c.signups24h, flagged: c.flagged, restricted: c.restricted },
    campaigns: { live: c.live, requests: c.requests, awaitingStart: c.awaitingPayment },
    queues: { clipsToReview: c.pendingClips, campaignRequests: c.requests, withdrawalsInReview: c.payoutsInReview, newMessages: inbox, failedWithdrawals7d: c.payoutsFailed },
    moneyCents: { company: f.company, heldInOldPools: f.heldForCampaigns, brandBalances: f.brandBalances, owedToClippers: f.owedToClippers, fees: f.fees, paypalCosts: f.paypalCosts, paidOut: f.paidOut, withdrawalsInReview: f.inReview },
    switches: { withdrawalsPaused: st.payouts_paused === '1', clipsPaused: st.submissions_paused === '1', signupsPaused: st.signups_paused === '1' },
    health: h.map((x) => ({ id: x.key, label: x.label, state: x.state, detail: x.detail })),
  }
}

const statsH: Handler = async ({ url }) => {
  const r = url.searchParams.get('range') ?? '7d'
  const range = (RANGES.some((x) => x.id === r) ? r : '7d') as Range
  const o = await overview(sinceFor(range))
  return { range, totals: o.totals, perDay: o.series, topPages: o.pages, business: o.business, money: o.money }
}

const usersH: Handler = async ({ url, seg }) => {
  const d = await db()
  const holders = await roleHolders()
  if (seg[1]) {
    const u = await d.prepare('SELECT u.id, u.email, u.name, u.status, u.risk_level, u.risk_reasons, u.created_at, u.last_seen_at, u.signup_country, p.handle, p.display_name, p.bio, p.country, p.badges_json FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?1').bind(seg[1]).first<Record<string, unknown>>()
    if (!u) throw new HttpError(404, 'Person not found.')
    const [b, s, clips, camps] = await Promise.all([
      balances(seg[1]),
      profileStats(seg[1]),
      d.prepare('SELECT s.id, s.status, s.platform, s.url, s.views_verified, s.earned_cents, s.created_at, c.title FROM submissions s JOIN campaigns c ON c.id = s.campaign_id WHERE s.user_id = ?1 ORDER BY s.created_at DESC LIMIT 15').bind(seg[1]).all(),
      d.prepare('SELECT id, title, status, budget_cents FROM campaigns WHERE brand_user_id = ?1 ORDER BY created_at DESC LIMIT 15').bind(seg[1]).all(),
    ])
    return { person: { ...u, roles: holders[seg[1]] ?? [] }, balancesCents: b, stats: s, recentClips: clips.results, campaigns: camps.results }
  }
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 60)
  const f = url.searchParams.get('filter') ?? ''
  const t = nowSec()
  const where = ["u.email NOT LIKE 'deleted-%@deleted.invalid'"]
  const args: unknown[] = []
  if (q) {
    where.push('(u.email LIKE ?1 OR p.handle LIKE ?1 OR p.display_name LIKE ?1)')
    args.push(like(q))
  }
  if (f === 'online') where.push(`u.last_seen_at > ${t - 300}`)
  if (f === 'new') where.push(`u.created_at > ${t - 7 * 86400}`)
  if (f === 'flagged') where.push("u.risk_level != 'low'")
  if (f === 'restricted') where.push("u.status != 'active'")
  const limitN = num(url.searchParams.get('limit'), 50, 1, 100)
  const offset = num(url.searchParams.get('offset'), 0, 0, 100000)
  const rows = (
    await d
      .prepare(
        `SELECT u.id, u.email, u.status, u.risk_level, u.created_at, u.last_seen_at, p.handle, p.display_name,
           COALESCE((SELECT SUM(amount_cents) FROM ledger WHERE user_id = u.id AND account = 'clipper'), 0) AS owed_cents,
           (SELECT COUNT(*) FROM submissions WHERE user_id = u.id) AS clips
         FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE ${where.join(' AND ')} ORDER BY u.last_seen_at DESC, u.created_at DESC LIMIT ${limitN} OFFSET ${offset}`,
      )
      .bind(...args)
      .all<Record<string, unknown>>()
  ).results
  return { people: rows.map((r) => ({ ...r, roles: holders[String(r.id)] ?? [] })), limit: limitN, offset }
}

const campaignsH: Handler = async ({ url, seg }) => {
  const d = await db()
  if (seg[1]) {
    const c = await d.prepare("SELECT c.*, u.email AS brand_email, COALESCE((SELECT SUM(net_cents) FROM earnings WHERE campaign_id = c.id), 0) AS paid_to_clippers_cents FROM campaigns c LEFT JOIN users u ON u.id = c.brand_user_id WHERE c.id = ?1").bind(seg[1]).first<Record<string, unknown>>()
    if (!c) throw new HttpError(404, 'Campaign not found.')
    const clips = await d.prepare('SELECT s.id, s.status, s.platform, s.url, s.views_verified, s.earned_cents, s.created_at, p.handle FROM submissions s LEFT JOIN profiles p ON p.user_id = s.user_id WHERE s.campaign_id = ?1 ORDER BY s.created_at DESC LIMIT 50').bind(seg[1]).all()
    return { campaign: c, clips: clips.results }
  }
  const status = url.searchParams.get('status')
  const rows = (
    await d
      .prepare(
        `SELECT c.id, c.title, c.creator, c.status, c.rate_cents, c.budget_cents, c.created_at, c.launched_at, u.email AS brand_email,
           COALESCE((SELECT SUM(net_cents) FROM earnings WHERE campaign_id = c.id), 0) AS paid_to_clippers_cents,
           (SELECT COUNT(*) FROM submissions WHERE campaign_id = c.id) AS clips
         FROM campaigns c LEFT JOIN users u ON u.id = c.brand_user_id ${status ? 'WHERE c.status = ?1' : ''} ORDER BY c.created_at DESC LIMIT 200`,
      )
      .bind(...(status ? [status] : []))
      .all<Record<string, unknown>>()
  ).results
  return { campaigns: rows }
}

const clipsH: Handler = async ({ url, seg }) => {
  if (seg[1]) throw new HttpError(404, 'Use the list, then POST /clips/{id}/action.')
  const d = await db()
  const status = url.searchParams.get('status') ?? 'pending'
  const rows = (
    await d
      .prepare(
        `SELECT s.id, s.status, s.platform, s.url, s.views_verified, s.earned_cents, s.created_at, c.id AS campaign_id, c.title AS campaign, c.rate_cents, p.handle, u.email, u.risk_level
         FROM submissions s JOIN campaigns c ON c.id = s.campaign_id JOIN users u ON u.id = s.user_id LEFT JOIN profiles p ON p.user_id = u.id
         WHERE s.status = ?1 ORDER BY s.created_at ${status === 'pending' ? 'ASC' : 'DESC'} LIMIT ${num(url.searchParams.get('limit'), 50, 1, 200)}`,
      )
      .bind(status)
      .all<Record<string, unknown>>()
  ).results
  return { clips: rows }
}

const payoutsH: Handler = async ({ url }) => {
  const d = await db()
  const status = url.searchParams.get('status')
  const rows = (
    await d
      .prepare(
        `SELECT p.id, p.status, p.amount_cents, p.review_reason, p.created_at, u.email, (SELECT value FROM settings WHERE key = 'payout-to:' || p.id) AS paypal_email
         FROM payouts p JOIN users u ON u.id = p.user_id ${status ? 'WHERE p.status = ?1' : ''} ORDER BY p.created_at DESC LIMIT 100`,
      )
      .bind(...(status ? [status] : []))
      .all<Record<string, unknown>>()
  ).results
  return { withdrawals: rows, note: 'Sending or declining a withdrawal is done in the owner dashboard, with your admin password.' }
}

const inboxH: Handler = async ({ url, seg }) => {
  if (seg[1]) {
    const inq = await getInquiry(seg[1])
    if (!inq) throw new HttpError(404, 'Conversation not found.')
    const { token: _t, ...rest } = inq
    void _t
    return { conversation: rest }
  }
  const status = url.searchParams.get('status')
  const list = (await listInquiries(150)).filter((i) => !status || i.status === status)
  return { conversations: list.map((i) => ({ id: i.id, kind: i.kind, topic: i.topic, subject: i.subject, from: i.name, handle: i.handle, status: i.status, updatedAt: i.updated, replies: i.replies.length, discordTicket: Boolean(i.discord) })) }
}

const auditH: Handler = async ({ url }) => {
  const d = await db()
  const rows = (await d.prepare(`SELECT actor_email, action, target, detail, created_at FROM audit_log ORDER BY id DESC LIMIT ${num(url.searchParams.get('limit'), 50, 1, 200)}`).all()).results
  return { entries: rows }
}

// ---------- doing ----------
const campaignAct: Handler = async ({ req, seg, key }: Ctx & { key?: ApiKey }) => {
  const a = await bodyOf(req, campaignActionSchema)
  if (!['accept', 'reject', 'pause', 'resume', 'end', 'edit'].includes(a.action)) throw new HttpError(403, 'That action is only available in the owner dashboard.')
  await campaignAction(actorOf(key!), null, seg[1], a)
  return { ok: true }
}
const clipAct: Handler = async ({ req, seg, key }: Ctx & { key?: ApiKey }) => {
  const a = await bodyOf(req, clipActionSchema)
  if ((a.action === 'views' || (a.action === 'approve' && a.views !== undefined)) && !key!.scopes.includes('pay')) throw new HttpError(403, 'Setting views pays the clipper, so the key needs the "pay" scope.')
  const r = await clipAction(actorOf(key!), null, seg[1], a)
  return { ok: true, paid: r.paid, capped: r.capped }
}
const inboxReply: Handler = async ({ req, seg, key }: Ctx & { key?: ApiKey }) => {
  const a = await bodyOf(req, z.object({ text: z.string().min(2).max(4000), close: z.boolean().optional() }))
  const inq = await inquiryReply(actorOf(key!), seg[1], a.text, Boolean(a.close), key!.name)
  return { ok: true, status: inq.status }
}
const userMessage: Handler = async ({ req, seg, key }: Ctx & { key?: ApiKey }) => {
  const a = await bodyOf(req, z.object({ title: z.string().trim().min(2).max(100), text: z.string().trim().max(240).default(''), href: z.string().trim().max(200).optional(), email: z.boolean().optional() }))
  return { ok: true, ...(await messageUser(actorOf(key!), null, seg[1], a)) }
}
const announce: Handler = async ({ req, key }: Ctx & { key?: ApiKey }) => {
  const a = await bodyOf(req, z.object({ where: z.enum(['news', 'updates']), title: z.string().trim().min(3).max(200), text: z.string().trim().max(1500).default(''), href: z.string().trim().max(200).optional() }))
  const ok = await postTo(a.where, { title: a.title, text: a.text, href: a.href })
  const { audit } = await import('@/lib/chain')
  await audit(actorOf(key!), 'api.announce', a.where, a.title)
  if (!ok) throw new HttpError(502, 'Could not post in Discord. Set that channel on the Discord page and check the bot can post there.')
  return { ok: true }
}

type Route = { method: 'GET' | 'POST'; first: string; shape: number; second?: string; scope: ApiScope; run: Handler }
const ROUTES: Route[] = [
  { method: 'GET', first: 'overview', shape: 1, scope: 'read', run: overviewH },
  { method: 'GET', first: 'stats', shape: 1, scope: 'read', run: statsH },
  { method: 'GET', first: 'users', shape: 1, scope: 'read', run: usersH },
  { method: 'GET', first: 'users', shape: 2, scope: 'read', run: usersH },
  { method: 'GET', first: 'campaigns', shape: 1, scope: 'read', run: campaignsH },
  { method: 'GET', first: 'campaigns', shape: 2, scope: 'read', run: campaignsH },
  { method: 'GET', first: 'clips', shape: 1, scope: 'read', run: clipsH },
  { method: 'GET', first: 'withdrawals', shape: 1, scope: 'read', run: payoutsH },
  { method: 'GET', first: 'inbox', shape: 1, scope: 'read', run: inboxH },
  { method: 'GET', first: 'inbox', shape: 2, scope: 'read', run: inboxH },
  { method: 'GET', first: 'audit', shape: 1, scope: 'read', run: auditH },
  { method: 'POST', first: 'campaigns', shape: 3, second: 'action', scope: 'moderate', run: campaignAct },
  { method: 'POST', first: 'clips', shape: 3, second: 'action', scope: 'moderate', run: clipAct },
  { method: 'POST', first: 'inbox', shape: 3, second: 'reply', scope: 'message', run: inboxReply },
  { method: 'POST', first: 'users', shape: 3, second: 'message', scope: 'message', run: userMessage },
  { method: 'POST', first: 'announce', shape: 1, scope: 'message', run: announce },
]

async function handle(req: Request, method: string, path: string[]) {
  const first = path[0] ?? ''
  const match = ROUTES.find((r) => r.method === method && r.first === first && r.shape === path.length && (!r.second || r.second === path[2]))
  if (!match) {
    if (first === '' || first === 'help') return { name: 'logoless owner API', version: 1, auth: 'Authorization: Bearer lgk_…', docs: 'https://owner.logoless.io/admin/api', routes: ROUTES.map((r) => `${r.method} /api/v1/${[r.first, r.shape >= 2 ? '{id}' : '', r.second ?? ''].filter(Boolean).join('/')} (${r.scope})`) }
    throw new HttpError(404, 'No such route. GET /api/v1 lists them.')
  }
  const key = await authenticate(req, match.scope)
  return match.run({ req, url: new URL(req.url), seg: path, method, key } as Ctx & { key: ApiKey })
}

async function run(req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  try {
    const { path } = await ctx.params
    return reply(await handle(req, req.method, path ?? []))
  } catch (e) {
    if (e instanceof HttpError) return reply({ error: e.message }, e.status)
    if (e instanceof SyntaxError) return reply({ error: 'The body is not valid JSON.' }, 400)
    if (e instanceof Response) return e
    console.error('api v1 error', e instanceof Error ? e.message : e)
    return reply({ error: 'Something went wrong on our side.' }, 500)
  }
}

export const GET = run
export const POST = run
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS })
