-- Discord-style profiles: a second theme colour, a name effect, pronouns, a card effect, and an online-status switch.
ALTER TABLE profiles ADD COLUMN accent2 TEXT NOT NULL DEFAULT '#ffffff';
ALTER TABLE profiles ADD COLUMN name_effect TEXT NOT NULL DEFAULT 'solid';
ALTER TABLE profiles ADD COLUMN pronouns TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN card_effect TEXT NOT NULL DEFAULT 'none';
