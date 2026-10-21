-- The public submissions feed (/submissions): star ratings, and a cache of what each clip's platform says about it.

-- One rating per person per clip, 1 to 5 stars. Changing your mind replaces your rating.
CREATE TABLE IF NOT EXISTS clip_ratings (
  submission_id TEXT NOT NULL REFERENCES submissions(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (submission_id, user_id)
);
CREATE INDEX IF NOT EXISTS clip_ratings_user ON clip_ratings (user_id);

-- What TikTok, YouTube, Instagram or X said about a clip the last time we asked (thumbnail, title, numbers, posted date).
-- Only public pages and oEmbed are read. Refreshed every few hours when someone looks at the clip.
CREATE TABLE IF NOT EXISTS clip_meta (
  submission_id TEXT PRIMARY KEY REFERENCES submissions(id),
  ok INTEGER NOT NULL DEFAULT 0,          -- 1 when the platform answered with something useful
  gone INTEGER NOT NULL DEFAULT 0,        -- 1 when the post is deleted or private
  embed_id TEXT,                          -- the id the platform's player needs (TikTok video id, YouTube id, Instagram code, X post id)
  thumb TEXT,                             -- the platform's picture address (served to visitors through our own address)
  title TEXT,
  author TEXT,
  views INTEGER,
  likes INTEGER,
  comments INTEGER,
  posted_at INTEGER,
  fetched_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS submissions_public_feed ON submissions (status, created_at DESC);
