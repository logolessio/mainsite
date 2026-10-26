import { discord, explainDiscord } from './api'
import type { DiscordConfig } from './config'

/**
 * Fits the whole server to one plan: every role named "L | …", every channel named "・…", the channels grouped in the right categories, and who can see and write
 * where. It is built to be pressed again and again: every step first looks at what the server is now and only does what is not done yet, so nothing is made twice
 * and nothing is changed back. A press makes at most `BUDGET` calls to Discord (one request can only make so many) and says how many steps are left; the dashboard
 * button presses until none are.
 *
 * What it will and will not touch:
 *  - Roles that start "L™ | " are renamed "L | ", and the roles the bot made (Admin, Developer, Artist, Founding member, Verified, Unverified) get the same prefix.
 *  - It adopts the channels and categories the server already has, by name (the saved channel first), and renames them with "・". Anything it does not know is left alone.
 *  - It makes what is missing, and removes only an older copy the bot itself made (no "・" in the name) that has never had a message in it, and the empty category left behind.
 *  - For permissions it adds what the plan says (Verified and the team can see, a read-only channel cannot be written in) and keeps every other bit. It only hides a
 *    channel from everyone, and opens #get-started to everyone, when `lock` is on: that is the step that shuts the server to new members, so it is the owner's to press.
 */
type Overwrite = { id: string; type: number; allow: string; deny: string }
type Chan = { id: string; name: string; type: number; parent_id?: string | null; position?: number; topic?: string | null; permission_overwrites?: Overwrite[] }
type Role = { id: string; name: string; color: number; hoist: boolean; managed?: boolean; position: number }
type Access = 'start' | 'members' | 'staff'
type Key = keyof DiscordConfig['channels']
type Want = {
  name: string
  type?: 0 | 2 | 15
  key?: Key
  /** other names it may already have (the saved channel, then the name, then these) */
  match?: string[]
  /** older copies the bot made that are removed when empty */
  retire?: string[]
  access?: Access
  readOnly?: boolean
  topic?: string
  slowmode?: number
  /** a forum is never made, only adopted */
  adoptOnly?: boolean
}
type Cat = { name: string; match: string[]; access: Access; channels: Want[] }

const VIEW = 1024
const SEND = 2048
const HISTORY = 65536
const CH = '・'
const BUDGET = 26

/** The plan. Names are written without the "・". */
const PLAN: Cat[] = [
  { name: 'Welcome', match: ['welcome'], access: 'start', channels: [{ name: 'get-started', key: 'getStarted', topic: 'Sign up to unlock the server.' }] },
  {
    name: 'Info',
    match: ['info'],
    access: 'members',
    channels: [
      { name: 'rules', key: 'rules', readOnly: true, topic: 'The rules of the server.' },
      { name: 'roles', key: 'roleGuide', readOnly: true, topic: 'What each role means and how you get it.' },
      { name: 'how-it-works', key: 'howItWorks', readOnly: true, topic: 'How logoless works, from sign-up to payout.' },
      { name: 'site', key: 'site', readOnly: true, topic: 'logoless in a few numbers.' },
      { name: 'status', key: 'status', readOnly: true, topic: 'Is everything working? Updated by itself.' },
    ],
  },
  {
    name: 'Landing',
    match: ['landing'],
    access: 'members',
    channels: [
      { name: 'news', key: 'news', readOnly: true, topic: 'Announcements from the team.' },
      { name: 'updates', key: 'updates', readOnly: true, topic: 'What is new on logoless.' },
      { name: 'campaigns', key: 'newCampaigns', match: ['new-campaigns'], readOnly: true, topic: 'Every new campaign is announced here.' },
      { name: 'system', key: 'system', access: 'staff', topic: 'Welcome notes and what is happening on the site (team).' },
    ],
  },
  {
    name: 'Metro',
    match: ['metro', 'community'],
    access: 'members',
    channels: [
      { name: 'welcome', readOnly: true, topic: 'Everyone who joins is welcomed here.' },
      { name: 'chat', match: ['general'], topic: 'Talk about anything logoless: campaigns, edits, ideas.', slowmode: 3 },
      { name: 'introductions', topic: 'Say hi. Who you are, what you post and where.', slowmode: 30 },
      { name: 'edit-help', topic: 'Questions about editing, formats, tools and getting more views.' },
      { name: 'off-topic', topic: 'Everything else.' },
      { name: 'bot-commands', topic: 'Use /campaigns, /stats, /balance, /leaderboard and the rest here.' },
      { name: 'payouts', key: 'payouts', readOnly: true, topic: 'Every earning, as it happens.' },
      { name: 'submissions', key: 'submissions', readOnly: true, topic: 'Every submission, with its video and numbers.' },
      { name: 'suggestions', type: 15, adoptOnly: true, retire: ['ideas-and-feedback'] },
      { name: 'help', type: 15, adoptOnly: true },
      { name: 'Lounge', type: 2 },
      { name: 'Edit together', type: 2 },
    ],
  },
  { name: 'Help', match: ['help'], access: 'members', channels: [{ name: 'support', key: 'support', readOnly: true, topic: 'Read an answer or open a ticket.' }] },
  {
    name: 'Staff',
    match: ['staff', 'team'],
    access: 'staff',
    channels: [
      { name: 'moderator', match: ['mod-queue'], topic: 'Reports and anything that needs a second pair of eyes.' },
      { name: 'logs', key: 'logs', topic: 'Tickets, reports and what the team does.' },
      { name: 'team-chat', topic: 'Private. The logoless team only.' },
    ],
  },
]
/** The categories the bot made before and the plan replaces; each goes when nothing is left in it. */
const OLD_CATEGORIES = ['community', 'team']

/** The roles the bot made, by config key, and what they are called now. */
const ROLE_PLAN: { key: 'admin' | 'developer' | 'creator' | 'founding' | 'verified' | 'unverified'; name: string; color?: number }[] = [
  { key: 'admin', name: 'L | Site Admin', color: 0xff1f38 },
  { key: 'developer', name: 'L | Developer', color: 0x4678ff },
  { key: 'creator', name: 'L | Artist', color: 0x9650ff },
  { key: 'founding', name: 'L | Founding Member', color: 0xffc857 },
  { key: 'verified', name: 'L | Verified', color: 0x4ba9dc },
  { key: 'unverified', name: 'L | Unverified' },
]
const TIERS = [
  { minUsd: 100, name: 'L | $100 Earner', color: 0x2ed0b0 },
  { minUsd: 1000, name: 'L | $1K Earner', color: 0xffc857 },
  { minUsd: 10000, name: 'L | $10K Earner', color: 0xff2d96 },
]

const norm = (name: string) => name.toLowerCase().replace(/^[^a-z0-9]+/, '').replace(/[\s_]+/g, '-').trim()
const hasMark = (name: string) => name.startsWith(CH)
/** What a new channel is called: text channels are lower case with dashes, a voice channel keeps its capitals and spaces. */
const finalName = (w: Want) => `${CH}${(w.type ?? 0) === 2 ? w.name : w.name.toLowerCase().replace(/\s+/g, '-')}`

const big = (v: string) => BigInt(v || '0')
function setBits(list: Overwrite[], id: string, type: number, allow: number, deny: number): Overwrite[] {
  const cur = list.find((o) => o.id === id)
  const a = (big(cur?.allow ?? '0') | BigInt(allow)) & ~BigInt(deny)
  const d = (big(cur?.deny ?? '0') | BigInt(deny)) & ~BigInt(allow)
  const next = { id, type, allow: a.toString(), deny: d.toString() }
  return cur ? list.map((o) => (o.id === id ? next : o)) : [...list, next]
}
/** Takes bits out of both sides of an overwrite (it no longer says anything about them). */
function clearBits(list: Overwrite[], id: string, bits: number): Overwrite[] {
  const cur = list.find((o) => o.id === id)
  if (!cur) return list
  const next = { ...cur, allow: (big(cur.allow) & ~BigInt(bits)).toString(), deny: (big(cur.deny) & ~BigInt(bits)).toString() }
  return next.allow === '0' && next.deny === '0' ? list.filter((o) => o.id !== id) : list.map((o) => (o.id === id ? next : o))
}
const same = (x: Overwrite[], y: Overwrite[]) => x.length === y.length && x.every((o) => y.find((p) => p.id === o.id && p.allow === o.allow && p.deny === o.deny))

export type FitResult = { done: string[]; failed: string[]; remaining: number; notes: string[]; cfg: DiscordConfig }

type Op = { label: string; run: () => Promise<void> }

async function call<T>(method: string, path: string, body?: unknown) {
  let r = await discord<T>(method, path, body)
  if (r.status === 429) {
    // Discord asked us to wait: once, then try again
    const wait = Math.min(6, Number((r.json as { retry_after?: number } | null)?.retry_after ?? 2))
    await new Promise((res) => setTimeout(res, wait * 1000 + 100))
    r = await discord<T>(method, path, body)
  }
  return r
}

/**
 * One press. `skip` is how many steps earlier presses tried and could not do (they stay first in the list, so the next press starts after them).
 * `lock` also hides everything from people without the Verified role and opens #get-started to everyone.
 */
export async function fitServer(input: DiscordConfig, opts: { skip?: number; lock?: boolean } = {}): Promise<FitResult> {
  const cfg = structuredClone(input)
  const guild = cfg.guildId
  const lock = Boolean(opts.lock)
  const notes: string[] = []
  const [chRes, roleRes] = await Promise.all([discord<Chan[]>('GET', `/guilds/${guild}/channels`), discord<Role[]>('GET', `/guilds/${guild}/roles`)])
  if (!chRes.ok || !Array.isArray(chRes.json)) throw new Error(explainDiscord(chRes, 'the server'))
  if (!roleRes.ok || !Array.isArray(roleRes.json)) throw new Error(explainDiscord(roleRes, 'the server'))
  const chans = chRes.json
  const roles = roleRes.json
  const ops: Op[] = []

  // ---------------- roles ----------------
  const renameRole = (r: Role, name: string, color?: number) => {
    const body: Record<string, unknown> = {}
    if (r.name !== name) body.name = name
    if (color !== undefined && r.color === 0) body.color = color
    if (!Object.keys(body).length) return
    ops.push({
      label: `role ${r.name} -> ${name}`,
      run: async () => {
        const res = await call('PATCH', `/guilds/${guild}/roles/${r.id}`, body)
        if (!res.ok) throw new Error(explainDiscord(res, `the role ${r.name}`))
      },
    })
  }
  const planned = new Set<string>()
  for (const p of ROLE_PLAN) {
    const id = cfg.roles[p.key]
    const r = id ? roles.find((x) => x.id === id) : undefined
    if (r) {
      planned.add(r.id)
      renameRole(r, p.name, p.color)
    } else notes.push(`${p.name} is not made yet: press "Make the missing roles".`)
  }
  for (const r of roles) {
    if (r.managed || planned.has(r.id) || r.name === '@everyone') continue
    if (/^L™\s*\|\s*/.test(r.name)) renameRole(r, r.name.replace(/^L™\s*\|\s*/, 'L | '))
  }
  if (cfg.roles.tiers.length === 0) {
    for (const t of TIERS) {
      const existing = roles.find((r) => r.name === t.name)
      if (existing) {
        cfg.roles.tiers.push({ minUsd: t.minUsd, role: existing.id })
        continue
      }
      ops.push({
        label: `make role ${t.name}`,
        run: async () => {
          const res = await call<{ id: string }>('POST', `/guilds/${guild}/roles`, { name: t.name, permissions: '0', hoist: false, mentionable: false, color: t.color })
          if (!res.ok || !res.json?.id) throw new Error(explainDiscord(res, 'the server'))
          cfg.roles.tiers.push({ minUsd: t.minUsd, role: res.json.id })
          cfg.roles.tiers.sort((a, b) => a.minUsd - b.minUsd)
        },
      })
    }
  }

  // ---------------- who can see what ----------------
  // (the bot has Administrator, so it needs no overwrite of its own)
  const staffRoles = [cfg.roles.staff, cfg.roles.team, cfg.roles.admin].filter(Boolean)
  const verified = cfg.roles.verified
  /** `everyone`: this place is new, or the owner has locked the server, so what @everyone may see is set too. */
  const withAccess = (cur: Overwrite[], access: Access, readOnly: boolean, everyone: boolean) => {
    let o = cur
    if (access === 'start') {
      if (everyone) o = setBits(o, guild, 0, VIEW + HISTORY, SEND) // everyone can read it, nobody writes in it
    } else if (access === 'members') {
      const deny = (everyone ? VIEW : 0) + (readOnly ? SEND : 0)
      if (deny) o = setBits(o, guild, 0, 0, deny)
      if (verified) o = setBits(o, verified, 0, VIEW + HISTORY, 0)
      for (const r of staffRoles) o = setBits(o, r, 0, VIEW + SEND + HISTORY, 0)
    } else {
      if (everyone) o = setBits(o, guild, 0, 0, VIEW)
      for (const r of staffRoles) o = setBits(o, r, 0, VIEW + SEND + HISTORY, 0)
      if (verified) o = clearBits(o, verified, VIEW) // a team channel is never opened to Verified by accident
    }
    return o
  }

  // ---------------- categories ----------------
  const cats = chans.filter((c) => c.type === 4)
  const catFor = new Map<string, Chan>() // plan name -> the category that is it
  for (const cat of PLAN) {
    const found = cat.match.map((m) => cats.find((c) => norm(c.name) === m)).find(Boolean)
    if (found) catFor.set(cat.name, found)
  }
  const catIds = new Map<string, string>() // plan name -> id (filled as categories are made)
  for (const [k, c] of catFor) catIds.set(k, c.id)
  for (const cat of PLAN) {
    const have = catFor.get(cat.name)
    if (!have) {
      ops.push({
        label: `make category ${cat.name}`,
        run: async () => {
          const res = await call<Chan>('POST', `/guilds/${guild}/channels`, { name: cat.name, type: 4, permission_overwrites: withAccess([], cat.access, false, true) })
          if (!res.ok || !res.json?.id) throw new Error(explainDiscord(res, 'the server'))
          catIds.set(cat.name, res.json.id)
        },
      })
    } else {
      const want = withAccess(have.permission_overwrites ?? [], cat.access, false, lock)
      if (!same(have.permission_overwrites ?? [], want)) {
        ops.push({
          label: `category ${have.name} permissions`,
          run: async () => {
            const res = await call('PATCH', `/channels/${have.id}`, { permission_overwrites: want })
            if (!res.ok) throw new Error(explainDiscord(res, `the ${have.name} category`))
          },
        })
      }
    }
  }

  // ---------------- channels ----------------
  const adopted = new Set<string>()
  const older: Chan[] = [] // copies the bot made before, to remove when empty
  for (const cat of PLAN) {
    for (const w of cat.channels) {
      const type = w.type ?? 0
      const names = [norm(w.name), ...(w.match ?? [])].filter((x, i, a) => a.indexOf(x) === i)
      const fits = (c: Chan) => c.type === type || (type === 0 && c.type === 5)
      const candidates = chans.filter((c) => fits(c) && !adopted.has(c.id))
      let found = w.key && cfg.channels[w.key] ? candidates.find((c) => c.id === cfg.channels[w.key as Key]) : undefined
      if (!found) for (const n of names) if ((found = candidates.find((c) => norm(c.name) === n))) break
      const access = w.access ?? cat.access
      const readOnly = Boolean(w.readOnly)
      if (found) {
        const keep = found
        adopted.add(keep.id)
        for (const c of candidates) if (c.id !== keep.id && !hasMark(c.name) && names.includes(norm(c.name))) older.push(c)
        for (const n of w.retire ?? []) for (const c of chans) if (!hasMark(c.name) && c.type === 0 && norm(c.name) === n) older.push(c)
        const parent = catIds.get(cat.name)
        const wantOw = withAccess(keep.permission_overwrites ?? [], access, readOnly, lock)
        const body: Record<string, unknown> = {}
        if (!hasMark(keep.name)) body.name = finalName(w)
        if (parent && keep.parent_id !== parent) body.parent_id = parent
        if (!same(keep.permission_overwrites ?? [], wantOw)) body.permission_overwrites = wantOw
        if (!keep.topic && w.topic && (keep.type === 0 || keep.type === 5)) body.topic = w.topic
        if (w.key && !cfg.channels[w.key]) cfg.channels[w.key] = keep.id
        if (Object.keys(body).length) {
          const what = [body.name ? `-> ${body.name}` : '', body.parent_id ? `into ${cat.name}` : '', body.permission_overwrites ? 'who can see it' : '', body.topic ? 'topic' : ''].filter(Boolean).join(', ')
          ops.push({
            label: `${keep.name} (${what})`,
            run: async () => {
              const res = await call('PATCH', `/channels/${keep.id}`, body)
              if (!res.ok) throw new Error(explainDiscord(res, `#${keep.name}`))
            },
          })
        }
      } else if (!w.adoptOnly) {
        ops.push({
          label: `make ${finalName(w)}`,
          run: async () => {
            const parent = catIds.get(cat.name)
            if (!parent) throw new Error(`The ${cat.name} category is not there yet.`)
            const res = await call<Chan>('POST', `/guilds/${guild}/channels`, {
              name: finalName(w),
              type,
              parent_id: parent,
              ...(w.topic && type !== 2 ? { topic: w.topic } : {}),
              ...(w.slowmode ? { rate_limit_per_user: w.slowmode } : {}),
              permission_overwrites: withAccess([], access, readOnly, true),
            })
            if (!res.ok || !res.json?.id) throw new Error(explainDiscord(res, 'the server'))
            if (w.key) cfg.channels[w.key] = res.json.id
          },
        })
      }
    }
  }

  // ---------------- copies the bot made earlier, and the categories they leave empty ----------------
  const removed = new Set<string>()
  for (const c of older) {
    if (adopted.has(c.id) || removed.has(c.id)) continue
    removed.add(c.id)
    ops.push({
      label: `remove the older #${c.name}`,
      run: async () => {
        const msgs = await call<unknown[]>('GET', `/channels/${c.id}/messages?limit=1`)
        if (!msgs.ok || !Array.isArray(msgs.json) || msgs.json.length > 0) throw new Error(`#${c.name} has messages in it, so it was left: move what you want to keep, then delete it`)
        const res = await call('DELETE', `/channels/${c.id}`)
        if (!res.ok) throw new Error(explainDiscord(res, `#${c.name}`))
      },
    })
  }
  const keepCats = new Set([...catFor.values()].map((c) => c.id))
  for (const cat of cats) {
    if (keepCats.has(cat.id) || !OLD_CATEGORIES.includes(norm(cat.name)) || hasMark(cat.name)) continue
    ops.push({
      label: `remove the empty ${cat.name} category`,
      run: async () => {
        const now = await call<Chan[]>('GET', `/guilds/${guild}/channels`)
        if (!now.ok || !Array.isArray(now.json)) throw new Error(explainDiscord(now, 'the server'))
        const left = now.json.filter((c) => c.parent_id === cat.id)
        if (left.length) throw new Error(`the ${cat.name} category still has ${left.map((c) => '#' + c.name).join(', ')} in it, so it was left`)
        const res = await call('DELETE', `/channels/${cat.id}`)
        if (!res.ok) throw new Error(explainDiscord(res, `the ${cat.name} category`))
      },
    })
  }

  // ---------------- the order of the categories ----------------
  const front = PLAN.map((p) => catFor.get(p.name)?.id).filter(Boolean) as string[]
  // (the tickets may be kept in one of the planned categories, as they are in Help: it is placed once, or Discord is asked for two places for it)
  const rest = [cfg.artistsCategory, cfg.inactiveCategory, cfg.ticketCategory].filter((id, i, all) => id && cats.some((c) => c.id === id) && !front.includes(id) && all.indexOf(id) === i) as string[]
  const wanted = [...front, ...rest]
  if (front.length === PLAN.length) {
    const ranked = cats.filter((c) => wanted.includes(c.id)).sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    const tied = ranked.some((c, i) => i > 0 && c.position === ranked[i - 1].position)
    if (tied || JSON.stringify(ranked.map((c) => c.id)) !== JSON.stringify(wanted)) {
      const going = new Set(cats.filter((c) => !keepCats.has(c.id) && OLD_CATEGORIES.includes(norm(c.name)) && !hasMark(c.name)).map((c) => c.id)) // removed by an earlier step
      const others = cats.filter((c) => !wanted.includes(c.id) && !going.has(c.id)).sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).map((c) => c.id)
      const all = [...wanted, ...others]
      ops.push({
        label: `put the categories in order (was ${ranked.map((c) => `${c.name} ${c.position}`).join(', ')})`,
        run: async () => {
          const res = await call('PATCH', `/guilds/${guild}/channels`, all.map((id, position) => ({ id, position })))
          if (!res.ok) throw new Error(explainDiscord(res, 'the server'))
        },
      })
    }
  }

  // ---------------- run ----------------
  const skip = Math.max(0, opts.skip ?? 0)
  const batch = ops.slice(skip, skip + BUDGET)
  const done: string[] = []
  const failed: string[] = []
  for (const op of batch) {
    try {
      await op.run()
      done.push(op.label)
    } catch (e) {
      failed.push(`${op.label}: ${e instanceof Error ? e.message : 'Discord would not do it'}`)
    }
    await new Promise((r) => setTimeout(r, 200))
  }
  return { done, failed, remaining: Math.max(0, ops.length - skip - batch.length), notes, cfg }
}
