-- Notification centre: each person's notification settings, messages held back for quiet hours or a digest, and small
-- per-person dashboard state (when they last opened their recap, which optional pages they took out of the sidebar).
-- Only adds tables and one column; nothing existing is changed or removed.

-- prefs_json: see lib/notify-prefs.ts (kind × channel switches, quiet hours, digests, time zone)
CREATE TABLE IF NOT EXISTS notification_prefs (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  prefs_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- An email or Discord message waiting for its moment (the end of quiet hours, or the next digest). The text is kept here so it
-- still goes out if the person clears the notification on the site first.
CREATE TABLE IF NOT EXISTS notification_outbox (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  channel TEXT NOT NULL,                           -- email | discord
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  href TEXT,
  due_at INTEGER NOT NULL,
  sent_at INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS notification_outbox_due ON notification_outbox (sent_at, due_at);

-- 1 = the person switched this kind off for the site: kept (so it is never sent twice) but not shown.
ALTER TABLE notifications ADD COLUMN muted INTEGER NOT NULL DEFAULT 0;

-- recap_seen_at: the last time they opened their recap (it glows gold again after three months).
-- nav_hidden: JSON list of optional sidebar pages they removed, e.g. ["discord"].
CREATE TABLE IF NOT EXISTS dashboard_state (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  recap_seen_at INTEGER,
  nav_hidden TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL
);
