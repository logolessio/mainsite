import { discord, explainDiscord } from './api'
import type { DiscordConfig } from './config'

/**
 * The community part of the server, made in one go: the places members actually talk, plus a private team corner. The bot's own channels (get-started, rules,
 * support, news, payouts and so on) are made and tracked by the other buttons; this adds general chat, introductions, help, ideas, off-topic, the bot's
 * command channel, two voice lounges and the team's private channels.
 *
 * It only ever adds. A channel or category is skipped if the server already has one with that name (names are compared in lower case, and a
 * "clips" or "showcase" channel already in the config counts as the showcase), and nothing that exists is renamed, moved, edited or deleted.
 * The owner presses the button; nothing calls this by itself. Costs nothing in permissions beyond Manage Channels, which the bot already has.
 */
type Chan = { id: string; name: string; type: number; parent_id?: string | null }
type Spec = { name: string; type?: 0 | 2; topic?: string; slowmode?: number; skipIf?: boolean }
type Group = { name: string; staffOnly?: boolean; channels: Spec[] }

const VIEW = 1024
const SEND = 2048
const CONNECT = 1 << 20
const HISTORY = 65536
const EMBED = 16384

export const COMMUNITY_GROUPS = (cfg: DiscordConfig): Group[] => [
  {
    name: 'Community',
    channels: [
      { name: 'general', topic: 'Talk about anything logoless: campaigns, edits, ideas.', slowmode: 3 },
      { name: 'introductions', topic: 'Say hi. Who you are, what you post and where.', slowmode: 30 },
      { name: 'clip-showcase', topic: 'Show your best posts and edits. One link per message.', slowmode: 20, skipIf: Boolean(cfg.channels.clips) },
      { name: 'edit-help', topic: 'Questions about editing, formats, tools and getting more views.' },
      { name: 'ideas-and-feedback', topic: 'Tell us what to build next, or what is not working.', slowmode: 10 },
      { name: 'off-topic', topic: 'Everything else.' },
      { name: 'bot-commands', topic: 'Use /campaigns, /stats, /balance, /leaderboard and the rest here.' },
      { name: 'Lounge', type: 2 },
      { name: 'Edit together', type: 2 },
    ],
  },
  {
    name: 'Team',
    staffOnly: true,
    channels: [
      { name: 'team-chat', topic: 'Private. The logoless team only.' },
      { name: 'mod-queue', topic: 'Reports and anything that needs a second pair of eyes.' },
    ],
  },
]

export async function buildCommunity(cfg: DiscordConfig): Promise<{ made: string[]; skipped: string[] }> {
  const made: string[] = []
  const skipped: string[] = []
  const list = await discord<Chan[]>('GET', `/guilds/${cfg.guildId}/channels`)
  if (!list.ok || !list.json) throw new Error(explainDiscord(list, 'the server'))
  const have = (name: string, type: number) => list.json!.find((c) => c.type === type && c.name.toLowerCase() === name.toLowerCase())

  const me = await discord<{ id: string }>('GET', '/users/@me')
  if (!me.ok || !me.json) throw new Error(explainDiscord(me))
  const bot = { id: me.json.id, type: 1, allow: String(VIEW + SEND + EMBED + HISTORY + 16), deny: '0' }
  const staffRoles = [cfg.roles.staff, cfg.roles.team, cfg.roles.admin].filter(Boolean)

  for (const g of COMMUNITY_GROUPS(cfg)) {
    if (g.staffOnly && !staffRoles.length) {
      skipped.push(`${g.name} (set the staff or team role first, so the private channels are not left open)`)
      continue
    }
    const hidden = g.staffOnly ? [{ id: cfg.guildId, type: 0, allow: '0', deny: String(VIEW) }, bot, ...staffRoles.map((id) => ({ id, type: 0, allow: String(VIEW + SEND + HISTORY + CONNECT), deny: '0' }))] : []
    let parent = have(g.name, 4)?.id
    if (!parent) {
      const res = await discord<Chan>('POST', `/guilds/${cfg.guildId}/channels`, { name: g.name, type: 4, permission_overwrites: hidden })
      if (!res.ok || !res.json?.id) throw new Error(explainDiscord(res, 'the server'))
      parent = res.json.id
      list.json.push(res.json)
      made.push(`${g.name} (category)`)
    }
    for (const c of g.channels) {
      const type = c.type ?? 0
      if (c.skipIf || have(c.name, type)) {
        skipped.push(`${type === 2 ? '' : '#'}${c.name} (already there)`)
        continue
      }
      const body: Record<string, unknown> = { name: c.name, type, parent_id: parent }
      if (c.topic) body.topic = c.topic
      if (c.slowmode) body.rate_limit_per_user = c.slowmode
      if (g.staffOnly) body.permission_overwrites = hidden // spelled out, so the channel is private from the first moment whatever Discord does about syncing with the category
      const res = await discord<Chan>('POST', `/guilds/${cfg.guildId}/channels`, body)
      if (!res.ok || !res.json?.id) throw new Error(explainDiscord(res, 'the server'))
      list.json.push(res.json)
      made.push(`${type === 2 ? '' : '#'}${c.name}`)
      await new Promise((r) => setTimeout(r, 350)) // Discord limits how fast channels can be made; going gently avoids being told to wait
    }
  }
  return { made, skipped }
}

