// What the admin can export. Columns are listed on purpose: picture data, secrets and rate-limit counters are never included.
export type ExportSet = { id: string; label: string; table: string; cols: string; order: string; note?: string; ts?: string }

export const EXPORTS: ExportSet[] = [
  { id: 'events', label: 'Activity log', table: 'event_log', cols: 'id, ts, kind, name, path, method, status, ms, actor, ip_hash, country, ua, ref, detail', order: 'id DESC', ts: 'ts', note: 'Every request, page view, sign-in, security and money event. Uses the range and filters you picked.' },
  { id: 'users', label: 'Users', table: 'users', cols: 'id, email, name, role, status, risk_level, risk_reasons, signup_country, signup_asn, last_seen_at, created_at', order: 'created_at DESC' },
  { id: 'profiles', label: 'Profiles', table: 'profiles', cols: 'user_id, handle, display_name, pronouns, bio, country, font, name_effect, card_effect, accent, accent2, dot_color, links_json, show_json, badges_json, created_at, updated_at', order: 'created_at DESC' },
  { id: 'campaigns', label: 'Campaigns', table: 'campaigns', cols: 'id, brand_user_id, title, creator, type, platforms_json, rate_cents, budget_cents, ends_on, status, admin_note, paid_at, launched_at, created_at, updated_at', order: 'created_at DESC' },
  { id: 'submissions', label: 'Clips', table: 'submissions', cols: 'id, campaign_id, user_id, platform, url, status, reviewed_by, reviewed_at, reject_reason, views_verified, earned_cents, created_at', order: 'created_at DESC' },
  { id: 'ledger', label: 'Money ledger', table: 'ledger', cols: 'id, user_id, account, kind, amount_cents, available_at, ref, note, campaign_id, created_at', order: 'created_at DESC' },
  { id: 'earnings', label: 'Earnings and fees', table: 'earnings', cols: 'id, brand_user_id, clipper_user_id, campaign, campaign_id, submission_id, gross_cents, fee_cents, net_cents, note, created_at', order: 'created_at DESC' },
  { id: 'topups', label: 'Payments in', table: 'topups', cols: 'id, user_id, campaign_id, session_id, payment_intent, amount_cents, refunded_cents, stripe_fee_cents, status, created_at, paid_at', order: 'created_at DESC' },
  { id: 'payouts', label: 'Payouts out', table: 'payouts', cols: 'id, user_id, amount_cents, status, stripe_transfer_id, failure, review_reason, reviewed_by, created_at, updated_at', order: 'created_at DESC' },
  { id: 'notifications', label: 'Notifications', table: 'notifications', cols: 'id, user_id, kind, title, body, href, read_at, created_at', order: 'created_at DESC' },
  { id: 'favorites', label: 'Favourites', table: 'favorites', cols: 'user_id, campaign_id, created_at', order: 'created_at DESC' },
  { id: 'badges', label: 'Badges unlocked', table: 'badges_unlocked', cols: 'user_id, badge_id, unlocked_at', order: 'unlocked_at DESC' },
  { id: 'audit', label: 'Admin actions', table: 'audit_log', cols: 'id, actor_email, action, target, detail, ip_hash, created_at, prev_hash, hash', order: 'id DESC' },
  { id: 'text', label: 'Text changes', table: 'content_versions', cols: 'id, key, old_value, new_value, editor_email, reason, created_at, prev_hash, hash', order: 'id DESC' },
  { id: 'stripe_events', label: 'PayPal events received', table: 'stripe_events', cols: 'id, type, received_at', order: 'received_at DESC' },
  { id: 'settings', label: 'Switches and limits', table: 'settings', cols: 'key, value, updated_at', order: 'key' },
]
