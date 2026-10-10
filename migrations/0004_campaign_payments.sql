-- A payment can now fund a specific campaign (kind = campaign) instead of a brand balance.
ALTER TABLE topups ADD COLUMN campaign_id TEXT;
CREATE INDEX IF NOT EXISTS topups_campaign ON topups (campaign_id) WHERE campaign_id IS NOT NULL;
-- Payout rows record why they were held for review.
ALTER TABLE payouts ADD COLUMN review_reason TEXT;
ALTER TABLE payouts ADD COLUMN reviewed_by TEXT;
