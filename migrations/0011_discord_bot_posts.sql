-- The Discord bot's own record of what it posted, so the 30-second loop can post each thing once and edit it as it changes.
-- kind: submission | earning | payout (a withdrawal sent) | campaign
-- ref_id: the id of that thing on the site. hash: what the post last showed, so an edit is only sent when something changed.
-- message_id is empty for a moment while a post is being made: claiming the row first is what stops two runs posting it twice.
CREATE TABLE IF NOT EXISTS discord_posts (
  kind TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  channel_id TEXT NOT NULL DEFAULT '',
  message_id TEXT NOT NULL DEFAULT '',
  hash TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (kind, ref_id)
);
CREATE INDEX IF NOT EXISTS discord_posts_recent ON discord_posts (kind, created_at);
