-- How strong and how fast a profile card's particle effect runs (0 to 100).
ALTER TABLE profiles ADD COLUMN effect_intensity INTEGER NOT NULL DEFAULT 50;
ALTER TABLE profiles ADD COLUMN effect_speed INTEGER NOT NULL DEFAULT 50;
