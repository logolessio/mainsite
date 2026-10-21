import { db, nowSec } from './db'
import { getExtras } from './campaign-extras'
import type { CampaignExtras } from './campaign-extras-shared'
import { RATE_MAX, RATE_MIN, viewsFor } from './campaign-extras-shared'
import { campaignRow, type CampaignRow } from './campaigns-db'
import { balances } from './ledger'
import { startNeeded } from './ledger-math'
import { SITE } from './site'

/**
 * Everything an admin needs to decide on a requested campaign, in one place: what was asked for, checks the site runs by itself (each one
 * passes, needs a look, or should block), who the brand is and how their earlier campaigns went, anything that looks like a copy, and the
 * notes already made. The checks never decide anything: they point a person at what to look at.
 */
export type CheckStatus = 'pass' | 'warn' | 'fail'
export type Check = { id: string; group: 'Brief' | 'Money' | 'Audio and pictures' | 'Brand' | 'Safety'; label: string; status: CheckStatus; detail: string }
export type TrailEntry = { at: number; by: string; kind: 'accept' | 'reject' | 'changes' | 'note' | 'resubmit'; text: string }

const list = (s: string | null | undefined): string[] => {
  try {
    const v = JSON.parse(s ?? '[]')
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

/** Words that mean a campaign needs a person to read it twice. Not a ban: "betting" may be fine for a sports brand. */
const WATCH = ['casino', 'betting', 'gambling', 'crypto', 'forex', 'loan', 'investment', 'giveaway', 'free money', 'guaranteed', 'onlyfans', 'nsfw', 'porn', '18+', 'adult', 'vape', 'weed', 'cbd', 'pills', 'miracle', 'get rich', 'earn $', 'whatsapp', 'telegram', 'dm me']

const endsAt = (s: string | null): number | null => {
  if (!s) return null
  const uk = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s)
  if (uk) return Date.parse(`${uk[3]}-${uk[2]}-${uk[1]}T23:59:59Z`) / 1000
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (iso) return Date.parse(`${s}T23:59:59Z`) / 1000
  return null
}

export type ReviewData = {
  row: CampaignRow
  extras: CampaignExtras
  checks: Check[]
  verdict: { level: 'ready' | 'look' | 'hold'; headline: string }
  owner: { id: string; email: string; since: number; handle: string | null; role: string; risk: string; riskWhy: string | null; balanceCents: number; startCents: number } | null
  history: { id: string; title: string; status: string; budgetCents: number; at: number }[]
  lookalikes: { id: string; title: string; creator: string; status: string; why: string }[]
  trail: TrailEntry[]
  clippers: number
}

export async function reviewData(id: string): Promise<ReviewData | null> {
  const row = await campaignRow(id)
  if (!row) return null
  const d = await db()
  const extras = await getExtras(id)
  const owner = row.brand_user_id
    ? await d
        .prepare('SELECT u.id, u.email, u.created_at AS since, u.role, u.risk_level AS risk, u.risk_reasons AS riskWhy, p.handle FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?1')
        .bind(row.brand_user_id)
        .first<{ id: string; email: string; since: number; role: string; risk: string; riskWhy: string | null; handle: string | null }>()
    : null
  const bal = row.brand_user_id ? (await balances(row.brand_user_id)).brand : 0
  const history = row.brand_user_id
    ? (
        await d
          .prepare("SELECT id, title, status, budget_cents AS budgetCents, created_at AS at FROM campaigns WHERE brand_user_id = ?1 AND id != ?2 AND id NOT LIKE 'mock-%' ORDER BY created_at DESC LIMIT 8")
          .bind(row.brand_user_id, id)
          .all<{ id: string; title: string; status: string; budgetCents: number; at: number }>()
      ).results
    : []
  const lookalikes = (
    await d
      .prepare(
        `SELECT id, title, creator, status, brand_user_id FROM campaigns
         WHERE id != ?1 AND status IN ('requested','awaiting_payment','paid','live','paused') AND id NOT LIKE 'mock-%'
           AND (lower(title) = lower(?2) OR (lower(creator) = lower(?3) AND COALESCE(brand_user_id, '') != COALESCE(?4, '')))
         LIMIT 6`,
      )
      .bind(id, row.title, row.creator, row.brand_user_id)
      .all<{ id: string; title: string; creator: string; status: string; brand_user_id: string | null }>()
  ).results.map((r) => ({ id: r.id, title: r.title, creator: r.creator, status: r.status, why: r.title.toLowerCase() === row.title.toLowerCase() ? 'Same title' : 'Same artist name, a different account' }))
  const clippers = (await d.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM submissions WHERE campaign_id = ?1').bind(id).first<{ n: number }>())?.n ?? 0
  let trail: TrailEntry[] = []
  try {
    const t = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(`review-trail:${id}`).first<{ value: string }>()
    trail = t ? (JSON.parse(t.value) as TrailEntry[]) : []
  } catch {
    trail = []
  }

  const checks: Check[] = []
  const add = (group: Check['group'], idc: string, label: string, status: CheckStatus, detail: string) => checks.push({ id: idc, group, label, status, detail })
  const rate = row.rate_cents / 100
  const budget = row.budget_cents / 100
  const views = viewsFor(budget, rate)
  const platforms = list(row.platforms_json)
  const clipThis = list(row.clip_this_json)
  const off = list(row.off_limits_json)
  const text = `${row.title} ${row.summary} ${clipThis.join(' ')} ${off.join(' ')} ${extras.bio} ${extras.audioNote}`.toLowerCase()

  // ---- the brief
  add('Brief', 'title', 'Title', row.title.length < 3 ? 'fail' : row.title === row.title.toUpperCase() && /[A-Z]{6,}/.test(row.title) ? 'warn' : /https?:|www\./i.test(row.title) ? 'fail' : 'pass', row.title === row.title.toUpperCase() && /[A-Z]{6,}/.test(row.title) ? 'All capitals. Fine for some artists, but read it.' : /https?:|www\./i.test(row.title) ? 'The title has a link in it.' : `"${row.title}", ${row.title.length} characters.`)
  add('Brief', 'summary', 'The brief', row.summary.length < 40 ? 'fail' : row.summary.length < 100 ? 'warn' : 'pass', `${row.summary.length} characters. ${row.summary.length < 100 ? 'Short: clippers may not know what to make.' : 'Enough to work from.'}`)
  add('Brief', 'clip', '"What to make"', clipThis.length === 0 ? 'warn' : 'pass', clipThis.length === 0 ? 'Nothing listed. Clippers get no direction on what footage or style to use.' : `${clipThis.length} ${clipThis.length === 1 ? 'idea' : 'ideas'} listed.`)
  add('Brief', 'off', '"Off limits"', off.length === 0 ? 'warn' : 'pass', off.length === 0 ? 'No rules listed. Disputes about what is allowed are harder to settle without them.' : `${off.length} ${off.length === 1 ? 'rule' : 'rules'} listed.`)
  add('Brief', 'platforms', 'Platforms', platforms.length === 0 ? 'fail' : 'pass', platforms.length === 0 ? 'None chosen.' : platforms.join(', '))
  const end = endsAt(row.ends_on)
  add('Brief', 'ends', 'End date', row.ends_on && end === null ? 'warn' : end !== null && end < nowSec() ? 'fail' : end !== null && end - nowSec() > 200 * 86400 ? 'warn' : !row.ends_on ? 'warn' : 'pass', !row.ends_on ? 'No end date. It runs until the budget is spent or someone ends it.' : end === null ? `"${row.ends_on}" could not be read as a date.` : end < nowSec() ? 'The end date has already passed.' : end - nowSec() > 200 * 86400 ? 'More than six months away.' : `Ends ${row.ends_on}.`)

  // ---- money
  add('Money', 'budget', 'Budget', budget < SITE.minCampaignBudgetUsd ? 'fail' : 'pass', `$${budget.toLocaleString('en-US')}, and the smallest allowed is $${SITE.minCampaignBudgetUsd}.`)
  add('Money', 'rate', 'Rate per 1,000 views', rate < RATE_MIN || rate > RATE_MAX ? 'fail' : rate < 1 ? 'warn' : rate > 20 ? 'warn' : 'pass', `$${rate.toFixed(2)}. ${rate < 1 ? 'Low: clippers may skip it.' : rate > 20 ? 'Very high: check it is not a typing slip.' : 'A normal rate.'}`)
  add('Money', 'views', 'What the budget buys', views < 10_000 ? 'warn' : views > 100_000_000 ? 'warn' : 'pass', `About ${views.toLocaleString('en-US')} views in total. ${views < 10_000 ? 'Very small: it will end after a handful of clips.' : ''}`.trim())
  const covered = bal >= startNeeded(row.budget_cents)
  add('Money', 'balance', 'Brand balance', owner ? (covered ? 'pass' : 'warn') : 'fail', owner ? (covered ? `$${(bal / 100).toLocaleString('en-US')} covers the start, so accepting takes it straight to live.` : `$${(bal / 100).toLocaleString('en-US')} on their balance. Accepting asks them to add $${(startNeeded(row.budget_cents) / 100).toLocaleString('en-US')} first.`) : 'No account is attached to bill.')

  // ---- audio and pictures
  const sound = Boolean(extras.audio || extras.sounds.length || extras.spotify.length || row.preview_url)
  add('Audio and pictures', 'sound', 'The audio', sound ? 'pass' : 'warn', sound ? [extras.audio || row.preview_url ? 'a preview to play' : '', extras.sounds.length ? `${extras.sounds.length} official sound link${extras.sounds.length === 1 ? '' : 's'}` : '', extras.spotify.length ? `${extras.spotify.length} Spotify link${extras.spotify.length === 1 ? '' : 's'}` : ''].filter(Boolean).join(', ') : 'No preview, no official sound and no Spotify link. Clippers will not know what to use.')
  add('Audio and pictures', 'cover', 'Cover picture', !row.cover_url ? 'fail' : /^https?:\/\//.test(row.cover_url) ? 'warn' : 'pass', !row.cover_url ? 'Missing.' : /^https?:\/\//.test(row.cover_url) ? 'Hosted somewhere else. It may vanish or change.' : 'Uploaded to logoless.')
  add('Audio and pictures', 'example', 'Example edit', extras.example ? 'pass' : 'warn', extras.example ? 'A link is given. Open it to check it is the right video.' : 'None. An example edit makes first submissions much better.')
  add('Audio and pictures', 'bg', 'Pop-up background', extras.background ? 'pass' : 'pass', extras.background ? 'A background picture is set: it shows behind the campaign when it opens.' : 'None set. The campaign opens over the normal dark background.')

  // ---- the brand
  const age = owner ? Math.max(0, Math.floor((nowSec() - owner.since) / 86400)) : 0
  add('Brand', 'age', 'Account age', !owner ? 'fail' : age < 1 ? 'warn' : 'pass', !owner ? 'No account.' : age < 1 ? 'Made today.' : `${age} ${age === 1 ? 'day' : 'days'} old.`)
  add('Brand', 'risk', 'Extra checks flag', !owner ? 'fail' : owner.risk === 'high' ? 'fail' : owner.risk === 'elevated' ? 'warn' : 'pass', !owner ? '' : owner.risk === 'low' ? 'Nothing flagged.' : `${owner.risk}${owner.riskWhy ? `: ${owner.riskWhy}` : ''}`)
  const bad = history.filter((h) => h.status === 'rejected').length
  const good = history.filter((h) => ['live', 'ended', 'paused'].includes(h.status)).length
  add('Brand', 'history', 'Earlier campaigns', bad > 0 && good === 0 ? 'warn' : 'pass', history.length === 0 ? 'The first one from this account.' : `${good} ran, ${bad} turned down, ${history.length - good - bad} still open.`)

  // ---- safety
  const hits = WATCH.filter((w) => text.includes(w))
  add('Safety', 'words', 'Words to read twice', hits.length ? 'warn' : 'pass', hits.length ? `Mentions: ${hits.join(', ')}. Check the campaign is allowed on all its platforms.` : 'None of the usual ones.')
  add('Safety', 'links', 'Links in the brief', /https?:\/\/|www\./i.test(row.summary + clipThis.join(' ')) ? 'warn' : 'pass', /https?:\/\/|www\./i.test(row.summary + clipThis.join(' ')) ? 'There are links in the brief text. Open them.' : 'None.')
  add('Safety', 'copy', 'Looks like another campaign', lookalikes.length ? 'warn' : 'pass', lookalikes.length ? lookalikes.map((l) => `${l.why}: "${l.title}" (${l.status})`).join('; ') : 'Nothing similar is open.')

  const fails = checks.filter((c) => c.status === 'fail').length
  const warns = checks.filter((c) => c.status === 'warn').length
  const verdict = fails
    ? { level: 'hold' as const, headline: `${fails} ${fails === 1 ? 'thing blocks' : 'things block'} this. Ask for changes or reject it.` }
    : warns
      ? { level: 'look' as const, headline: `${warns} ${warns === 1 ? 'thing needs' : 'things need'} a look before you accept.` }
      : { level: 'ready' as const, headline: 'Every check passes. Read it once, then accept.' }

  return { row, extras, checks, verdict, owner: owner ? { ...owner, balanceCents: bal, startCents: startNeeded(row.budget_cents) } : null, history, lookalikes, trail, clippers }
}

/** Adds a line to a campaign's review trail (what the team decided and said, oldest first). Kept in settings, so no database change is needed. */
export async function addTrail(id: string, e: TrailEntry) {
  const d = await db()
  const key = `review-trail:${id}`
  let cur: TrailEntry[] = []
  try {
    const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(key).first<{ value: string }>()
    cur = r ? (JSON.parse(r.value) as TrailEntry[]) : []
  } catch {
    cur = []
  }
  const next = [...cur, { ...e, text: e.text.slice(0, 600) }].slice(-40)
  await d.prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at').bind(key, JSON.stringify(next), e.at).run()
}

/** For a brand's own page: the last thing the team asked them to change on each request, for the ones they have not answered yet. */
export async function pendingAsks(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (!ids.length) return out
  try {
    const d = await db()
    const keys = ids.map((i) => `review-trail:${i}`)
    const rows = (await d.prepare(`SELECT key, value FROM settings WHERE key IN (${keys.map((_, n) => `?${n + 1}`).join(',')})`).bind(...keys).all<{ key: string; value: string }>()).results
    for (const r of rows) {
      const trail = JSON.parse(r.value) as TrailEntry[]
      const last = [...trail].reverse().find((e) => e.kind === 'changes' || e.kind === 'resubmit' || e.kind === 'reject' || e.kind === 'accept')
      if (last?.kind === 'changes') out[r.key.slice('review-trail:'.length)] = last.text
    }
  } catch {
    /* no notes yet */
  }
  return out
}
