import type { Campaign, Platform } from './campaigns'
import { shortDate } from './campaign-input'
import { db } from './db'
import { costFor } from './ledger-math'

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
    const rows = (await d.prepare("SELECT * FROM campaigns WHERE status = 'live' ORDER BY launched_at DESC, created_at DESC").all<CampaignRow>()).results
    // what is left of each funded pool, straight from the ledger
    const pools = new Map<string, number>()
    try {
      const sums = (await d.prepare("SELECT campaign_id, COALESCE(SUM(amount_cents), 0) AS pool FROM ledger WHERE account = 'campaign' AND campaign_id IS NOT NULL GROUP BY campaign_id").all<{ campaign_id: string; pool: number }>()).results
      for (const r of sums) pools.set(r.campaign_id, r.pool)
    } catch {
      /* no ledger yet: every campaign shows as full */
    }
    return rows.map((r) => {
      const c = toCampaign(r)
      const pool = pools.get(r.id)
      return pool === undefined || r.budget_cents <= 0 ? c : { ...c, budgetLeftPct: Math.max(0, Math.min(100, Math.round((pool / costFor(r.budget_cents)) * 100))) }
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
    return r ? toCampaign(r) : null
  } catch {
    return null
  }
}

export async function campaignRow(id: string) {
  const d = await db()
  return d.prepare('SELECT * FROM campaigns WHERE id = ?1').bind(id).first<CampaignRow>()
}
