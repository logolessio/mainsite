import { discord, explainDiscord } from './api'
import type { DiscordConfig } from './config'

/**
 * The community part of the server, made in one go: the places members actually talk, plus a private team corner. The bot's own channels (get-started, rules,
 * support, news, payouts and so on) are made and tracked by the other buttons; this adds a welcome feed, general chat, introductions, help, ideas, off-topic, the bot's
 * command channel, two voice lounges and the team's private channels.
 *
 * It only ever adds. A channel or category is skipped if the server already has one with that name (names are compared in lower case, and a
 * "clips" or "showcase" channel already in the config counts as the showcase), and nothing that exists is renamed, moved, edited or deleted.
 * The owner presses the button; nothing calls this by itself. Costs nothing in permissions beyond Manage Channels, which the bot already has.
 *
 * Who sees what: a new member (Unverified) sees only #get-started. Everything else is for the Verified role (and the staff): the community is made that way, and
 * `lockServer` brings the channels that already existed in line without touching anything else about them.
 */
type Overwrite = { id: string; type: number; allow: string; deny: string }
type Chan = { id: string; name: string; type: number; parent_id?: string | null; position?: number; permission_overwrites?: Overwrite[] }
type Spec = { name: string; type?: 0 | 2; topic?: string; slowmode?: number; skipIf?: boolean; /** members can read it, only the bot and the staff can write in it */ readOnly?: boolean }
type Group = { name: string; staffOnly?: boolean; /** only Verified members (and the staff) can see it */ membersOnly?: boolean; channels: Spec[] }

const VIEW = 1024
const SEND = 2048
const HISTORY = 65536
const EMBED = 16384

export const COMMUNITY_GROUPS = (cfg: DiscordConfig): Group[] => [
  {
    name: 'Community',
    membersOnly: true,
    channels: [
      { name: 'welcome', topic: 'Everyone who joins is welcomed here.', readOnly: true },
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

/** The role that opens the server: Verified, or (before that role was made) Founding member. */
const memberRole = (cfg: DiscordConfig) => cfg.roles.verified || cfg.roles.founding
const staffRolesOf = (cfg: DiscordConfig) => [cfg.roles.staff, cfg.roles.team, cfg.roles.admin].filter(Boolean)

const staffOverwrites = (cfg: DiscordConfig, bot: Overwrite, staffRoles: string[]): Overwrite[] => [
  { id: cfg.guildId, type: 0, allow: '0', deny: String(VIEW) },
  bot,
  ...staffRoles.map((id) => ({ id, type: 0, allow: String(VIEW + SEND + HISTORY), deny: '0' })),
]
/**
 * Everyone is shut out; Verified members (and the staff) can see the place. Sending, reacting, joining a voice channel and the rest still come from the @everyone
 * role's own permissions. Only permissions the bot has itself are put in an overwrite (Discord refuses the others), which is why this is just View channel.
 */
const memberOverwrites = (cfg: DiscordConfig, bot: Overwrite, staffRoles: string[], readOnly = false): Overwrite[] => [
  { id: cfg.guildId, type: 0, allow: '0', deny: String(VIEW + (readOnly ? SEND : 0)) },
  bot,
  { id: memberRole(cfg), type: 0, allow: String(VIEW), deny: '0' },
  ...staffRoles.map((id) => ({ id, type: 0, allow: String(VIEW + SEND + HISTORY), deny: '0' })),
]

async function botOverwrite(): Promise<Overwrite> {
  const me = await discord<{ id: string }>('GET', '/users/@me')
  if (!me.ok || !me.json) throw new Error(explainDiscord(me))
  return { id: me.json.id, type: 1, allow: String(VIEW + SEND + EMBED + HISTORY + 16), deny: '0' }
}

/**
 * Shuts the Community category and every channel inside it to everyone but Verified members and the staff. It replaces the permission overwrites on those
 * channels (one call each), so anything set by hand on them is overwritten; nothing is renamed, moved or deleted.
 */
export async function lockCommunity(cfg: DiscordConfig): Promise<{ locked: string[]; note?: string }> {
  if (!memberRole(cfg)) throw new Error('Make the Verified role first (the "Make the missing roles" button), then lock the community.')
  const list = await discord<Chan[]>('GET', `/guilds/${cfg.guildId}/channels`)
  if (!list.ok || !list.json) throw new Error(explainDiscord(list, 'the server'))
  const category = list.json.find((c) => c.type === 4 && c.name.toLowerCase() === 'community')
  if (!category) return { locked: [], note: 'There is no Community category yet. Make the community channels first.' }
  const bot = await botOverwrite()
  const staffRoles = staffRolesOf(cfg)
  const locked: string[] = []
  for (const c of [category, ...list.json.filter((x) => x.parent_id === category.id)]) {
    const res = await discord<Chan>('PATCH', `/channels/${c.id}`, { permission_overwrites: memberOverwrites(cfg, bot, staffRoles, c.name === 'welcome') })
    if (!res.ok) throw new Error(explainDiscord(res, c.type === 4 ? 'the Community category' : `#${c.name}`))
    locked.push(c.type === 4 ? `${c.name} (category)` : `${c.type === 2 ? '' : '#'}${c.name}`)
    await new Promise((r) => setTimeout(r, 300))
  }
  return { locked }
}

// ---- the whole server: only #get-started is open to a new member ----
const big = (v: string) => BigInt(v || '0')
/** Adds `allow` and `deny` bits to one overwrite in a list (making it if it is not there), keeping every other bit as it was. */
function setBits(list: Overwrite[], id: string, type: number, allow: number, deny: number): Overwrite[] {
  const cur = list.find((o) => o.id === id)
  const a = (big(cur?.allow ?? '0') | BigInt(allow)) & ~BigInt(deny)
  const d = (big(cur?.deny ?? '0') | BigInt(deny)) & ~BigInt(allow)
  const next = { id, type, allow: a.toString(), deny: d.toString() }
  return cur ? list.map((o) => (o.id === id ? next : o)) : [...list, next]
}
const sameList = (x: Overwrite[], y: Overwrite[]) => x.length === y.length && x.every((o) => y.find((p) => p.id === o.id && p.allow === o.allow && p.deny === o.deny))

const PER_CALL = 36 // a request can only make so many calls; the dashboard button presses again until nothing is left

/**
 * Makes the server what the sign-up flow expects: a new member (Unverified, or just joined) sees only #get-started, and the Verified role (and the staff) see the rest.
 * For every channel and category it adds "Verified can view" and "everyone cannot", and leaves every other permission on it exactly as it was (a read-only channel
 * stays read-only). A channel that is already hidden from everyone (the team's private ones) is left alone, except the community, which only had the founding role
 * on its list and gets Verified too. #get-started stays open to everyone to read, and no one can write in it. Safe to press again: only what is not done yet is changed.
 */
export async function lockServer(cfg: DiscordConfig): Promise<{ changed: string[]; remaining: number; note?: string }> {
  const verified = cfg.roles.verified
  if (!verified) throw new Error('Make the Verified role first (the "Make the missing roles" button).')
  if (!cfg.channels.getStarted) throw new Error('Save the #get-started channel first: it is the one place a new member can see.')
  const list = await discord<Chan[]>('GET', `/guilds/${cfg.guildId}/channels`)
  if (!list.ok || !Array.isArray(list.json)) throw new Error(explainDiscord(list, 'the server'))
  const bot = await botOverwrite()
  const staffRoles = staffRolesOf(cfg)
  const start = list.json.find((c) => c.id === cfg.channels.getStarted)
  if (!start) throw new Error('The #get-started channel in the settings is not in this server.')
  const todo: { chan: Chan; next: Overwrite[] }[] = []
  for (const c of list.json) {
    const cur = c.permission_overwrites ?? []
    let next = cur
    if (c.id === start.id) {
      next = setBits(cur, cfg.guildId, 0, VIEW + HISTORY, SEND) // everyone can read it; nobody can write in it
    } else if (c.id === start.parent_id) {
      continue // the category #get-started sits in keeps showing it
    } else {
      const everyone = cur.find((o) => o.id === cfg.guildId)
      const hidden = Boolean(everyone && (big(everyone.deny) & BigInt(VIEW)) !== BigInt(0))
      const foundingOnly = hidden && cfg.roles.founding && cur.some((o) => o.id === cfg.roles.founding && (big(o.allow) & BigInt(VIEW)) !== BigInt(0))
      if (hidden && !foundingOnly) continue // private already (the team's channels)
      next = setBits(cur, cfg.guildId, 0, 0, VIEW)
      next = setBits(next, verified, 0, VIEW, 0)
      for (const r of staffRoles) next = setBits(next, r, 0, VIEW, 0)
      next = setBits(next, bot.id, 1, VIEW, 0)
    }
    if (!sameList(cur, next)) todo.push({ chan: c, next })
  }
  const changed: string[] = []
  for (const t of todo.slice(0, PER_CALL)) {
    const res = await discord<Chan>('PATCH', `/channels/${t.chan.id}`, { permission_overwrites: t.next })
    if (!res.ok) throw new Error(explainDiscord(res, t.chan.type === 4 ? `the ${t.chan.name} category` : `#${t.chan.name}`))
    changed.push(t.chan.type === 4 ? `${t.chan.name} (category)` : `${t.chan.type === 2 ? '' : '#'}${t.chan.name}`)
    await new Promise((r) => setTimeout(r, 250))
  }
  return { changed, remaining: Math.max(0, todo.length - changed.length) }
}

export async function buildCommunity(cfg: DiscordConfig): Promise<{ made: string[]; skipped: string[] }> {
  const made: string[] = []
  const skipped: string[] = []
  const list = await discord<Chan[]>('GET', `/guilds/${cfg.guildId}/channels`)
  if (!list.ok || !list.json) throw new Error(explainDiscord(list, 'the server'))
  const have = (name: string, type: number) => list.json!.find((c) => c.type === type && c.name.toLowerCase() === name.toLowerCase())

  const bot = await botOverwrite()
  const staffRoles = staffRolesOf(cfg)

  for (const g of COMMUNITY_GROUPS(cfg)) {
    if (g.staffOnly && !staffRoles.length) {
      skipped.push(`${g.name} (set the staff or team role first, so the private channels are not left open)`)
      continue
    }
    if (g.membersOnly && !memberRole(cfg)) {
      skipped.push(`${g.name} (make the Verified role first, so the community is not left open to everyone)`)
      continue
    }
    const hidden = g.staffOnly ? staffOverwrites(cfg, bot, staffRoles) : g.membersOnly ? memberOverwrites(cfg, bot, staffRoles) : []
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
      if (g.staffOnly || g.membersOnly) body.permission_overwrites = g.membersOnly && c.readOnly ? memberOverwrites(cfg, bot, staffRoles, true) : hidden // spelled out, so the channel is private from the first moment whatever Discord does about syncing with the category
      const res = await discord<Chan>('POST', `/guilds/${cfg.guildId}/channels`, body)
      if (!res.ok || !res.json?.id) throw new Error(explainDiscord(res, 'the server'))
      list.json.push(res.json)
      made.push(`${type === 2 ? '' : '#'}${c.name}`)
      await new Promise((r) => setTimeout(r, 350)) // Discord limits how fast channels can be made; going gently avoids being told to wait
    }
  }
  return { made, skipped }
}

/** A read-only look at the server: every category and channel (with the permission overwrites in short) and every role, for the owner's dashboard and for planning. */
export async function serverMap(cfg: DiscordConfig) {
  const [ch, ro] = await Promise.all([discord<Chan[]>('GET', `/guilds/${cfg.guildId}/channels`), discord<{ id: string; name: string; position: number; managed?: boolean; color: number; hoist: boolean; permissions: string }[]>('GET', `/guilds/${cfg.guildId}/roles`)])
  if (!ch.ok || !Array.isArray(ch.json)) throw new Error(explainDiscord(ch, 'the server'))
  const roles = Array.isArray(ro.json) ? ro.json : []
  const roleName = (id: string) => (id === cfg.guildId ? '@everyone' : roles.find((r) => r.id === id)?.name ?? id)
  const kind: Record<number, string> = { 0: 'text', 2: 'voice', 4: 'category', 5: 'announcement', 13: 'stage', 15: 'forum' }
  return {
    channels: ch.json
      .slice()
      .sort((a, b) => a.type === 4 && b.type !== 4 ? -1 : 0)
      .map((c) => ({ id: c.id, name: c.name, position: c.position ?? 0, kind: kind[c.type] ?? String(c.type), parent: c.parent_id ? ch.json!.find((x) => x.id === c.parent_id)?.name ?? c.parent_id : null, overwrites: (c.permission_overwrites ?? []).map((o) => `${roleName(o.id)}: ${(big(o.allow) & BigInt(VIEW)) !== BigInt(0) ? '+view ' : ''}${(big(o.deny) & BigInt(VIEW)) !== BigInt(0) ? '-view ' : ''}${(big(o.deny) & BigInt(SEND)) !== BigInt(0) ? '-send' : ''}`.trim()) })),
    roles: roles.sort((a, b) => b.position - a.position).map((r) => ({ id: r.id, name: r.name, position: r.position, managed: Boolean(r.managed), hoist: r.hoist, color: r.color })),
  }
}
