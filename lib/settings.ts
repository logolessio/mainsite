import { COVER_TEXT_DEFAULTS, LAYOUT_DEFAULTS } from './design-choices'
import { db, nowSec } from './db'

/** Switches and limits the owner can change from the admin dashboard. Every change is written to the audit log by the caller. */
export const SETTING_DEFAULTS = {
  launch_on: '0', // 1 = the launch page (a countdown and a sign-up) is shown to everyone but the owners
  launch_end: '', // when the countdown ends, in seconds since 1970 (empty = no countdown shown)
  launch_headline: 'logoless opens soon.', // the big words above the countdown
  launch_text: 'Reserve your username and we will email you the moment the doors open.', // the line under it
  launch_auto: '1', // 1 = the site opens by itself when the countdown reaches zero
  payouts_paused: '0', // 1 = nobody can withdraw
  submissions_paused: '0', // 1 = no new clip submissions
  autoapprove_needs_verified: '1', // 1 = a clip is only approved by the first look when it comes from an account verified by a code in its bio; otherwise a person looks
  views_scan_paused: '0', // 1 = the two-hourly look at the views of live submissions is switched off
  signups_paused: '0', // 1 = no new accounts
  design_font_headline: '', // a typeface (an id from lib/fonts.ts FACES) for headlines; empty follows the preset
  design_font_body: '', // ...for body text
  design_font_ui: '', // ...for buttons, menus and fields
  design_font_figures: '', // ...for big numbers
  design_font_mono_face: '', // ...for code and small print
  design_font_mono: '0', // older switch: 1 = Geist Mono is the main typeface (design_font replaces it)
  mock_public: '0', // 1 = mock campaigns (made up by an admin to try the site) are shown to everyone, not just the team
  design_font: 'inter', // the typeface for the whole site (an id from lib/fonts.ts)
  owner_notes: '', // the private notepad on the owner overview
  pinned_campaigns: '[]', // ids of live campaigns the owner pinned to the top of the browse page (a JSON list)
  design_roundness: '100', // how round the whole site is, 0 to 150 (100 is the standard look; see lib/roundness.ts)
  design_cover_border: '0', // 1 = the thin border around campaign covers
  design_cover_bar: '0', // 1 = the bar along the bottom of a cover showing how much budget is left
  design_scroll_effects: '0', // 1 = sections fade and slide in as you scroll
  design_liquid_loader: '0', // 1 = the white liquid fill behind the onboarding loader
  ...COVER_TEXT_DEFAULTS, // how the text on a campaign cover looks (see lib/design-choices.ts)
  ...LAYOUT_DEFAULTS, // how the campaigns are laid out on the browse page
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

/** The ids of the campaigns pinned to the top of the browse page, newest pin first. */
export async function pinnedIds(): Promise<string[]> {
  try {
    const v = JSON.parse(await getSetting('pinned_campaigns'))
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}
