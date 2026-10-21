-- The profile studio: page backgrounds, overlays, GIFs, solid-colour pictures, noise, text-effect controls, effect
-- tints and finer privacy choices, kept together as JSON so the older columns stay as they are. See lib/profile-extras.ts.
ALTER TABLE profiles ADD COLUMN style_json TEXT NOT NULL DEFAULT '{}';
