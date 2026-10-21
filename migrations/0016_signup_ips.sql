-- The network address each account was made from, kept only to stop one person running many accounts (up to 3 per address).
-- Removed with the account when it is deleted.
CREATE TABLE IF NOT EXISTS signup_ips (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  ip TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS signup_ips_ip ON signup_ips (ip);
