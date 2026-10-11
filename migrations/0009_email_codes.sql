-- Passwords and email verification.
--
-- credentials: one row per person who has a password. Only a salted, peppered PBKDF2 hash is stored, never the password.
-- email_codes: a six-digit code sent by email, for one purpose at a time ('signup' or 'reset'). Only a keyed hash of the
-- code is stored. A pending sign-up keeps the chosen password's hash in `payload` until the email address is proven.
CREATE TABLE IF NOT EXISTS credentials (
  email TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS email_codes (
  email TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at INTEGER NOT NULL,
  payload TEXT,
  PRIMARY KEY (email, purpose)
);
