-- Remove the fake campaigns from the database.
--
-- "Fake" means two kinds of made-up campaign:
--   * mock campaigns: ids starting with "mock-", made by the old admin testing tool (now removed from the code);
--   * sample campaigns: admin_note = 'sample', the 10 made-up artists added by migrations/0003 (red-room, mercury,
--     late-shift, blur, concrete, tail-lights, off-mic, one-beam, round-nine, wax).
-- The site already hides both from every public page (NOT_FAKE in lib/campaigns-db.ts). This script deletes the rows.
--
-- NOTHING HAS BEEN DELETED AUTOMATICALLY. Review this file, then run it yourself:
--
--   npx wrangler d1 execute logoless --remote --file scripts/remove-fake-campaigns.sql
--
-- Money is never touched. A fake campaign that has ANY row in ledger, earnings or topups is left out of every delete
-- below (it is "kept"), so the books always balance. The first query shows which ones those are; if any are kept,
-- look at them by hand in /admin/campaigns and end them instead. Running this file twice is safe.

-- 1. Preview: every fake campaign with what is attached to it. "kept" = 1 means it has money rows and will NOT be deleted.
--    To see this without deleting anything, run only this query with:
--    npx wrangler d1 execute logoless --remote --command "<paste the SELECT here>"
SELECT
  c.id,
  c.title,
  c.status,
  COALESCE(c.admin_note, '') AS note,
  (SELECT COUNT(*) FROM submissions s WHERE s.campaign_id = c.id) AS submissions,
  (SELECT COUNT(*) FROM favorites f WHERE f.campaign_id = c.id) AS favorites,
  (SELECT COUNT(*) FROM earnings e WHERE e.campaign_id = c.id) AS earnings,
  (SELECT COUNT(*) FROM ledger l WHERE l.campaign_id = c.id) AS ledger_rows,
  (SELECT COUNT(*) FROM topups t WHERE t.campaign_id = c.id) AS topups,
  (EXISTS (SELECT 1 FROM ledger l WHERE l.campaign_id = c.id)
    OR EXISTS (SELECT 1 FROM earnings e WHERE e.campaign_id = c.id)
    OR EXISTS (SELECT 1 FROM topups t WHERE t.campaign_id = c.id)) AS kept
FROM campaigns c
WHERE c.id LIKE 'mock-%' OR c.admin_note = 'sample'
ORDER BY kept DESC, c.id;

-- 2. The deletes, dependent rows first and the campaigns last. Every statement uses the same rule for which campaigns
--    go: fake, and no ledger, earnings or topups rows. (Those three tables are only read here, never changed.)

-- 2a. Per-clip view-scan state in settings, for clips sent to those campaigns.
DELETE FROM settings
WHERE (key LIKE 'viewscan:%' OR key LIKE 'viewscan-gone:%')
  AND substr(key, instr(key, ':') + 1) IN (
    SELECT s.id FROM submissions s WHERE s.campaign_id IN (
      SELECT c.id FROM campaigns c
      WHERE (c.id LIKE 'mock-%' OR c.admin_note = 'sample')
        AND NOT EXISTS (SELECT 1 FROM ledger l WHERE l.campaign_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM earnings e WHERE e.campaign_id = c.id)
        AND NOT EXISTS (SELECT 1 FROM topups t WHERE t.campaign_id = c.id)));

-- 2b. Clips sent to those campaigns (none of them was ever paid: there are no earnings or ledger rows).
DELETE FROM submissions
WHERE campaign_id IN (
  SELECT c.id FROM campaigns c
  WHERE (c.id LIKE 'mock-%' OR c.admin_note = 'sample')
    AND NOT EXISTS (SELECT 1 FROM ledger l WHERE l.campaign_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM earnings e WHERE e.campaign_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM topups t WHERE t.campaign_id = c.id));

-- 2c. Saved (favourited) campaigns.
DELETE FROM favorites
WHERE campaign_id IN (
  SELECT c.id FROM campaigns c
  WHERE (c.id LIKE 'mock-%' OR c.admin_note = 'sample')
    AND NOT EXISTS (SELECT 1 FROM ledger l WHERE l.campaign_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM earnings e WHERE e.campaign_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM topups t WHERE t.campaign_id = c.id));

-- 2d. Per-campaign settings: when it ended, who paused it, its per-clip and per-clipper caps.
DELETE FROM settings
WHERE (key LIKE 'ended-at:%' OR key LIKE 'paused-by:%' OR key LIKE 'campaign-caps:%')
  AND substr(key, instr(key, ':') + 1) IN (
    SELECT c.id FROM campaigns c
    WHERE (c.id LIKE 'mock-%' OR c.admin_note = 'sample')
      AND NOT EXISTS (SELECT 1 FROM ledger l WHERE l.campaign_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM earnings e WHERE e.campaign_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM topups t WHERE t.campaign_id = c.id));

-- 2e. Take them off the owner's pinned list (a JSON list of ids in settings).
UPDATE settings
SET value = (
  SELECT COALESCE(json_group_array(j.value), '[]') FROM json_each(settings.value) j
  WHERE j.value NOT IN (
    SELECT c.id FROM campaigns c
    WHERE (c.id LIKE 'mock-%' OR c.admin_note = 'sample')
      AND NOT EXISTS (SELECT 1 FROM ledger l WHERE l.campaign_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM earnings e WHERE e.campaign_id = c.id)
      AND NOT EXISTS (SELECT 1 FROM topups t WHERE t.campaign_id = c.id)))
WHERE key = 'pinned_campaigns' AND json_valid(value);

-- 2f. An artist link should never point at a fake campaign, but if one does, unlink it (the link itself stays).
UPDATE artist_invites
SET campaign_id = NULL
WHERE campaign_id IN (
  SELECT c.id FROM campaigns c
  WHERE (c.id LIKE 'mock-%' OR c.admin_note = 'sample')
    AND NOT EXISTS (SELECT 1 FROM ledger l WHERE l.campaign_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM earnings e WHERE e.campaign_id = c.id)
    AND NOT EXISTS (SELECT 1 FROM topups t WHERE t.campaign_id = c.id));

-- 2g. Finally the campaigns themselves.
DELETE FROM campaigns
WHERE (id LIKE 'mock-%' OR admin_note = 'sample')
  AND NOT EXISTS (SELECT 1 FROM ledger l WHERE l.campaign_id = campaigns.id)
  AND NOT EXISTS (SELECT 1 FROM earnings e WHERE e.campaign_id = campaigns.id)
  AND NOT EXISTS (SELECT 1 FROM topups t WHERE t.campaign_id = campaigns.id);

-- 3. What is left: should be no rows. Anything listed here has money attached and was kept on purpose.
SELECT id, title, status FROM campaigns WHERE id LIKE 'mock-%' OR admin_note = 'sample';
