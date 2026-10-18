// The role names and their labels. Safe for the browser: no database code (lib/roles.ts has the lookups).

/**
 * Roles are set by the owner, never by the person themselves.
 *  - admin: the admin pages of the owner dashboard (owner.logoless.io): money, people, content.
 *  - dev: the developer pages of the owner dashboard (also owner.logoless.io): vitals, design options, feature pushes.
 * The addresses in ADMIN_EMAILS are the owner: always both. Everyone else's roles live in the settings table ("roles:<userId>").
 */
export type Role = 'admin' | 'dev'
export const ROLES: { id: Role; label: string; hint: string }[] = [
  { id: 'admin', label: 'Admin', hint: 'Can open the admin dashboard: people, campaigns, clips, payouts and settings.' },
  { id: 'dev', label: 'Developer', hint: 'Can open the developer dashboard: site vitals, design options and feature pushes.' },
]
export const isRole = (v: unknown): v is Role => v === 'admin' || v === 'dev'

