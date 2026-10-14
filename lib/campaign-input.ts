import { z } from 'zod'
import { SITE } from './site'

const line = z.string().trim().min(1).max(140)

/** What an artist or brand may send when requesting a campaign. Everything is length and type checked. */
export const campaignRequestSchema = z.object({
  title: z.string().trim().min(2).max(60),
  creator: z.string().trim().min(2).max(60),
  type: z.enum(['Music', 'Streamer', 'Podcast', 'Brand', 'Sport', 'Other']),
  subtype: z.string().trim().max(30).optional(),
  cover: z.string().regex(/^[0-9a-f-]{36}$/).nullable().optional(),
  platforms: z.array(z.enum(['tiktok', 'youtube', 'instagram'])).min(1).max(3),
  summary: z.string().trim().min(20).max(1500),
  clipThis: z.array(line).max(8),
  offLimits: z.array(line).max(8),
  rate: z.number().min(0.5).max(50), // USD per 1,000 views
  budget: z.number().min(SITE.minCampaignBudgetUsd).max(SITE.maxTopUpUsd * 10), // USD, the most this campaign may pay out in total
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})
export type CampaignRequest = z.infer<typeof campaignRequestSchema>

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'campaign'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** 2026-12-14 becomes "Dec 14", the short form used across the site. Anything else is passed through. */
export function shortDate(s: string | null | undefined) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '')
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}` : (s ?? '')
}
