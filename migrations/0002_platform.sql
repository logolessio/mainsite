-- logoless platform: profiles, campaigns, submissions, notifications, editable content, audit trail, limits.
-- Safe to run on a database that already has 0001 applied.

-- ---------- users ----------
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';            -- user | admin (the owner is set by ADMIN_EMAILS)
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';        -- active | suspended | banned
ALTER TABLE users ADD COLUMN risk_level TEXT NOT NULL DEFAULT 'low';       -- low | elevated | high
ALTER TABLE users ADD COLUMN risk_reasons TEXT;                            -- short human text, e.g. "VPN at sign-up"
ALTER TABLE users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0;   -- bump to sign a person out everywhere
ALTER TABLE users ADD COLUMN last_seen_at INTEGER;
ALTER TABLE users ADD COLUMN signup_country TEXT;
ALTER TABLE users ADD COLUMN signup_asn INTEGER;
ALTER TABLE users ADD COLUMN signup_ip_hash TEXT;                          -- salted hash, never the raw address
ALTER TABLE users ADD COLUMN image TEXT;                                   -- provider avatar URL
CREATE INDEX IF NOT EXISTS users_seen ON users (last_seen_at);

-- ---------- ledger: add a per-campaign pool ----------
ALTER TABLE ledger RENAME TO ledger_old;
CREATE TABLE ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  account TEXT NOT NULL CHECK (account IN ('brand', 'clipper', 'campaign')),
  kind TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  available_at INTEGER NOT NULL,
  ref TEXT,
  note TEXT,
  created_at INTEGER NOT NULL,
  campaign_id TEXT
);
INSERT INTO ledger (id, user_id, account, kind, amount_cents, available_at, ref, note, created_at)
  SELECT id, user_id, account, kind, amount_cents, available_at, ref, note, created_at FROM ledger_old;
DROP TABLE ledger_old;
CREATE UNIQUE INDEX IF NOT EXISTS ledger_kind_ref ON ledger (kind, ref) WHERE ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS ledger_user ON ledger (user_id, account);
CREATE INDEX IF NOT EXISTS ledger_campaign ON ledger (campaign_id) WHERE campaign_id IS NOT NULL;

ALTER TABLE topups ADD COLUMN stripe_fee_cents INTEGER NOT NULL DEFAULT 0;   -- Stripe's processing cost for this payment
ALTER TABLE earnings ADD COLUMN campaign_id TEXT;
ALTER TABLE earnings ADD COLUMN submission_id TEXT;

-- ---------- profiles ----------
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  country TEXT,
  avatar_key TEXT,                                -- object key in the uploads bucket, or null to use the provider avatar
  banner_kind TEXT NOT NULL DEFAULT 'preset',     -- preset | image
  banner_value TEXT NOT NULL DEFAULT 'noir',      -- preset name or an uploads key
  dot_color TEXT NOT NULL DEFAULT '#ffffff',
  accent TEXT NOT NULL DEFAULT '#ffffff',
  font TEXT NOT NULL DEFAULT 'geist',
  links_json TEXT NOT NULL DEFAULT '[]',          -- [{platform, url}]
  website TEXT,
  show_json TEXT NOT NULL DEFAULT '{}',           -- which stats and sections are public
  badges_json TEXT NOT NULL DEFAULT '[]',         -- up to 5 equipped badge ids
  niches_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- ---------- campaigns ----------
CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,                            -- url slug
  brand_user_id TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  creator TEXT NOT NULL,
  type TEXT NOT NULL,
  cover_url TEXT NOT NULL DEFAULT '/covers/01.jpg',
  preview_url TEXT,
  platforms_json TEXT NOT NULL DEFAULT '[]',
  rate_cents INTEGER NOT NULL,                    -- paid per 1,000 verified views
  budget_cents INTEGER NOT NULL,
  ends_on TEXT,
  summary TEXT NOT NULL DEFAULT '',
  clip_this_json TEXT NOT NULL DEFAULT '[]',
  off_limits_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'requested',       -- requested | awaiting_payment | paid | live | paused | ended | rejected
  admin_note TEXT,
  payment_session_id TEXT,
  paid_at INTEGER,
  launched_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS campaigns_status ON campaigns (status);
CREATE INDEX IF NOT EXISTS campaigns_brand ON campaigns (brand_user_id);

-- ---------- clip submissions ----------
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',         -- pending | approved | rejected
  reviewed_by TEXT,
  reviewed_at INTEGER,
  reject_reason TEXT,
  views_verified INTEGER NOT NULL DEFAULT 0,
  earned_cents INTEGER NOT NULL DEFAULT 0,        -- net paid to the clipper so far
  created_at INTEGER NOT NULL,
  UNIQUE (campaign_id, url)
);
CREATE INDEX IF NOT EXISTS submissions_user ON submissions (user_id);
CREATE INDEX IF NOT EXISTS submissions_status ON submissions (status, created_at);

-- ---------- favourites and notifications ----------
CREATE TABLE IF NOT EXISTS favorites (
  user_id TEXT NOT NULL REFERENCES users(id),
  campaign_id TEXT NOT NULL REFERENCES campaigns(id),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, campaign_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  href TEXT,
  dedupe_key TEXT NOT NULL,                       -- the same event never notifies twice
  read_at INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS notifications_user ON notifications (user_id, created_at DESC);

-- ---------- achievements ----------
CREATE TABLE IF NOT EXISTS badges_unlocked (
  user_id TEXT NOT NULL REFERENCES users(id),
  badge_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, badge_id)
);
CREATE TABLE IF NOT EXISTS user_events (          -- simple counters, e.g. banner_changed
  user_id TEXT NOT NULL REFERENCES users(id),
  event TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, event)
);

-- ---------- editable site text ----------
CREATE TABLE IF NOT EXISTS content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT NOT NULL
);
-- Every text change, who made it, and a hash chain so a deleted or altered row is detectable.
CREATE TABLE IF NOT EXISTS content_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT NOT NULL,
  editor_id TEXT NOT NULL,
  editor_email TEXT NOT NULL,
  reason TEXT,
  created_at INTEGER NOT NULL,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE
);
CREATE UNIQUE INDEX IF NOT EXISTS content_versions_prev ON content_versions (prev_hash);
CREATE INDEX IF NOT EXISTS content_versions_key ON content_versions (key, id DESC);

-- ---------- audit log (every admin action; append only, hash chained) ----------
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id TEXT,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT,
  ip_hash TEXT,
  created_at INTEGER NOT NULL,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE
);
CREATE UNIQUE INDEX IF NOT EXISTS audit_prev ON audit_log (prev_hash);

-- ---------- limits and switches ----------
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
