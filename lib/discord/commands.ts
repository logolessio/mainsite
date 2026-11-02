import { db, nowSec } from '../db'
import { rolesForEmail } from '../roles'
import type { Message } from './api'
import * as k from './cards'
import * as more from './cards-more'
import { getDiscordConfig } from './config'
import { primeIcons } from './icon-prime'
import { unlinkDiscord, userByDiscord } from './link'
import { postTo } from './outbound'
import { kindWords, syncRoles, wantedRoles } from './roles'
import { go as goBtn, goTarget, tidy } from './ui'

// ---------- Discord's shapes (only the parts we use) ----------
type DUser = { id: string; username: string; global_name?: string | null; avatar?: string | null }
type Option = { name: string; type: number; value?: string | number | boolean; options?: Option[]; focused?: boolean }
export type Interaction = {
  id: string
  application_id: string
  type: number
  token: string
  guild_id?: string
  channel_id?: string
  member?: { user: DUser; roles?: string[]; permissions?: string }
  user?: DUser
  data?: {
    name?: string
    custom_id?: string
    /** what was picked in a drop-down menu */
    values?: string[]
    options?: Option[]
    resolved?: { users?: Record<string, DUser> }
    components?: { components: { custom_id: string; value: string }[] }[]
  }
  message?: { id: string }
}
export type Reply = { type: number; data?: Record<string, unknown> }
export type Env = { appId: string; defer: (work: () => Promise<Message>, ephemeral?: boolean) => Reply }

// ---------- small helpers ----------
const EPHEMERAL = 64
const NO_EMBEDS = 4
export const say = (m: Message | string, ephemeral = true): Reply => {
  const data: Message = tidy(typeof m === 'string' ? { content: m } : m)
  return { type: 4, data: { ...data, allowed_mentions: data.allowed_mentions ?? { parse: [] }, ...(ephemeral ? { flags: (data.flags ?? 0) | EPHEMERAL } : {}) } }
}
const fail = (text: string) => say(k.problem(text))
const ok = (text: string, title?: string) => say(k.done(text, title))

const whoami = (i: Interaction): DUser => (i.member?.user ?? i.user) as DUser
const opt = (i: Interaction, name: string): string | number | boolean | undefined => {
  const walk = (list?: Option[]): Option | undefined => {
    for (const o of list ?? []) {
      if (o.name === name && o.value !== undefined) return o
      const deep = walk(o.options)
      if (deep) return deep
    }
    return undefined
  }
  return walk(i.data?.options)?.value
}
const sub = (i: Interaction) => i.data?.options?.[0]?.name ?? ''

type Me = { id: string; email: string; handle: string; name: string }
async function me(discordId: string): Promise<Me | null> {
  const userId = await userByDiscord(discordId)
  if (!userId) return null
  const r = await (await db()).prepare("SELECT u.id, u.email, u.status, COALESCE(p.handle, '') AS handle, COALESCE(p.display_name, u.name, '') AS name FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?1").bind(userId).first<{ id: string; email: string; status: string; handle: string; name: string }>()
  if (!r || r.status !== 'active') return null
  return { id: r.id, email: r.email, handle: r.handle, name: r.name }
}
const notLinked = () => say(k.notLinkedCard())
const isTeam = async (m: Me) => (await rolesForEmail(m.email)).includes('admin')

// the commands, as Discord wants them for registration, are in command-defs.ts (so the registration script can read them on its own)
export { COMMANDS } from './command-defs'

// ---------- the answers ----------
/** `/link`: connecting is done on logoless.io with Discord's own approval page (see connect.ts), so there is no code to type. */
async function cmdLink(i: Interaction): Promise<Reply> {
  const m = await me(whoami(i).id)
  return m ? ok('Your Discord is already connected to your logoless account.', 'Connected') : notLinked()
}

async function profileData(userId: string): Promise<k.ProfileData | null> {
  const p = await (await db()).prepare('SELECT p.handle, p.display_name, p.bio, u.created_at FROM profiles p JOIN users u ON u.id = p.user_id WHERE p.user_id = ?1').bind(userId).first<{ handle: string; display_name: string; bio: string; created_at: number }>()
  if (!p) return null
  const { getPre } = await import('../prelaunch')
  return {
    name: p.display_name,
    handle: p.handle,
    bio: p.bio,
    since: new Date(p.created_at * 1000).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
    member: await getPre(userId).then((s) => (s?.n ? { n: s.n, founding: s.founding !== false } : undefined)).catch(() => undefined),
  }
}

async function cmdProfile(i: Interaction): Promise<Reply> {
  const target = opt(i, 'member') as string | undefined
  const userId = await userByDiscord(target ?? whoami(i).id)
  if (!userId) return target ? fail('That person has not linked a logoless account.') : notLinked()
  const p = await profileData(userId)
  return p ? say(k.profileCard(p), false) : fail('No page yet.')
}

// Staff for the bot: a Discord administrator, or someone whose linked logoless account is an admin.
async function isStaff(i: Interaction): Promise<boolean> {
  try {
    if (BigInt(i.member?.permissions ?? '0') & BigInt(8)) return true
  } catch {
    /* no permissions field */
  }
  const m = await me(whoami(i).id)
  return Boolean(m && (await isTeam(m)))
}

async function cmdSync(i: Interaction): Promise<Reply> {
  const m = await me(whoami(i).id)
  if (!m) return notLinked()
  const r = await syncRoles(m.id)
  const text = r.ok ? (r.added.length || r.removed.length ? `Roles updated: ${r.added.length} added, ${r.removed.length} removed.` : (r.note ?? 'Your roles are already right.')) : (r.note ?? 'Could not update your roles.')
  return r.ok ? ok(text, 'Roles') : fail(text)
}

async function cmdRoles(i: Interaction): Promise<Reply> {
  const m = await me(whoami(i).id)
  if (!m) return notLinked()
  const { wanted, kinds } = await wantedRoles(m.id)
  return say(more.rolesCard([...wanted], kinds ? kindWords(kinds) : []))
}

// ---------- the team's commands ----------
async function admin(i: Interaction): Promise<Reply> {
  const m = await me(whoami(i).id)
  if (!m || !(await isTeam(m))) return fail('This is for the logoless team. Connect your admin account on logoless.io first.')
  const d = await db()
  switch (sub(i)) {
    case 'stats': {
      const r = await d
        .prepare("SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM users WHERE last_seen_at > ?1 - 300) AS now, (SELECT COUNT(*) FROM users WHERE created_at > ?1 - 86400) AS new24, (SELECT COUNT(*) FROM settings WHERE key LIKE 'bio:%') AS pages")
        .bind(nowSec())
        .first<Record<string, number>>()
      return say(k.siteNowCard({ users: r?.users ?? 0, newToday: r?.new24 ?? 0, online: r?.now ?? 0, pages: r?.pages ?? 0 }))
    }
    case 'lookup': {
      const who = String(opt(i, 'who') ?? '').trim().replace(/^@/, '').toLowerCase()
      const r = await d.prepare('SELECT u.id FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE lower(u.email) = ?1 OR p.handle = ?1 LIMIT 1').bind(who).first<{ id: string }>()
      if (!r) return fail('Nobody found.')
      const p = await profileData(r.id)
      if (!p) return fail('That person has no page yet.')
      const msg = k.profileCard(p)
      return say({ ...msg, components: [{ type: 1, components: [goBtn('Open page', `/${p.handle}`)] }] })
    }
    case 'announce':
    case 'update': {
      const where = sub(i) === 'announce' ? 'news' : 'updates'
      const posted = await postTo(where, { title: String(opt(i, 'title')), text: String(opt(i, 'text')) })
      return posted ? ok(`Posted in #${where}.`) : fail(`Could not post. Set the ${where} channel, and check the bot can post there.`)
    }
    case 'sync-all': {
      const users = (await d.prepare("SELECT value FROM settings WHERE key LIKE 'discord-user:%' LIMIT 60").all<{ value: string }>()).results
      let n = 0
      for (const u of users) {
        const r = await syncRoles(u.value)
        if (r.ok && (r.added.length || r.removed.length)) n++
      }
      return ok(`Checked ${users.length} linked members. ${n} had roles changed.`, 'Roles')
    }
  }
  return fail('Unknown admin command.')
}

// ---------- buttons ----------
async function component(i: Interaction): Promise<Reply> {
  const id = i.data?.custom_id ?? ''
  // "Open this" buttons: answer with the address, so the button itself is not a link (those always show an arrow)
  if (id.startsWith('go:')) {
    const t = goTarget(id, i.guild_id ?? (await getDiscordConfig()).guildId)
    return t ? { type: 4, data: { content: `[${t.label}](${t.url})`, flags: EPHEMERAL | NO_EMBEDS, allowed_mentions: { parse: [] } } } : fail('That button is out of date.')
  }
  if (id === 'cmd:sync') return cmdSync(i)
  return fail('That button is out of date.')
}

/** One interaction in, one reply out. */
export async function handleInteraction(i: Interaction, _env: Env): Promise<Reply> {
  void _env
  await primeIcons() // the gradient icons in the replies need to be known before they are built (see ui.ts)
  try {
    if (i.type === 4) return { type: 8, data: { choices: [] } }
    if (i.type === 3) return await component(i)
    if (i.type !== 2) return fail('That form is out of date.')
    switch (i.data?.name) {
      case 'help': return say(k.helpCard())
      case 'ping': return ok('Pong. I am awake.', 'Ping')
      case 'link': return await cmdLink(i)
      case 'unlink': {
        const m = await me(whoami(i).id)
        if (!m) return notLinked()
        await unlinkDiscord(m.id)
        return ok('Disconnected. You can connect again any time on logoless.io.', 'Unlinked')
      }
      case 'profile': return await cmdProfile(i)
      case 'sync': return await cmdSync(i)
      case 'roles': return await cmdRoles(i)
      case '8ball': return say(more.eightBallCard(String(opt(i, 'question') ?? '')), false)
      case 'coinflip': return say(more.coinCard(), false)
      case 'roll': return say(more.rollCard(Number(opt(i, 'sides') ?? 6) || 6), false)
      case 'choose': {
        const list = String(opt(i, 'options') ?? '').split(/[,|\n]/).map((x) => x.trim()).filter(Boolean)
        return list.length < 2 ? fail('Give me at least two things, split with commas.') : say(more.chooseCard(list), false)
      }
      case 'hype': return say(more.hypeCard(`<@${(opt(i, 'member') as string | undefined) ?? whoami(i).id}>`), false)
      case 'admin': return await admin(i)
    }
    return fail('I do not know that command. Try `/help`.')
  } catch (e) {
    console.error('discord command failed', e instanceof Error ? e.message : e)
    return fail('Something went wrong on our side. Please try again in a moment.')
  }
}
