import { liveCampaigns } from './campaigns-db'
import type { Campaign } from './campaigns'
import { db } from './db'

export type Pick = { campaign: Campaign; reasons: string[]; score: number }

/**
 * Campaigns picked for one creator: ones that pay well, still have plenty of budget, are on a platform they post on, or that they saved.
 * It is plain scoring with the reasons shown, so it is never a mystery why something is suggested. Campaigns they already sent clips to rank lower.
 */
export async function picksFor(userId: string, limit = 3): Promise<Pick[]> {
  const d = await db()
  const [live, prof, saved, sent] = await Promise.all([
    liveCampaigns(),
    d.prepare('SELECT links_json FROM profiles WHERE user_id = ?1').bind(userId).first<{ links_json: string }>(),
    d.prepare('SELECT campaign_id FROM favorites WHERE user_id = ?1').bind(userId).all<{ campaign_id: string }>(),
    d.prepare('SELECT DISTINCT campaign_id FROM submissions WHERE user_id = ?1').bind(userId).all<{ campaign_id: string }>(),
  ])
  let mine: string[] = []
  try {
    mine = (JSON.parse(prof?.links_json ?? '[]') as { platform: string }[]).map((l) => l.platform)
  } catch {
    mine = []
  }
  const savedSet = new Set(saved.results.map((r) => r.campaign_id))
  const sentSet = new Set(sent.results.map((r) => r.campaign_id))
  const maxRate = Math.max(1, ...live.map((c) => c.ratePer1k))
  const label: Record<string, string> = { tiktok: 'TikTok', youtube: 'YouTube', instagram: 'Instagram' }
  return live
    .map((campaign) => {
      const reasons: string[] = []
      let score = (campaign.ratePer1k / maxRate) * 4
      if (campaign.ratePer1k >= maxRate * 0.8) reasons.push(`Pays $${campaign.ratePer1k.toFixed(2)} per 1,000`)
      const left = campaign.budgetLeftPct ?? 100
      score += left / 50
      if (left >= 70) reasons.push('Plenty of budget left')
      const overlap = campaign.platforms.filter((p) => mine.includes(p))
      score += overlap.length * 2
      if (overlap.length) reasons.push(`You post on ${overlap.map((p) => label[p]).join(' and ')}`)
      if (savedSet.has(campaign.id)) (score += 3, reasons.push('You saved it'))
      if (sentSet.has(campaign.id)) score -= 3
      return { campaign, reasons: reasons.slice(0, 3), score }
    })
    .filter((p) => p.reasons.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
