import { discord } from './api'
import type { DiscordConfig } from './config'

export type AccessLine = { label: string; ok: boolean; note: string }

import { ADMIN, effective, EMBED, MANAGE_CHANNELS, MANAGE_ROLES, SEND, VIEW, ZERO, type Chan, type Role } from './permissions'

const CHANNEL_NAMES: Record<string, string> = {
  getStarted: '#get-started', rules: '#rules', site: '#site', support: '#support', status: '#status', news: '#news', newCampaigns: '#new-campaigns',
  system: '#system', updates: '#updates', clips: 'Proof', logs: 'Team log', payouts: '#payouts', submissions: '#submissions',
}

/**
 * Looks at everything that is set up and says, line by line, what the bot can and cannot do: is it in the server, can it
 * see and post in each channel, can it manage each category, and is each role below its own so it may hand it out.
 */
export async function checkAccess(cfg: DiscordConfig): Promise<AccessLine[]> {
  const lines: AccessLine[] = []
  const me = await discord<{ id: string; username: string }>('GET', '/users/@me')
  if (!me.ok || !me.json) return [{ label: 'Bot token', ok: false, note: 'Discord rejected the token. Check DISCORD_BOT_TOKEN in Cloudflare.' }]
  const botId = me.json.id
  lines.push({ label: 'Bot token', ok: true, note: `Works. The bot is ${me.json.username}.` })
  if (!cfg.guildId) return [...lines, { label: 'Server', ok: false, note: 'Save your server ID first.' }]

  const [guild, member, roleList] = await Promise.all([
    discord<{ id: string; name: string }>('GET', `/guilds/${cfg.guildId}`),
    discord<{ roles: string[] }>('GET', `/guilds/${cfg.guildId}/members/${botId}`),
    discord<Role[]>('GET', `/guilds/${cfg.guildId}/roles`),
  ])
  if (!guild.ok || !guild.json) return [...lines, { label: 'Server', ok: false, note: guild.status === 404 ? 'No server has that ID. Check it.' : 'The bot is not in that server. Use the invite link, and check the server ID.' }]
  lines.push({ label: 'Server', ok: true, note: `The bot is in ${guild.json.name}.` })
  if (!member.ok || !member.json || !roleList.ok || !roleList.json) return [...lines, { label: 'Bot role', ok: false, note: 'Could not read the bot\'s roles in the server.' }]

  const roles = roleList.json
  const botRoleIds = member.json.roles
  const botRoles = roles.filter((r) => botRoleIds.includes(r.id))
  const everyoneRole = roles.find((r) => r.id === cfg.guildId)
  const base = botRoles.reduce((a, r) => a | BigInt(r.permissions), BigInt(everyoneRole?.permissions ?? '0'))
  const isAdmin = Boolean(base & ADMIN)
  const topPos = Math.max(0, ...botRoles.map((r) => r.position))
  lines.push({ label: 'Bot role', ok: true, note: isAdmin ? 'The bot has Administrator, so it can reach everything. Simple, but you may prefer to grant only what it needs.' : `${botRoles.map((r) => r.name).join(', ') || 'none'}.` })

  const channels: [string, string][] = Object.entries(cfg.channels).filter(([, id]) => id).map(([k, id]) => [CHANNEL_NAMES[k] ?? k, id as string])
  const categories: [string, string][] = [['Artists category', cfg.artistsCategory], ['Inactive category', cfg.inactiveCategory], ['Tickets category', cfg.ticketCategory]].filter(([, id]) => id) as [string, string][]

  const look = async ([label, id]: [string, string], category: boolean): Promise<AccessLine> => {
    const c = await discord<Chan>('GET', `/channels/${id}`)
    if (!c.ok || !c.json) {
      const code = (c.json as { code?: number } | null)?.code
      return { label, ok: false, note: code === 10003 || c.status === 404 ? 'No channel has that ID. Check it.' : 'The bot cannot see it. It is hidden from the bot\'s role: add the bot\'s role to the channel with View Channel, or give the role Administrator.' }
    }
    if (c.json.guild_id && c.json.guild_id !== cfg.guildId) return { label, ok: false, note: 'That channel is in a different server.' }
    const p = effective(base, c.json, cfg.guildId, botId, botRoleIds)
    const missing: string[] = []
    if (!(p & VIEW)) missing.push('View Channel')
    if (category) {
      if (!(p & MANAGE_CHANNELS)) missing.push('Manage Channels')
    } else {
      if (!(p & SEND)) missing.push('Send Messages')
      if (!(p & EMBED)) missing.push('Embed Links')
    }
    return missing.length ? { label, ok: false, note: `The bot's role is missing ${missing.join(' and ')} here. Allow ${missing.length > 1 ? 'them' : 'it'} for the bot's role on this ${category ? 'category' : 'channel'}.` } : { label, ok: true, note: category ? 'Can see it and manage channels in it.' : 'Can see it and post in it.' }
  }
  lines.push(...(await Promise.all([...channels.map((c) => look(c, false)), ...categories.map((c) => look(c, true))])))

  // roles it hands out
  const wanted: [string, string][] = [['Linked members role', cfg.roles.linked], ['Founding members role', cfg.roles.founding], ['Clippers role', cfg.roles.clipper], ['Brands role', cfg.roles.brand], ['Creators role', cfg.roles.creator], ['Developers role', cfg.roles.developer], ['Admins role', cfg.roles.admin], ['Team role', cfg.roles.team], ['Staff role', cfg.roles.staff], ...cfg.roles.tiers.map((t, n) => [`Earnings role ${n + 1}`, t.role] as [string, string])].filter(([, id]) => id) as [string, string][]
  if (wanted.length) {
    if (!isAdmin && !(base & MANAGE_ROLES)) lines.push({ label: 'Manage Roles', ok: false, note: 'The bot\'s role does not have Manage Roles, so it cannot hand out roles.' })
    for (const [label, id] of wanted) {
      const r = roles.find((x) => x.id === id)
      if (!r) lines.push({ label, ok: false, note: 'No role in your server has that ID. Check it.' })
      else if (label === 'Staff role') lines.push({ label, ok: true, note: `${r.name}: only read by the bot, never handed out.` })
      else if (r.managed) lines.push({ label, ok: false, note: `${r.name} belongs to another bot or integration, so the bot cannot hand it out.` })
      else if (r.position >= topPos && !isAdmin) lines.push({ label, ok: false, note: `${r.name} sits above the bot's role. Drag the bot's role above it in Server Settings, Roles.` })
      else lines.push({ label, ok: true, note: `${r.name}: the bot can hand it out.` })
    }
  }
  return lines
}
