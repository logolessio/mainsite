-- Everything that happens on the site, one row each. Admin-only. Old rows can be deleted from /admin/logs.
CREATE TABLE IF NOT EXISTS event_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts INTEGER NOT NULL,
  kind TEXT NOT NULL,        -- pageview | api | auth | security | error | money | admin | clienterror
  name TEXT NOT NULL,        -- short label, e.g. "POST /api/campaigns", "signin", "ratelimit"
  path TEXT,
  method TEXT,
  status INTEGER,
  ms INTEGER,
  actor TEXT,                -- email of the signed-in person, if any
  ip_hash TEXT,              -- salted hash, never the raw address
  country TEXT,
  ua TEXT,                   -- short class, e.g. "Chrome · macOS · desktop"
  ref TEXT,                  -- where they came from (host only)
  detail TEXT
);
CREATE INDEX IF NOT EXISTS event_ts ON event_log (ts);
CREATE INDEX IF NOT EXISTS event_kind_ts ON event_log (kind, ts);
CREATE INDEX IF NOT EXISTS event_actor_ts ON event_log (actor, ts);
CREATE INDEX IF NOT EXISTS event_path_ts ON event_log (path, ts);
