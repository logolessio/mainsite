import { db } from '../db'
import { rolesForEmail } from '../roles'
import { addRole, getMember, removeRole } from './api'
import { getDiscordConfig } from './config'
import { discordIdFor } from './link'

export type SyncResult = { ok: boolean; added: string[]; removed: string[]; note?: string }

/** What kind of member someone is on logoless. Several can be true at once. */
export type Kinds = { admin: boolean; team: boolean; developer: boolean }

export async function memberKinds(userId: string): Promise<Kinds | null> {
  const r = await (await db()).prepare('SELECT email FROM users WHERE id = ?1').bind(userId).first<{ email: string }>()
  if (!r) return null
  const team = await rolesForEmail(r.email)
  return { admin: team.includes('admin'), team: team.length > 0, developer: team.includes('dev') }
}

/** Why someone has the roles they have, in words, for /roles. */
export const kindWords = (k: Kinds) => [k.admin && 'admin', k.team && !k.admin && 'team', k.developer && 'developer'].filter(Boolean) as string[]

/** What Discord roles someone should have: Member for anyone who connected, Verified for the same people (the site is open), Founding for those let in before it opened, and the team's. */
export async function wantedRoles(userId: string) {
  const cfg = await getDiscordConfig()
  const ro = cfg.roles
  const managed = new Set<string>([ro.linked, ro.verified, ro.unverified, ro.founding, ro.developer, ro.admin, ro.team].filter(Boolean))
  const k = await memberKinds(userId)
  const wanted = new Set<string>()
  if (!k) return { cfg, wanted, managed, kinds: null }
  if (ro.linked) wanted.add(ro.linked)
  if (ro.verified) wanted.add(ro.verified)
  if (ro.founding && (await founding(userId))) wanted.add(ro.founding)
  if (ro.developer && k.developer) wanted.add(ro.developer)
  if (ro.admin && k.admin) wanted.add(ro.admin)
  if (ro.team && k.team) wanted.add(ro.team)
  return { cfg, wanted, managed, kinds: k }
}

/** Was this person let in before the site opened (the pre-launch sign-up)? */
async function founding(userId: string): Promise<boolean> {
  const { getPre } = await import('../prelaunch')
  const pre = await getPre(userId)
  return Boolean(pre?.n && pre.founding !== false)
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
