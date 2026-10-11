-- Artist invites: an admin makes a private link (logoless.io/<slug>) for an artist or brand we have spoken to.
-- The person signs in, claims it, and is walked through setting up their page and their first campaign.
--
-- status: sent (nobody has claimed it yet) | claimed (an account owns it) | revoked (the link is switched off)
-- contact_email + email_lock: when locked, only a sign-in with that exact email can claim the link.
-- step / data_json: where they got to and what they typed, saved as they go so a refresh loses nothing.
CREATE TABLE IF NOT EXISTS artist_invites (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
  artist_name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',        -- email | instagram | other
  contact_email TEXT,
  email_lock INTEGER NOT NULL DEFAULT 0,        -- 1 = only that email may claim the link
  contact_handle TEXT,
  note TEXT,                                    -- private, only admins see it
  status TEXT NOT NULL DEFAULT 'sent',
  user_id TEXT REFERENCES users(id),
  step INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL DEFAULT '{}',
  campaign_id TEXT,
  opens INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at INTEGER NOT NULL,
  opened_at INTEGER,
  claimed_at INTEGER,
  completed_at INTEGER,
  last_active_at INTEGER,
  emailed_at INTEGER
);
CREATE INDEX IF NOT EXISTS artist_invites_user ON artist_invites (user_id);
CREATE INDEX IF NOT EXISTS artist_invites_status ON artist_invites (status, created_at);

-- A campaign made through an invite remembers which one, so the payment page can send the artist back to it.
ALTER TABLE campaigns ADD COLUMN invite_id TEXT;
