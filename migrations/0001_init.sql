-- logoless: users, money ledger and Stripe bookkeeping (Cloudflare D1 / SQLite)
-- All money is stored as integer cents (USD). Never store floats.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  stripe_customer_id TEXT,            -- brands: used for Checkout and the billing portal
  stripe_account_id TEXT,             -- clippers: Stripe Connect Express account
  connect_ready INTEGER NOT NULL DEFAULT 0,             -- 1 when Stripe says payouts_enabled
  connect_details_submitted INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- One row per money movement. A balance is always a SUM over this table, so it cannot drift.
--   account 'brand'   : money a brand has added and not yet spent
--   account 'clipper' : money a clipper has earned (available_at = when it can be withdrawn)
CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  account TEXT NOT NULL CHECK (account IN ('brand', 'clipper')),
  kind TEXT NOT NULL,                 -- topup | spend | earning | withdrawal | withdrawal_reversal | refund
  amount_cents INTEGER NOT NULL,      -- signed: positive adds to the balance, negative removes
  available_at INTEGER NOT NULL,      -- unix seconds; counts as available once this has passed
  ref TEXT,                           -- Stripe id or internal key, used to make writes idempotent
  note TEXT,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ledger_kind_ref ON ledger (kind, ref) WHERE ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS ledger_user ON ledger (user_id, account);

-- Audit trail of how each clipper earning was split.
CREATE TABLE IF NOT EXISTS earnings (
  id TEXT PRIMARY KEY,
  brand_user_id TEXT NOT NULL REFERENCES users(id),
  clipper_user_id TEXT NOT NULL REFERENCES users(id),
  campaign TEXT,
  gross_cents INTEGER NOT NULL,       -- what the brand paid
  fee_cents INTEGER NOT NULL,         -- platform fee kept
  net_cents INTEGER NOT NULL,         -- what the clipper receives
  note TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS topups (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  session_id TEXT NOT NULL UNIQUE,    -- Stripe Checkout session
  payment_intent TEXT,
  amount_cents INTEGER NOT NULL,
  refunded_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',   -- open | paid | failed | expired | disputed
  receipt_url TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);
CREATE INDEX IF NOT EXISTS topups_user ON topups (user_id);
CREATE INDEX IF NOT EXISTS topups_pi ON topups (payment_intent);

CREATE TABLE IF NOT EXISTS payouts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | sent | failed | reversed
  stripe_transfer_id TEXT,
  failure TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS payouts_user ON payouts (user_id);

-- Webhook deliveries already handled, so a retry never applies twice.
CREATE TABLE IF NOT EXISTS stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
