-- The launch waitlist allows one spot per device, so the list cannot be filled by one person with many addresses.
--
-- launch_devices: which device holds which spot. `key` is 'c:<device id>' (the id in the signed ll_wl cookie) or
-- 'f:<keyed hash of a light browser fingerprint and the network>'. Only hashes are stored: never an IP address or the raw fingerprint.
-- `email_key` is the same hash of the address used by the launch-signup:<hash> rows in settings.
-- A device where the owner has signed in is exempt (it carries a signed owner mark in its cookie) and is never written here.
CREATE TABLE IF NOT EXISTS launch_devices (
  key TEXT PRIMARY KEY,
  email_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS launch_devices_email ON launch_devices (email_key);
