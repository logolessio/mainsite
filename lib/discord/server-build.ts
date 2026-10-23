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
type Group = { name: string; staffOnly?: boolean; /** only people with the Founding member role (and the staff) can see it */ foundingOnly?: boolean; channels: Spec[] }

const VIEW = 1024
const SEND = 2048
const HISTORY = 65536
const EMBED = 16384

export const COMMUNITY_GROUPS = (cfg: DiscordConfig): Group[] => [
  {
    name: 'Community',
    foundingOnly: true,
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

type Overwrite = { id: string; type: number; allow: string; deny: string }
const staffOverwrites = (cfg: DiscordConfig, bot: Overwrite, staffRoles: string[]): Overwrite[] => [
  { id: cfg.guildId, type: 0, allow: '0', deny: String(VIEW) },
  bot,
  ...staffRoles.map((id) => ({ id, type: 0, allow: String(VIEW + SEND + HISTORY), deny: '0' })),
]
/**
 * Everyone is shut out; the Founding member role (and the staff) can see the place. Sending, reacting, joining a voice channel and the rest still come from the @everyone
 * role's own permissions. Only permissions the bot has itself are put in an overwrite (Discord refuses the others), which is why this is just View channel.
 */
const foundingOverwrites = (cfg: DiscordConfig, bot: Overwrite, staffRoles: string[]): Overwrite[] => [
  { id: cfg.guildId, type: 0, allow: '0', deny: String(VIEW) },
  bot,
  { id: cfg.roles.founding, type: 0, allow: String(VIEW), deny: '0' },
  ...staffRoles.map((id) => ({ id, type: 0, allow: String(VIEW + SEND + HISTORY), deny: '0' })),
]

/**
 * Shuts the Community category and every channel inside it to everyone but the Founding member role and the staff: this is what the pre-launch sign-up
 * hands out. It replaces the permission overwrites on those channels (one call each), so anything set by hand on them is overwritten; nothing is renamed, moved or deleted.
 */
export async function lockCommunity(cfg: DiscordConfig): Promise<{ locked: string[]; note?: string }> {
  if (!cfg.roles.founding) throw new Error('Make the Founding member role first (the "Make the missing roles" button), then lock the community.')
  const list = await discord<Chan[]>('GET', `/guilds/${cfg.guildId}/channels`)
  if (!list.ok || !list.json) throw new Error(explainDiscord(list, 'the server'))
  const category = list.json.find((c) => c.type === 4 && c.name.toLowerCase() === 'community')
  if (!category) return { locked: [], note: 'There is no Community category yet. Make the community channels first.' }
  const me = await discord<{ id: string }>('GET', '/users/@me')
  if (!me.ok || !me.json) throw new Error(explainDiscord(me))
  const bot = { id: me.json.id, type: 1, allow: String(VIEW + SEND + EMBED + HISTORY + 16), deny: '0' }
  const staffRoles = [cfg.roles.staff, cfg.roles.team, cfg.roles.admin].filter(Boolean)
  const overwrites = foundingOverwrites(cfg, bot, staffRoles)
  const locked: string[] = []
  for (const c of [category, ...list.json.filter((x) => x.parent_id === category.id)]) {
    const res = await discord<Chan>('PATCH', `/channels/${c.id}`, { permission_overwrites: overwrites })
    if (!res.ok) throw new Error(explainDiscord(res, c.type === 4 ? 'the Community category' : `#${c.name}`))
    locked.push(c.type === 4 ? `${c.name} (category)` : `${c.type === 2 ? '' : '#'}${c.name}`)
    await new Promise((r) => setTimeout(r, 300))
  }
  return { locked }
}

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
    if (g.foundingOnly && !cfg.roles.founding) {
      skipped.push(`${g.name} (make the Founding member role first, so the community is not left open to everyone)`)
      continue
    }
    const hidden = g.staffOnly ? staffOverwrites(cfg, bot, staffRoles) : g.foundingOnly ? foundingOverwrites(cfg, bot, staffRoles) : []
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
      if (g.staffOnly || g.foundingOnly) body.permission_overwrites = hidden // spelled out, so the channel is private from the first moment whatever Discord does about syncing with the category
      const res = await discord<Chan>('POST', `/guilds/${cfg.guildId}/channels`, body)
      if (!res.ok || !res.json?.id) throw new Error(explainDiscord(res, 'the server'))
      list.json.push(res.json)
      made.push(`${type === 2 ? '' : '#'}${c.name}`)
      await new Promise((r) => setTimeout(r, 350)) // Discord limits how fast channels can be made; going gently avoids being told to wait
    }
  }
  return { made, skipped }
}

