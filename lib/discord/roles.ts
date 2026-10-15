import { db } from '../db'
import { rolesForEmail } from '../roles'
import { addRole, getMember, removeRole } from './api'
import { getDiscordConfig } from './config'
import { discordIdFor } from './link'

export type SyncResult = { ok: boolean; added: string[]; removed: string[]; note?: string }

/** What Discord roles someone should have, by what they have done on logoless. */
export async function wantedRoles(userId: string) {
  const cfg = await getDiscordConfig()
  const d = await db()
  const r = await d
    .prepare(
      `SELECT u.email,
         COALESCE((SELECT SUM(net_cents) FROM earnings WHERE clipper_user_id = u.id), 0) AS earned,
         (EXISTS (SELECT 1 FROM campaigns c WHERE c.brand_user_id = u.id) OR EXISTS (SELECT 1 FROM ledger l WHERE l.user_id = u.id AND l.account = 'brand')) AS brand
       FROM users u WHERE u.id = ?1`,
    )
    .bind(userId)
    .first<{ email: string; earned: number; brand: number }>()
  if (!r) return { cfg, wanted: new Set<string>(), managed: new Set<string>() }
  const team = (await rolesForEmail(r.email)).length > 0
  const managed = new Set<string>([cfg.roles.linked, cfg.roles.clipper, cfg.roles.brand, cfg.roles.team, ...cfg.roles.tiers.map((t) => t.role)].filter(Boolean))
  const wanted = new Set<string>()
  if (cfg.roles.linked) wanted.add(cfg.roles.linked)
  if (cfg.roles.brand && r.brand) wanted.add(cfg.roles.brand)
  if (cfg.roles.clipper && !r.brand) wanted.add(cfg.roles.clipper)
  if (cfg.roles.team && team) wanted.add(cfg.roles.team)
  // the highest tier they have reached, and only that one
  const reached = cfg.roles.tiers.filter((t) => r.earned >= t.minUsd * 100)
  const top = reached[reached.length - 1]
  if (top) wanted.add(top.role)
  return { cfg, wanted, managed }
}

/** Brings someone's roles in the server in line with their account: gives the ones they have earned, takes away ones they should not have. */
export async function syncRoles(userId: string): Promise<SyncResult> {
  const id = await discordIdFor(userId)
  if (!id) return { ok: false, added: [], removed: [], note: 'Not linked to Discord.' }
  const { cfg, wanted, managed } = await wantedRoles(userId)
  if (!cfg.guildId) return { ok: false, added: [], removed: [], note: 'No server is set up yet.' }
  if (managed.size === 0) return { ok: true, added: [], removed: [], note: 'No roles are set up yet.' }
  const m = await getMember(cfg.guildId, id)
  if (!m.ok || !m.json) return { ok: false, added: [], removed: [], note: m.status === 404 ? 'You are not in the server yet.' : 'Could not read your roles.' }
  const have = new Set(m.json.roles)
  const added: string[] = []
  const removed: string[] = []
  for (const role of wanted) if (!have.has(role) && (await addRole(cfg.guildId, id, role)).ok) added.push(role)
  for (const role of managed) if (have.has(role) && !wanted.has(role) && (await removeRole(cfg.guildId, id, role)).ok) removed.push(role)
  return { ok: true, added, removed }
}
