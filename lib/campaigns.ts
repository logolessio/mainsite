// The campaign shape the site renders, and money/number formatting helpers. Campaigns themselves live in D1 (see lib/campaigns-db.ts).
export type Platform = 'tiktok' | 'youtube' | 'instagram'

export type Campaign = {
  id: string
  title: string
  creator: string
  type: string
  cover: string
  /** 15-30s audio preview. Placeholder files in /public/previews, replace with real previews. */
  previewUrl: string
  platforms: Platform[]
  ratePer1k: number
  budget: number
  endsOn: string
  summary: string
  clipThis: string[]
  offLimits: string[]
  /** How much of the budget is still unspent, 0 to 100. Unfunded campaigns count as full. */
  budgetLeftPct?: number
  /** The most one clip can earn, and the most one clipper can earn in this campaign, in dollars. Missing means no limit. */
  capPerPost?: number
  capPerUser?: number
  /** Pinned to the top of the browse page by the owner. */
  pinned?: boolean
}

export const usd = (n: number, digits = 0) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })

export const compact = (n: number) =>
  n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })
