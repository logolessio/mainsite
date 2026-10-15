import { db, nowSec, setting } from './db'

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

const key = (userId: string) => `roles:${userId}`

export async function ownerEmails() {
  return ((await setting('ADMIN_EMAILS')) ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export async function rolesOf(userId: string): Promise<Role[]> {
  try {
    const d = await db()
    const r = await d.prepare('SELECT value FROM settings WHERE key = ?1').bind(key(userId)).first<{ value: string }>()
    const list = JSON.parse(r?.value ?? '[]')
    return Array.isArray(list) ? list.filter(isRole) : []
  } catch {
    return []
  }
}

/** The roles for a signed-in email: the owner gets everything, everyone else gets what was granted. */
export async function rolesForEmail(email: string | null | undefined): Promise<Role[]> {
  const e = (email ?? '').trim().toLowerCase()
  if (!e) return []
  if ((await ownerEmails()).includes(e)) return ['admin', 'dev']
  try {
    const d = await db()
    const u = await d.prepare('SELECT id FROM users WHERE email = ?1').bind(e).first<{ id: string }>()
    return u ? await rolesOf(u.id) : []
  } catch {
    return []
  }
}

export async function setRoles(userId: string, roles: Role[]) {
  const d = await db()
  const t = nowSec()
  const clean = [...new Set(roles.filter(isRole))]
  await d
    .prepare('INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
    .bind(key(userId), JSON.stringify(clean), t)
    .run()
  // keep the old role column in step, because older code reads it
  await d.prepare('UPDATE users SET role = ?2 WHERE id = ?1').bind(userId, clean.includes('admin') ? 'admin' : 'user').run()
  return clean
}

/** Everyone who has been given a role (not including the owner, who is set in ADMIN_EMAILS). */
export async function roleHolders(): Promise<Record<string, Role[]>> {
  const d = await db()
  const rows = (await d.prepare("SELECT key, value FROM settings WHERE key LIKE 'roles:%'").all<{ key: string; value: string }>()).results
  const out: Record<string, Role[]> = {}
  for (const r of rows) {
    try {
      const list = (JSON.parse(r.value) as unknown[]).filter(isRole)
      if (list.length) out[r.key.slice('roles:'.length)] = list
    } catch {
      /* skip a broken row */
    }
  }
  return out
}
