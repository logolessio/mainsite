import type { Campaign, Platform } from './campaigns'
import { shortDate } from './campaign-input'
import { allCaps, getCaps } from './campaign-caps'
import { db } from './db'
import { isMockId, mockVisible, NOT_MOCK } from './mock-campaigns'

export type CampaignRow = {
  id: string
  brand_user_id: string | null
  title: string
  creator: string
  type: string
  cover_url: string
  preview_url: string | null
  platforms_json: string
  rate_cents: number
  budget_cents: number
  ends_on: string | null
  summary: string
  clip_this_json: string
  off_limits_json: string
  status: string
  admin_note: string | null
  payment_session_id: string | null
  paid_at: number | null
  launched_at: number | null
  invite_id: string | null
  created_at: number
  updated_at: number
}

const list = (s: string): string[] => {
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v.map(String) : []
  } catch {
    return []
  }
}

const withCaps = (c: Campaign, caps?: { perPostCents: number; perUserCents: number }): Campaign => (caps && (caps.perPostCents || caps.perUserCents) ? { ...c, ...(caps.perPostCents ? { capPerPost: caps.perPostCents / 100 } : {}), ...(caps.perUserCents ? { capPerUser: caps.perUserCents / 100 } : {}) } : c)

export function toCampaign(r: CampaignRow): Campaign {
  return {
    id: r.id,
    title: r.title,
    creator: r.creator,
    type: r.type,
    cover: r.cover_url,
    previewUrl: r.preview_url ?? '',
    platforms: list(r.platforms_json).filter((p): p is Platform => ['tiktok', 'youtube', 'instagram'].includes(p)),
    ratePer1k: r.rate_cents / 100,
    budget: r.budget_cents / 100,
    endsOn: shortDate(r.ends_on),
    summary: r.summary,
    clipThis: list(r.clip_this_json),
    offLimits: list(r.off_limits_json),
  }
}

/** Campaigns people can browse and clip. Paused, ended and unpaid ones are not listed. */
export async function liveCampaigns(): Promise<Campaign[]> {
  try {
    const d = await db()
    const show = await mockVisible()
    const rows = (await d.prepare(`SELECT * FROM campaigns WHERE status = 'live' ${show ? '' : `AND ${NOT_MOCK}`} ORDER BY launched_at DESC, created_at DESC`).all<CampaignRow>()).results
    // how much of each campaign's budget cap has been paid out so far
    const spent = new Map<string, number>()
    try {
      const sums = (await d.prepare('SELECT campaign_id, COALESCE(SUM(net_cents), 0) AS net FROM earnings WHERE campaign_id IS NOT NULL GROUP BY campaign_id').all<{ campaign_id: string; net: number }>()).results
      for (const r of sums) spent.set(r.campaign_id, r.net)
    } catch {
      /* no earnings yet: every campaign shows as full */
    }
    const caps = await allCaps().catch(() => ({}) as Awaited<ReturnType<typeof allCaps>>)
    return rows.map((r) => {
      const c = withCaps(toCampaign(r), caps[r.id])
      const net = spent.get(r.id)
      return net === undefined || r.budget_cents <= 0 ? c : { ...c, budgetLeftPct: Math.max(0, Math.min(100, Math.round(((r.budget_cents - net) / r.budget_cents) * 100))) }
    })
  } catch (e) {
    console.error('liveCampaigns failed', e instanceof Error ? e.message : e)
    return []
  }
}

export async function liveCampaign(id: string): Promise<Campaign | null> {
  try {
    const d = await db()
    const r = await d.prepare("SELECT * FROM campaigns WHERE id = ?1 AND status = 'live'").bind(id).first<CampaignRow>()
    if (!r) return null
    if (isMockId(r.id) && !(await mockVisible())) return null
    const [paid, caps] = await Promise.all([d.prepare('SELECT COALESCE(SUM(net_cents), 0) AS n FROM earnings WHERE campaign_id = ?1').bind(id).first<{ n: number }>(), getCaps(id)])
    const c = withCaps(toCampaign(r), caps)
    return r.budget_cents > 0 && paid && paid.n > 0 ? { ...c, budgetLeftPct: Math.max(0, Math.min(100, Math.round(((r.budget_cents - paid.n) / r.budget_cents) * 100))) } : c
  } catch {
    return null
  }
}

export async function campaignRow(id: string) {
  const d = await db()
  return d.prepare('SELECT * FROM campaigns WHERE id = ?1').bind(id).first<CampaignRow>()
}

export type EndedCampaign = { id: string; title: string; creator: string; cover: string; endedAt: number }

/** Campaigns that have closed, newest first, with when they closed (see markEnded in campaign-end.ts). They are not listed anywhere; they only answer when someone looks one up. */
export async function endedCampaigns(limit = 120): Promise<EndedCampaign[]> {
  try {
    const d = await db()
    const show = await mockVisible()
    const rows = (
      await d
        .prepare(
          `SELECT c.id, c.title, c.creator, c.cover_url,
             COALESCE((SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'ended-at:' || c.id), c.updated_at) AS ended_at
           FROM campaigns c WHERE c.status = 'ended' ${show ? '' : "AND c.id NOT LIKE 'mock-%'"} ORDER BY ended_at DESC LIMIT ?1`,
        )
        .bind(limit)
        .all<{ id: string; title: string; creator: string; cover_url: string; ended_at: number }>()
    ).results
    return rows.map((r) => ({ id: r.id, title: r.title, creator: r.creator, cover: r.cover_url, endedAt: r.ended_at }))
  } catch {
    return []
  }
}

export async function endedCampaign(id: string): Promise<EndedCampaign | null> {
  return (await endedCampaigns(500)).find((c) => c.id === id) ?? null
}
