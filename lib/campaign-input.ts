import { z } from 'zod'
import { extrasSchema } from './campaign-extras-shared'
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
  capPerPost: z.number().min(0).max(1_000_000).optional(), // USD, the most one clip can earn (0 or empty: no limit)
  capPerUser: z.number().min(0).max(1_000_000).optional(), // USD, the most one clipper can earn in this campaign
  extras: extrasSchema.optional(), // music links, the official sound, an audio preview, a background and a bio (see campaign-extras.ts)
})
export type CampaignRequest = z.infer<typeof campaignRequestSchema>

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'campaign'

/** 2026-12-14 becomes "14/12/2026", the UK order used across the site. Older values saved as "Dec 14" are shown as "14 Dec". Anything else is passed through. */
export function shortDate(s: string | null | undefined) {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? '')
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
  const old = /^([A-Z][a-z]{2}) (\d{1,2})$/.exec(s ?? '')
  return old ? `${Number(old[2])} ${old[1]}` : (s ?? '')
}
