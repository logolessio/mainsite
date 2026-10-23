import { db } from '../db'
import { rolesForEmail } from '../roles'
import { addRole, getMember, removeRole } from './api'
import { getDiscordConfig } from './config'
import { discordIdFor } from './link'

export type SyncResult = { ok: boolean; added: string[]; removed: string[]; note?: string }

/** What kind of member someone is on logoless. Several can be true at once (an artist who also posts content, say). */
export type Kinds = { admin: boolean; team: boolean; developer: boolean; brand: boolean; creator: boolean; clipper: boolean; earnedCents: number }

export async function memberKinds(userId: string): Promise<Kinds | null> {
  const d = await db()
  const r = await d
    .prepare(
      `SELECT u.email,
         COALESCE((SELECT SUM(net_cents) FROM earnings WHERE clipper_user_id = u.id), 0) AS earned,
         (EXISTS (SELECT 1 FROM campaigns c WHERE c.brand_user_id = u.id) OR EXISTS (SELECT 1 FROM ledger l WHERE l.user_id = u.id AND l.account = 'brand')) AS brand,
         EXISTS (SELECT 1 FROM submissions s WHERE s.user_id = u.id) AS submitted,
         EXISTS (SELECT 1 FROM settings s WHERE s.key LIKE 'oauth:app:%' AND json_extract(s.value, '$.ownerId') = u.id) AS apps
       FROM users u WHERE u.id = ?1`,
    )
    .bind(userId)
    .first<{ email: string; earned: number; brand: number; submitted: number; apps: number }>()
  if (!r) return null
  let creator = false
  try {
    // an artist or streamer who claimed their invite link (see migrations/0010_artist_invites.sql)
    creator = Boolean(await d.prepare("SELECT 1 AS x FROM artist_invites WHERE user_id = ?1 AND status = 'claimed' LIMIT 1").bind(userId).first())
  } catch {
    /* no invites table yet */
  }
  const team = await rolesForEmail(r.email)
  const brand = Boolean(r.brand) && !creator
  return {
    admin: team.includes('admin'),
    team: team.length > 0,
    developer: team.includes('dev') || Boolean(r.apps),
    brand,
    creator,
    clipper: Boolean(r.submitted) || (!brand && !creator),
    earnedCents: r.earned,
  }
}

/** Why someone has the roles they have, in words, for /roles. */
export const kindWords = (k: Kinds) =>
  [k.admin && 'admin', k.team && !k.admin && 'team', k.developer && 'developer', k.creator && 'artist', k.brand && 'brand', k.clipper && 'clipper', k.earnedCents > 0 && `$${Math.floor(k.earnedCents / 100).toLocaleString('en-US')} earned`].filter(Boolean) as string[]

/** What Discord roles someone should have, by what they do on logoless. */
export async function wantedRoles(userId: string) {
  const cfg = await getDiscordConfig()
  const ro = cfg.roles
  const managed = new Set<string>([ro.linked, ro.founding, ro.clipper, ro.brand, ro.creator, ro.developer, ro.admin, ro.team, ...ro.tiers.map((t) => t.role)].filter(Boolean))
  const k = await memberKinds(userId)
  const wanted = new Set<string>()
  if (!k) return { cfg, wanted, managed, kinds: null }
  if (ro.linked) wanted.add(ro.linked)
  // a founding member finished the pre-launch sign-up (and was not held back for a look)
  if (ro.founding && (await isFounding(userId))) wanted.add(ro.founding)
  if (ro.clipper && k.clipper) wanted.add(ro.clipper)
  if (ro.brand && k.brand) wanted.add(ro.brand)
  if (ro.creator && k.creator) wanted.add(ro.creator)
  if (ro.developer && k.developer) wanted.add(ro.developer)
  if (ro.admin && k.admin) wanted.add(ro.admin)
  if (ro.team && k.team) wanted.add(ro.team)
  // the highest tier they have reached, and only that one
  const reached = ro.tiers.filter((t) => k.earnedCents >= t.minUsd * 100)
  const top = reached[reached.length - 1]
  if (top) wanted.add(top.role)
  return { cfg, wanted, managed, kinds: k }
}

/** Was this person let in as a founding member through the pre-launch sign-up (beta.logoless.io/onboarding)? They keep the role after the site opens. */
async function isFounding(userId: string): Promise<boolean> {
  const { isFoundingMember } = await import('../prelaunch')
  return isFoundingMember(userId)
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

/**
 * The roles the bot can make for the owner. The site calls clippers "creators" in its wording, so the role for artists and streamers
 * with campaigns (saved as `creator`) is named Artist, to keep the two apart. Rename any of them in Discord freely.
 * Used by the "Make the missing roles" button, by the config key they are saved under.
 */
export const ROLE_NAMES: { key: 'linked' | 'founding' | 'clipper' | 'brand' | 'creator' | 'developer' | 'admin' | 'team'; name: string }[] = [
  { key: 'admin', name: 'Admin' },
  { key: 'team', name: 'Team' },
  { key: 'developer', name: 'Developer' },
  { key: 'creator', name: 'Artist' },
  { key: 'brand', name: 'Brand' },
  { key: 'clipper', name: 'Clipper' },
  { key: 'founding', name: 'Founding member' },
  { key: 'linked', name: 'Linked' },
]
