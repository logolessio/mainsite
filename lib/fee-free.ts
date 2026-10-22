import { db } from './db'
import { SITE } from './site'

/**
 * A brand's first campaigns carry no platform fee (SITE.freeFeeCampaigns of them). They are counted in the order the campaigns were made, and a campaign
 * we turned down does not count, so the place of a campaign can only move up, never down: a campaign that is free never starts costing a fee halfway.
 * Nothing is stored: the answer is worked out from the campaigns table every time it is needed, so it always agrees with what the brand sees.
 */
export async function campaignIsFeeFree(campaignId: string): Promise<boolean> {
  const d = await db()
  const r = await d
    .prepare(
      `SELECT c.brand_user_id AS brand,
              (SELECT COUNT(*) FROM campaigns o
                WHERE o.brand_user_id = c.brand_user_id AND o.status != 'rejected'
                  AND (o.created_at < c.created_at OR (o.created_at = c.created_at AND o.id <= c.id))) AS place
         FROM campaigns c WHERE c.id = ?1`,
    )
    .bind(campaignId)
    .first<{ brand: string | null; place: number }>()
  if (!r?.brand) return false
  return r.place <= SITE.freeFeeCampaigns
}

/** How many fee-free campaigns a brand has left: the next one they make is free while this is above zero. */
export async function feeFreeLeft(brandUserId: string): Promise<number> {
  const d = await db()
  const r = await d.prepare("SELECT COUNT(*) AS n FROM campaigns WHERE brand_user_id = ?1 AND status != 'rejected'").bind(brandUserId).first<{ n: number }>()
  return Math.max(0, SITE.freeFeeCampaigns - (r?.n ?? 0))
}
