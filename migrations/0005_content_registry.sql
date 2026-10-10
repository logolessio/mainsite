-- Every piece of site text the admin has met while editing, so the "all text" list can show it.
CREATE TABLE IF NOT EXISTS content_registry (
  key TEXT PRIMARY KEY,
  original TEXT NOT NULL,
  page TEXT NOT NULL,
  seen_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS content_registry_page ON content_registry (page);
