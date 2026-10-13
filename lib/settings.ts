import { db, nowSec } from './db'

/** Switches and limits the owner can change from the admin dashboard. Every change is written to the audit log by the caller. */
export const SETTING_DEFAULTS = {
  payouts_paused: '0', // 1 = nobody can withdraw
  submissions_paused: '0', // 1 = no new clip submissions
  signups_paused: '0', // 1 = no new accounts
  design_cover_effects: '0', // 1 = the old tilt, shine and zoom on campaign covers
  design_font_mono: '0', // 1 = Geist Mono is the main typeface everywhere
  design_cover_border: '0', // 1 = the thin border around campaign covers
  bg_dots: '0', // 1 = show the rolling dot landscape behind the site (off by default)
  daily_payout_cap_cents: '500000', // above this much sent in 24 hours, new withdrawals wait for an admin
  review_over_cents: '50000', // single withdrawals above this wait for an admin
} as const
export type SettingKey = keyof typeof SETTING_DEFAULTS

export async function getSetting(key: SettingKey): Promise<string> {
  try {
    const d = await db()
    const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(key).first<{ value: string }>()
    return r?.value ?? SETTING_DEFAULTS[key]
  } catch {
    return SETTING_DEFAULTS[key]
  }
}

export async function allSettings(): Promise<Record<SettingKey, string>> {
  const out = { ...SETTING_DEFAULTS } as Record<SettingKey, string>
  try {
    const d = await db()
    const rows = (await d.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>()).results
    for (const r of rows) if (r.key in out) out[r.key as SettingKey] = r.value
  } catch {
    /* defaults */
  }
  return out
}

export async function setSetting(key: SettingKey, value: string) {
  const d = await db()
  await d
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(key, value, nowSec())
    .run()
}
