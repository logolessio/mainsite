import { SITE } from '../site'
import { getLinks } from '../socials-db'
import { botReady, discord, getMember } from './api'
import { getDiscordConfig } from './config'
import { discordIdFor, dmEnabled } from './link'
import { wantedRoles } from './roles'

/**
 * Everything the Discord page in the dashboard shows: who they are on Discord, which of the server roles logoless hands out they
 * have (and how to earn the rest), and how to join the server. Reads only; changes go through /api/me/discord.
 */
export type RoleView = { id: string; name: string; color: string | null; have: boolean; how: string }
export type DiscordOverview = {
  linked: boolean
  account: { name: string; username: string; avatar: string | null } | null
  inServer: boolean | null
  roles: RoleView[]
  invite: string
  dm: boolean
  botReady: boolean
  serverConfigured: boolean
}

const hex = (n: number) => (n ? `#${n.toString(16).padStart(6, '0')}` : null)

export async function discordOverview(userId: string): Promise<DiscordOverview> {
  const [id, dm, ready, cfg, links] = await Promise.all([discordIdFor(userId), dmEnabled(userId), botReady(), getDiscordConfig(), getLinks().catch(() => [])])
  const invite = links.find((l) => l.platform === 'discord')?.url ?? SITE.social.discord
  const base: DiscordOverview = { linked: Boolean(id), account: null, inServer: null, roles: [], invite, dm, botReady: ready, serverConfigured: Boolean(cfg.guildId) }
  if (!id || !ready) return base

  const [user, member, guildRoles, want] = await Promise.all([
    discord<{ username: string; global_name: string | null; avatar: string | null }>('GET', `/users/${id}`),
    cfg.guildId ? getMember(cfg.guildId, id) : Promise.resolve(null),
    cfg.guildId ? discord<{ id: string; name: string; color: number }[]>('GET', `/guilds/${cfg.guildId}/roles`) : Promise.resolve(null),
    wantedRoles(userId),
  ])
  if (user.ok && user.json) {
    const u = user.json
    base.account = { name: u.global_name || u.username, username: u.username, avatar: u.avatar ? `https://cdn.discordapp.com/avatars/${id}/${u.avatar}.png?size=128` : null }
  }
  if (member) base.inServer = member.ok ? true : member.status === 404 ? false : null
  const have = new Set(member?.ok ? (member.json?.roles ?? []) : [])
  const names = new Map((guildRoles?.ok ? (guildRoles.json ?? []) : []).map((r) => [r.id, r]))
  const r = cfg.roles
  const list: { id: string; fallback: string; how: string }[] = [
    { id: r.linked, fallback: 'Linked', how: 'For linking your logoless account.' },
    { id: r.clipper, fallback: 'Creator', how: 'For creators on logoless.' },
    { id: r.brand, fallback: 'Brand', how: 'For brands running campaigns.' },
    { id: r.team, fallback: 'Team', how: 'For the logoless team.' },
    ...r.tiers.map((t) => ({ id: t.role, fallback: `$${t.minUsd.toLocaleString('en-US')}+`, how: `Earn $${t.minUsd.toLocaleString('en-US')} on logoless.` })),
  ]
  const seen = new Set<string>()
  for (const x of list) {
    if (!x.id || seen.has(x.id)) continue
    seen.add(x.id)
    const g = names.get(x.id)
    const owned = have.has(x.id)
    // the team role is only shown to the team; brand and creator only the one that applies
    if (!owned && !want.wanted.has(x.id) && (x.id === r.team || x.id === r.brand || x.id === r.clipper)) continue
    base.roles.push({ id: x.id, name: g?.name ?? x.fallback, color: hex(g?.color ?? 0), have: owned, how: x.how })
  }
  return base
}
